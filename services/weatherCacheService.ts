import AsyncStorage from '@react-native-async-storage/async-storage'
import { WeatherData } from '@/types/weather'

// Types
interface CachedWeatherData {
    data: WeatherData
    timestamp: number
    latitude: number
    longitude: number
}

interface CacheValidationResult {
    isValid: boolean
    data?: WeatherData
}

// Constants
const CONFIG = {
    CACHE_KEY: 'weather_data_cache',
    CACHE_DURATION: 60 * 60 * 1000, // 60 minutes in milliseconds
    LOCATION_THRESHOLD: 0.001, // Approximately 100 meters
} as const

// Helper Functions
async function readFromCache(): Promise<CachedWeatherData | null> {
    try {
        const cachedData = await AsyncStorage.getItem(CONFIG.CACHE_KEY)
        return cachedData ? JSON.parse(cachedData) : null
    } catch (error) {
        console.error('Error reading from cache:', error)
        return null
    }
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
    }
}

function validateCache(
    cached: CachedWeatherData | null,
    latitude: number,
    longitude: number
): CacheValidationResult {
    if (!cached) {
        return { isValid: false }
    }

    const isExpired = isCacheExpired(cached.timestamp)
    const locationMatches = isLocationMatch(cached, { latitude, longitude })

    return {
        isValid: !isExpired && locationMatches,
        data:
            !isExpired && locationMatches
                ? reviveWeatherData(cached.data)
                : undefined,
    }
}

// Main Service
export class WeatherCacheService {
    static async getCachedWeather(
        latitude: number,
        longitude: number
    ): Promise<WeatherData | null> {
        try {
            const cached = await readFromCache()
            const { isValid, data } = validateCache(cached, latitude, longitude)
            return isValid ? data! : null
        } catch (error) {
            console.error('Error getting cached weather:', error)
            return null
        }
    }

    static async getLastCachedWeather(): Promise<{
        data: WeatherData
        latitude: number
        longitude: number
    } | null> {
        try {
            const cached = await readFromCache()
            if (!cached || isCacheExpired(cached.timestamp)) {
                return null
            }

            return {
                data: reviveWeatherData(cached.data),
                latitude: cached.latitude,
                longitude: cached.longitude,
            }
        } catch (error) {
            console.error('Error getting last cached weather:', error)
            return null
        }
    }

    static async cacheWeather(
        data: WeatherData,
        latitude: number,
        longitude: number
    ): Promise<void> {
        try {
            const cacheData: CachedWeatherData = {
                data,
                timestamp: Date.now(),
                latitude,
                longitude,
            }
            await AsyncStorage.setItem(
                CONFIG.CACHE_KEY,
                JSON.stringify(cacheData)
            )
        } catch (error) {
            console.error('Error caching weather data:', error)
            throw new Error('Failed to cache weather data')
        }
    }

    static async clearCache(): Promise<void> {
        try {
            await AsyncStorage.removeItem(CONFIG.CACHE_KEY)
        } catch (error) {
            console.error('Error clearing weather cache:', error)
            throw new Error('Failed to clear weather cache')
        }
    }

    static async getCacheStatus(): Promise<{
        hasCache: boolean
        isExpired: boolean | null
        timestamp: number | null
    }> {
        try {
            const cached = await readFromCache()
            if (!cached) {
                return {
                    hasCache: false,
                    isExpired: null,
                    timestamp: null,
                }
            }

            return {
                hasCache: true,
                isExpired: isCacheExpired(cached.timestamp),
                timestamp: cached.timestamp,
            }
        } catch (error) {
            console.error('Error getting cache status:', error)
            throw new Error('Failed to get cache status')
        }
    }
}
