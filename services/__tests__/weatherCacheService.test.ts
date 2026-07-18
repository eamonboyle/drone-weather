import AsyncStorage from '@react-native-async-storage/async-storage'
import { WeatherCacheService } from '@/services/weatherCacheService'
import { WeatherData, WEATHER_SOURCE_OPEN_METEO } from '@/types/weather'

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

function makeWeather(lat: number, lng: number, label: string): WeatherData {
    return {
        hourlyData: [
            {
                time: new Date('2026-05-24T12:00:00.000Z'),
                temperature2m: 20,
                relativeHumidity2m: 50,
                dewPoint2m: 10,
                apparentTemperature: 19,
                precipitationProbability: 10,
                precipitation: 0,
                rain: 0,
                showers: 0,
                snowfall: 0,
                snowDepth: 0,
                weatherCode: 0,
                cloudCover: 30,
                cloudCoverLow: 10,
                cloudCoverMid: 10,
                cloudCoverHigh: 10,
                visibility: 10000,
                evapotranspiration: 0,
                et0FaoEvapotranspiration: 0,
                vapourPressureDeficit: 0,
                windSpeed10m: 10,
                windSpeed80m: 12,
                windSpeed120m: 14,
                windSpeed180m: 16,
                windDirection10m: 180,
                windDirection80m: 180,
                windDirection120m: 180,
                windDirection180m: 180,
                windGusts10m: 15,
                temperature80m: 18,
                temperature120m: 16,
                temperature180m: 14,
            },
        ],
        meta: {
            latitude: lat,
            longitude: lng,
            timezone: 'UTC',
            utcOffsetSeconds: 0,
            fetchedAt: Date.now(),
            source: `${WEATHER_SOURCE_OPEN_METEO}:${label}`,
        },
    }
}

describe('WeatherCacheService isolation', () => {
    beforeEach(async () => {
        await AsyncStorage.clear()
    })

    it('stores and retrieves weather per coordinate key', async () => {
        const london = makeWeather(51.507, -0.128, 'london')
        const dublin = makeWeather(53.35, -6.26, 'dublin')

        await WeatherCacheService.cacheWeather(london, 51.507, -0.128)
        await WeatherCacheService.cacheWeather(dublin, 53.35, -6.26)

        const londonCached = await WeatherCacheService.getCachedWeather(
            51.507,
            -0.128
        )
        const dublinCached = await WeatherCacheService.getCachedWeather(
            53.35,
            -6.26
        )

        expect(londonCached?.meta?.source).toContain('london')
        expect(dublinCached?.meta?.source).toContain('dublin')
        expect(londonCached?.meta?.source).not.toBe(dublinCached?.meta?.source)
    })

    it('does not return another location entry for distant coords', async () => {
        await WeatherCacheService.cacheWeather(
            makeWeather(51.507, -0.128, 'london'),
            51.507,
            -0.128
        )

        const miss = await WeatherCacheService.getCachedWeather(40.71, -74.0)
        expect(miss).toBeNull()
    })

    it('migrates legacy single-slot cache into v2 store', async () => {
        const legacyTimestamp = Date.now() - 10 * 60 * 1000
        const legacy = {
            data: makeWeather(48.856, 2.352, 'paris'),
            timestamp: legacyTimestamp,
            latitude: 48.856,
            longitude: 2.352,
        }
        await AsyncStorage.setItem(
            'weather_data_cache',
            JSON.stringify(legacy)
        )

        const migrated = await WeatherCacheService.getCachedWeather(
            48.856,
            2.352
        )
        expect(migrated?.meta?.source).toContain('paris')

        // Subsequent read should come from v2
        const again = await WeatherCacheService.getCachedWeather(48.856, 2.352)
        expect(again?.meta?.source).toContain('paris')

        const status = await WeatherCacheService.getCacheStatus({
            latitude: 48.856,
            longitude: 2.352,
        })
        expect(status.hasCache).toBe(true)
        expect(status.entryCount).toBeGreaterThanOrEqual(1)
        // Migration must preserve original age, not reset TTL via Date.now()
        expect(status.timestamp).toBe(legacyTimestamp)
    })

    it('clearCache removes all location entries', async () => {
        await WeatherCacheService.cacheWeather(
            makeWeather(51.507, -0.128, 'london'),
            51.507,
            -0.128
        )
        await WeatherCacheService.cacheWeather(
            makeWeather(53.35, -6.26, 'dublin'),
            53.35,
            -6.26
        )

        await WeatherCacheService.clearCache()

        expect(
            await WeatherCacheService.getCachedWeather(51.507, -0.128)
        ).toBeNull()
        expect(
            await WeatherCacheService.getCachedWeather(53.35, -6.26)
        ).toBeNull()
    })
})
