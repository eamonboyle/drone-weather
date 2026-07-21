import AsyncStorage from '@react-native-async-storage/async-storage'
import {
    cacheDirectory,
    documentDirectory,
    EncodingType,
    getInfoAsync,
    makeDirectoryAsync,
    readAsStringAsync,
    writeAsStringAsync,
} from 'expo-file-system/legacy'
import { MAP_CONFIG } from '@/constants/mapConfig'
import { normalizeOpenAipFeatureCollection } from '@/services/airspace/normalizeAirspace'
import type {
    AirspaceFeatureCollection,
    AirspacePackMeta,
} from '@/types/airspace'

/** Bump when normalize filters change so stale country packs are refetched. */
const PACK_INDEX_KEY = 'airspace:pack-index:v2'
const EMPTY_COLLECTION: AirspaceFeatureCollection = {
    type: 'FeatureCollection',
    features: [],
}

function packRootDir(): string {
    const root = documentDirectory ?? cacheDirectory
    if (!root) {
        throw new Error('No writable file-system directory available')
    }
    return `${root}airspace-packs-v2/`
}

function packPath(country: string): string {
    return `${packRootDir()}${country.toLowerCase()}.geojson`
}

async function ensurePackDir(): Promise<void> {
    const dir = packRootDir()
    const info = await getInfoAsync(dir)
    if (!info.exists) {
        await makeDirectoryAsync(dir, { intermediates: true })
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

export async function loadCachedCountryPack(
    country: string
): Promise<AirspaceFeatureCollection | null> {
    const code = country.toLowerCase()
    try {
        const path = packPath(code)
        const info = await getInfoAsync(path)
        if (!info.exists) return null
        const raw = await readAsStringAsync(path)
        return JSON.parse(raw) as AirspaceFeatureCollection
    } catch {
        return null
    }
}

export async function fetchAndCacheOpenAipCountry(
    country: string,
    options: { force?: boolean } = {}
): Promise<AirspaceFeatureCollection> {
    const code = country.toLowerCase()
    const index = await readPackIndex()
    const existingMeta = index[code]

    if (!options.force && isPackFresh(existingMeta)) {
        const cached = await loadCachedCountryPack(code)
        if (cached) return cached
    }

    const response = await fetch(openAipCountryUrl(code))
    if (!response.ok) {
        const cached = await loadCachedCountryPack(code)
        if (cached) return cached
        throw new Error(
            `OpenAIP pack unavailable for ${code.toUpperCase()} (${response.status})`
        )
    }

    const raw = (await response.json()) as GeoJSON.FeatureCollection
    const normalized = normalizeOpenAipFeatureCollection(raw, {
        country: code,
        simplifyStride: 4,
        droneRelevantOnly: true,
    })

    await ensurePackDir()
    await writeAsStringAsync(packPath(code), JSON.stringify(normalized), {
        encoding: EncodingType.UTF8,
    })

    index[code] = {
        country: code.toUpperCase(),
        source: 'openaip',
        fetchedAt: new Date().toISOString(),
        featureCount: normalized.features.length,
    }
    await writePackIndex(index)
    return normalized
}

export async function getOpenAipPackForCountry(
    country: string,
    options: { force?: boolean } = {}
): Promise<AirspaceFeatureCollection> {
    try {
        return await fetchAndCacheOpenAipCountry(country, options)
    } catch {
        return EMPTY_COLLECTION
    }
}

export async function getPackMeta(
    country: string
): Promise<AirspacePackMeta | undefined> {
    const index = await readPackIndex()
    return index[country.toLowerCase()]
}
