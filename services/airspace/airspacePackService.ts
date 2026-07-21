import AsyncStorage from '@react-native-async-storage/async-storage'
import {
    cacheDirectory,
    deleteAsync,
    documentDirectory,
    downloadAsync,
    EncodingType,
    getInfoAsync,
    makeDirectoryAsync,
    moveAsync,
    readAsStringAsync,
    writeAsStringAsync,
} from 'expo-file-system/legacy'
import { MAP_CONFIG } from '@/constants/mapConfig'
import { normalizeOpenAipFeatureCollection } from '@/services/airspace/normalizeAirspace'
import type {
    AirspaceFeatureCollection,
    AirspacePackMeta,
} from '@/types/airspace'

/** Bump directory + index together when normalize filters / cache shape change. */
const PACK_INDEX_KEY = 'airspace:pack-index:v3'
const PACK_SCHEMA_VERSION = 3

export interface OpenAipPackHandle {
    uri: string
    meta: AirspacePackMeta
    /** Present only for freshly normalized in-memory results (tests / small packs). */
    collection?: AirspaceFeatureCollection
}

export interface OpenAipPackFetchOptions {
    force?: boolean
    /** Proceed past the large-pack confirmation gate (100 MB+). */
    allowLargePack?: boolean
}

/** Thrown when a download is large enough to need an explicit user OK. */
export class LargeAirspacePackNeedsConfirmationError extends Error {
    readonly country: string
    readonly sizeBytes: number

    constructor(country: string, sizeBytes: number) {
        const mb = Math.round(sizeBytes / (1024 * 1024))
        super(
            `Airspace pack for ${country.toUpperCase()} is large (${mb} MB) and needs confirmation before loading.`
        )
        this.name = 'LargeAirspacePackNeedsConfirmationError'
        this.country = country.toLowerCase()
        this.sizeBytes = sizeBytes
    }
}

export function isLargePackConfirmationError(
    error: unknown
): error is LargeAirspacePackNeedsConfirmationError {
    return (
        error instanceof LargeAirspacePackNeedsConfirmationError ||
        (error instanceof Error &&
            error.name === 'LargeAirspacePackNeedsConfirmationError')
    )
}

function formatPackSizeMb(sizeBytes: number): number {
    return Math.max(1, Math.round(sizeBytes / (1024 * 1024)))
}

const inFlightByCountry = new Map<string, Promise<OpenAipPackHandle>>()

function packRootDir(): string {
    const root = documentDirectory ?? cacheDirectory
    if (!root) {
        throw new Error('No writable file-system directory available')
    }
    return `${root}airspace-packs-v3/`
}

function packPath(country: string): string {
    return `${packRootDir()}${country.toLowerCase()}.geojson`
}

function tempPath(prefix: string, country: string): string {
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    return `${packRootDir()}${prefix}-${country.toLowerCase()}-${stamp}.geojson`
}

async function ensurePackDir(): Promise<void> {
    const dir = packRootDir()
    const info = await getInfoAsync(dir)
    if (!info.exists) {
        await makeDirectoryAsync(dir, { intermediates: true })
    }
}

async function safeDelete(uri: string | null | undefined): Promise<void> {
    if (!uri) return
    try {
        await deleteAsync(uri, { idempotent: true })
    } catch {
        // best-effort cleanup
    }
}

async function readPackIndex(): Promise<Record<string, AirspacePackMeta>> {
    const raw = await AsyncStorage.getItem(PACK_INDEX_KEY)
    if (!raw) return {}
    try {
        return JSON.parse(raw) as Record<string, AirspacePackMeta>
    } catch {
        return {}
    }
}

async function writePackIndex(
    index: Record<string, AirspacePackMeta>
): Promise<void> {
    await AsyncStorage.setItem(PACK_INDEX_KEY, JSON.stringify(index))
}

function isPackFresh(meta: AirspacePackMeta | undefined): boolean {
    if (!meta?.fetchedAt) return false
    const ageMs = Date.now() - new Date(meta.fetchedAt).getTime()
    return ageMs < MAP_CONFIG.packTtlDays * 24 * 60 * 60 * 1000
}

export function openAipCountryUrl(country: string): string {
    return `${MAP_CONFIG.openAipBucketBase}/${country.toLowerCase()}_asp.geojson`
}

function assertFeatureCollection(
    value: unknown
): asserts value is GeoJSON.FeatureCollection {
    if (
        !value ||
        typeof value !== 'object' ||
        (value as GeoJSON.FeatureCollection).type !== 'FeatureCollection' ||
        !Array.isArray((value as GeoJSON.FeatureCollection).features)
    ) {
        throw new Error('OpenAIP pack is not a valid FeatureCollection')
    }
}

async function loadCachedPackHandle(
    country: string
): Promise<OpenAipPackHandle | null> {
    const code = country.toLowerCase()
    try {
        const path = packPath(code)
        const info = await getInfoAsync(path)
        if (!info.exists) return null

        const index = await readPackIndex()
        const meta = index[code]
        if (!meta || meta.featureCount <= 0) {
            // File exists but meta missing — treat as usable last-good with minimal meta.
            return {
                uri: path,
                meta: {
                    country: code.toUpperCase(),
                    source: 'openaip',
                    fetchedAt: new Date(0).toISOString(),
                    featureCount: 1,
                },
            }
        }

        return { uri: path, meta }
    } catch {
        return null
    }
}

export async function loadCachedCountryPack(
    country: string
): Promise<AirspaceFeatureCollection | null> {
    const handle = await loadCachedPackHandle(country)
    if (!handle) return null
    try {
        const raw = await readAsStringAsync(handle.uri)
        const parsed = JSON.parse(raw) as AirspaceFeatureCollection
        if (parsed?.type !== 'FeatureCollection') return null
        return parsed
    } catch {
        return null
    }
}

async function fetchAndCacheOpenAipCountry(
    country: string,
    options: OpenAipPackFetchOptions = {}
): Promise<OpenAipPackHandle> {
    const code = country.toLowerCase()
    const index = await readPackIndex()
    const existingMeta = index[code]

    if (!options.force && isPackFresh(existingMeta)) {
        const cached = await loadCachedPackHandle(code)
        if (cached) return cached
    }

    const lastGood = await loadCachedPackHandle(code)

    await ensurePackDir()
    const rawTemp = tempPath('raw', code)
    const normalizedTemp = tempPath('norm', code)

    try {
        const download = await downloadAsync(openAipCountryUrl(code), rawTemp)
        if (download.status < 200 || download.status >= 300) {
            if (lastGood) return lastGood
            throw new Error(
                `OpenAIP pack unavailable for ${code.toUpperCase()} (${download.status})`
            )
        }

        const rawInfo = await getInfoAsync(rawTemp)
        const size =
            rawInfo.exists && typeof rawInfo.size === 'number'
                ? rawInfo.size
                : 0
        if (size <= 0) {
            if (lastGood) return lastGood
            throw new Error(
                `OpenAIP pack empty for ${code.toUpperCase()}`
            )
        }
        if (size > MAP_CONFIG.maxRawPackBytes) {
            if (lastGood) return lastGood
            throw new Error(
                `Airspace pack for ${code.toUpperCase()} is too large to load on this device (${formatPackSizeMb(size)} MB). Large-country support requires a prebuilt pack.`
            )
        }
        if (
            size > MAP_CONFIG.confirmRawPackBytes &&
            !options.allowLargePack
        ) {
            throw new LargeAirspacePackNeedsConfirmationError(code, size)
        }

        const rawText = await readAsStringAsync(rawTemp, {
            encoding: EncodingType.UTF8,
        })
        let parsed: unknown
        try {
            parsed = JSON.parse(rawText)
        } catch {
            if (lastGood) return lastGood
            throw new Error(
                `OpenAIP pack for ${code.toUpperCase()} is corrupt`
            )
        }
        assertFeatureCollection(parsed)

        const normalized = normalizeOpenAipFeatureCollection(parsed, {
            country: code,
            simplifyStride: 4,
            droneRelevantOnly: true,
        })

        if (normalized.features.length === 0) {
            if (lastGood) return lastGood
            throw new Error(
                `No drone-relevant airspace found for ${code.toUpperCase()}`
            )
        }
        if (
            normalized.features.length > MAP_CONFIG.maxNormalizedFeatureCount
        ) {
            if (lastGood) return lastGood
            throw new Error(
                `Airspace pack for ${code.toUpperCase()} has too many features to load on this device.`
            )
        }

        // Attribution travels with cached/transformed artifacts.
        const withAttribution: AirspaceFeatureCollection = {
            ...normalized,
            metadata: {
                ...normalized.metadata,
                source: 'openaip',
                country: code.toUpperCase(),
                generatedAt:
                    normalized.metadata?.generatedAt ??
                    new Date().toISOString(),
                featureCount: normalized.features.length,
            },
        }

        await writeAsStringAsync(
            normalizedTemp,
            JSON.stringify(withAttribution),
            { encoding: EncodingType.UTF8 }
        )

        const finalPath = packPath(code)
        const existing = await getInfoAsync(finalPath)
        if (existing.exists) {
            await deleteAsync(finalPath, { idempotent: true })
        }
        await moveAsync({ from: normalizedTemp, to: finalPath })

        const meta: AirspacePackMeta = {
            country: code.toUpperCase(),
            source: 'openaip',
            fetchedAt: new Date().toISOString(),
            effectiveFrom: withAttribution.metadata?.effectiveFrom,
            featureCount: withAttribution.features.length,
            schemaVersion: PACK_SCHEMA_VERSION,
            attribution: MAP_CONFIG.openAipAttribution,
        }

        index[code] = meta
        await writePackIndex(index)

        return {
            uri: finalPath,
            meta,
            collection: withAttribution,
        }
    } finally {
        await safeDelete(rawTemp)
        await safeDelete(normalizedTemp)
    }
}

/**
 * Fetch (or reuse) a country OpenAIP pack as a local file URI.
 * Deduplicates concurrent downloads for the same country.
 * On failure: returns last-good cache when available; otherwise rethrows.
 */
export async function getOpenAipPackForCountry(
    country: string,
    options: OpenAipPackFetchOptions = {}
): Promise<OpenAipPackHandle> {
    const code = country.toLowerCase()
    const existing = inFlightByCountry.get(code)
    if (existing && !options.force && !options.allowLargePack) {
        return existing
    }

    // Register before the first await so concurrent callers join this promise.
    let resolveInFlight!: (value: OpenAipPackHandle) => void
    let rejectInFlight!: (reason?: unknown) => void
    const promise = new Promise<OpenAipPackHandle>((resolve, reject) => {
        resolveInFlight = resolve
        rejectInFlight = reject
    })
    inFlightByCountry.set(code, promise)

    void fetchAndCacheOpenAipCountry(code, options)
        .then(async (handle) => {
            resolveInFlight(handle)
        })
        .catch(async (error) => {
            // Never swallow confirmation — UI must ask the user.
            if (isLargePackConfirmationError(error)) {
                rejectInFlight(error)
                return
            }
            const lastGood = await loadCachedPackHandle(code)
            if (lastGood) {
                resolveInFlight(lastGood)
                return
            }
            rejectInFlight(error)
        })
        .finally(() => {
            if (inFlightByCountry.get(code) === promise) {
                inFlightByCountry.delete(code)
            }
        })

    return promise
}

export async function getPackMeta(
    country: string
): Promise<AirspacePackMeta | undefined> {
    const index = await readPackIndex()
    return index[country.toLowerCase()]
}

/** Test helper — clears in-flight download map. */
export function clearInFlightPackDownloadsForTests(): void {
    inFlightByCountry.clear()
}
