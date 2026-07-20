import AsyncStorage from '@react-native-async-storage/async-storage'
import { WeatherData, WeatherLocationMeta } from '@/types/weather'

interface CachedWeatherEntry {
    data: WeatherData
    timestamp: number
    latitude: number
    longitude: number
}

interface WeatherCacheStoreV2 {
    version: 2
    entries: Record<string, CachedWeatherEntry>
}

/** Legacy single-slot cache shape */
interface LegacyCachedWeatherData {
    data: WeatherData
    timestamp: number
    latitude: number
    longitude: number
}

const CONFIG = {
    CACHE_KEY_V2: 'weather_data_cache_v2',
    LEGACY_CACHE_KEY: 'weather_data_cache',
    CACHE_DURATION: 60 * 60 * 1000,
    LOCATION_THRESHOLD: 0.001,
} as const

function coordKey(latitude: number, longitude: number): string {
    return `${latitude.toFixed(3)},${longitude.toFixed(3)}`
}

function isLocationMatch(
    cached: { latitude: number; longitude: number },
    current: { latitude: number; longitude: number }
): boolean {
    return (
        Math.abs(cached.latitude - current.latitude) <=
            CONFIG.LOCATION_THRESHOLD &&
        Math.abs(cached.longitude - current.longitude) <=
            CONFIG.LOCATION_THRESHOLD
    )
}

function isCacheExpired(timestamp: number): boolean {
    return Date.now() - timestamp > CONFIG.CACHE_DURATION
}

function reviveWeatherData(data: WeatherData): WeatherData {
    return {
        hourlyData: data.hourlyData.map((hour) => ({
            ...hour,
            time:
                hour.time instanceof Date
                    ? hour.time
                    : new Date(hour.time as string | number),
        })),
        meta: data.meta,
    }
}

async function readStore(): Promise<WeatherCacheStoreV2> {
    try {
        const raw = await AsyncStorage.getItem(CONFIG.CACHE_KEY_V2)
        if (!raw) {
            return { version: 2, entries: {} }
        }
        const parsed = JSON.parse(raw) as WeatherCacheStoreV2
        if (parsed?.version !== 2 || typeof parsed.entries !== 'object') {
            return { version: 2, entries: {} }
        }
        return parsed
    } catch (error) {
        console.error('Error reading weather cache store:', error)
        return { version: 2, entries: {} }
    }
}

async function writeStore(store: WeatherCacheStoreV2): Promise<void> {
    await AsyncStorage.setItem(CONFIG.CACHE_KEY_V2, JSON.stringify(store))
}

async function readLegacyCache(): Promise<LegacyCachedWeatherData | null> {
    try {
        const cachedData = await AsyncStorage.getItem(CONFIG.LEGACY_CACHE_KEY)
        return cachedData ? JSON.parse(cachedData) : null
    } catch {
        return null
    }
}

async function removeLegacyCache(): Promise<void> {
    try {
        await AsyncStorage.removeItem(CONFIG.LEGACY_CACHE_KEY)
    } catch {
        // ignore
    }
}

function findEntryForCoords(
    store: WeatherCacheStoreV2,
    latitude: number,
    longitude: number,
    entries?: CachedWeatherEntry[]
): CachedWeatherEntry | null {
    const exact = store.entries[coordKey(latitude, longitude)]
    if (exact && isLocationMatch(exact, { latitude, longitude })) {
        return exact
    }

    const scan = entries ?? Object.values(store.entries)
    for (const entry of scan) {
        if (isLocationMatch(entry, { latitude, longitude })) {
            return entry
        }
    }
    return null
}

export class WeatherCacheService {
    static async getCachedWeather(
        latitude: number,
        longitude: number
    ): Promise<WeatherData | null> {
        try {
            const store = await readStore()
            const entry = findEntryForCoords(store, latitude, longitude)

            if (entry && !isCacheExpired(entry.timestamp)) {
                return reviveWeatherData(entry.data)
            }

            // Migrate legacy single-slot cache when coordinates match
            const legacy = await readLegacyCache()
            if (
                legacy &&
                !isCacheExpired(legacy.timestamp) &&
                isLocationMatch(legacy, { latitude, longitude })
            ) {
                const revived = reviveWeatherData(legacy.data)
                // Preserve original TTL — do not extend lifetime via Date.now()
                await WeatherCacheService.cacheWeather(
                    revived,
                    latitude,
                    longitude,
                    { timestamp: legacy.timestamp }
                )
                await removeLegacyCache()
                return revived
            }

            return null
        } catch (error) {
            console.error('Error getting cached weather:', error)
            return null
        }
    }

    /**
     * One AsyncStorage read for many coordinates. Map keys use the same
     * rounded coord key as single-location lookups
     * (`${lat.toFixed(3)},${lng.toFixed(3)}`).
     */
    static async getCachedWeatherBatch(
        locations: { latitude: number; longitude: number }[]
    ): Promise<Map<string, WeatherData>> {
        const result = new Map<string, WeatherData>()
        if (locations.length === 0) return result

        try {
            const store = await readStore()
            const entries = Object.values(store.entries)
            for (const { latitude, longitude } of locations) {
                const key = coordKey(latitude, longitude)
                if (result.has(key)) continue

                const entry = findEntryForCoords(
                    store,
                    latitude,
                    longitude,
                    entries
                )
                if (entry && !isCacheExpired(entry.timestamp)) {
                    result.set(key, reviveWeatherData(entry.data))
                }
            }
            return result
        } catch (error) {
            console.error('Error getting cached weather batch:', error)
            return result
        }
    }

    static async cacheWeather(
        data: WeatherData,
        latitude: number,
        longitude: number,
        options?: { timestamp?: number }
    ): Promise<void> {
        try {
            const store = await readStore()
            const key = coordKey(latitude, longitude)
            const meta: WeatherLocationMeta | undefined = data.meta
                ? {
                      ...data.meta,
                      latitude,
                      longitude,
                  }
                : data.meta

            const entry: CachedWeatherEntry = {
                data: {
                    ...data,
                    meta,
                },
                timestamp: options?.timestamp ?? Date.now(),
                latitude,
                longitude,
            }

            store.entries[key] = entry
            await writeStore(store)
            // Only drop legacy when this write covers the same coords (avoid
            // wiping an unmigrated other-location legacy entry)
            const legacy = await readLegacyCache()
            if (
                legacy &&
                isLocationMatch(legacy, { latitude, longitude })
            ) {
                await removeLegacyCache()
            }
        } catch (error) {
            console.error('Error caching weather data:', error)
            throw new Error('Failed to cache weather data')
        }
    }

    static async clearCache(): Promise<void> {
        try {
            await AsyncStorage.multiRemove([
                CONFIG.CACHE_KEY_V2,
                CONFIG.LEGACY_CACHE_KEY,
            ])
        } catch (error) {
            console.error('Error clearing weather cache:', error)
            throw new Error('Failed to clear weather cache')
        }
    }

    static async getCacheStatus(options?: {
        latitude?: number
        longitude?: number
    }): Promise<{
        hasCache: boolean
        isExpired: boolean | null
        timestamp: number | null
        entryCount: number
        latitude: number | null
        longitude: number | null
    }> {
        try {
            const store = await readStore()
            const entryCount = Object.keys(store.entries).length

            let entry: CachedWeatherEntry | null = null
            if (
                typeof options?.latitude === 'number' &&
                typeof options?.longitude === 'number'
            ) {
                entry = findEntryForCoords(
                    store,
                    options.latitude,
                    options.longitude
                )
            } else {
                const sorted = Object.values(store.entries).sort(
                    (a, b) => b.timestamp - a.timestamp
                )
                entry = sorted[0] ?? null
            }

            if (!entry) {
                const legacy = await readLegacyCache()
                if (!legacy) {
                    return {
                        hasCache: false,
                        isExpired: null,
                        timestamp: null,
                        entryCount,
                        latitude: null,
                        longitude: null,
                    }
                }
                return {
                    hasCache: true,
                    isExpired: isCacheExpired(legacy.timestamp),
                    timestamp: legacy.timestamp,
                    entryCount: entryCount || 1,
                    latitude: legacy.latitude,
                    longitude: legacy.longitude,
                }
            }

            return {
                hasCache: true,
                isExpired: isCacheExpired(entry.timestamp),
                timestamp: entry.timestamp,
                entryCount,
                latitude: entry.latitude,
                longitude: entry.longitude,
            }
        } catch (error) {
            console.error('Error getting cache status:', error)
            throw new Error('Failed to get cache status')
        }
    }
}
