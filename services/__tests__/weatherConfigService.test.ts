import { WeatherConfigService } from '@/services/weatherConfigService'
import {
    DEFAULT_WEATHER_THRESHOLDS,
    WeatherThresholds,
} from '@/types/weatherConfig'

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

function cloneDefaults(): WeatherThresholds {
    return JSON.parse(JSON.stringify(DEFAULT_WEATHER_THRESHOLDS))
}

describe('WeatherConfigService.validateThresholds', () => {
    it('accepts default thresholds', async () => {
        const result = await WeatherConfigService.validateThresholds(
            cloneDefaults()
        )
        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
    })

    it('rejects min temperature greater than or equal to max', async () => {
        const thresholds = cloneDefaults()
        thresholds.temperature.min = 20
        thresholds.temperature.max = 20

        const equal = await WeatherConfigService.validateThresholds(thresholds)
        expect(equal.isValid).toBe(false)
        expect(equal.errors.some((e) => e.toLowerCase().includes('temperature'))).toBe(
            true
        )

        thresholds.temperature.min = 25
        thresholds.temperature.max = 10
        const inverted = await WeatherConfigService.validateThresholds(
            thresholds
        )
        expect(inverted.isValid).toBe(false)
    })

    it('rejects negative wind and visibility bounds', async () => {
        const thresholds = cloneDefaults()
        thresholds.windSpeed.max = -1
        thresholds.windGust.max = -2
        thresholds.visibility.min = -5

        const result = await WeatherConfigService.validateThresholds(thresholds)
        expect(result.isValid).toBe(false)
        expect(result.errors.length).toBeGreaterThanOrEqual(3)
    })

    it('rejects precipitation probability outside 0–100', async () => {
        const thresholds = cloneDefaults()
        thresholds.weather.maxPrecipitationProbability = 150

        const result = await WeatherConfigService.validateThresholds(thresholds)
        expect(result.isValid).toBe(false)
        expect(
            result.errors.some((e) =>
                e.toLowerCase().includes('precipitation')
            )
        ).toBe(true)
    })
})
