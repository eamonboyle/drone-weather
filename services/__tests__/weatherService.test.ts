import { WeatherService } from '../weatherService'
import { WeatherCacheService } from '../weatherCacheService'
import { WeatherApiClient } from '../weatherApiClient'
import { WeatherData } from '@/types/weather'

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)
jest.mock('../weatherCacheService')
jest.mock('../weatherApiClient')

const mockedCache = WeatherCacheService as jest.Mocked<typeof WeatherCacheService>
const mockedApi = WeatherApiClient as jest.Mocked<typeof WeatherApiClient>

function sampleWeather(fetchedAt: number): WeatherData {
    return {
        hourlyData: [],
        meta: {
            latitude: 54.6,
            longitude: -5.9,
            timezone: 'Europe/London',
            utcOffsetSeconds: 3600,
            fetchedAt,
            source: 'Open-Meteo',
        },
    }
}

describe('WeatherService.getCurrentWeather', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('returns cache when bypassCache is false', async () => {
        const cached = sampleWeather(1_000)
        mockedCache.getCachedWeather.mockResolvedValue(cached)

        const result = await WeatherService.getCurrentWeather(54.6, -5.9)

        expect(result).toBe(cached)
        expect(mockedApi.fetchWeatherData).not.toHaveBeenCalled()
    })

    it('skips cache when bypassCache is true', async () => {
        const fresh = sampleWeather(2_000)
        mockedCache.getCachedWeather.mockResolvedValue(sampleWeather(1_000))
        mockedApi.fetchWeatherData.mockResolvedValue(fresh)
        mockedCache.cacheWeather.mockResolvedValue(undefined)

        const result = await WeatherService.getCurrentWeather(54.6, -5.9, {
            bypassCache: true,
        })

        expect(result).toBe(fresh)
        expect(mockedCache.getCachedWeather).not.toHaveBeenCalled()
        expect(mockedApi.fetchWeatherData).toHaveBeenCalledWith(54.6, -5.9)
        expect(mockedCache.cacheWeather).toHaveBeenCalledWith(fresh, 54.6, -5.9)
    })
})
