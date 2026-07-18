import {
    convertDistance,
    convertSpeed,
    convertTemperature,
    convertThresholdsOnUnitChange,
} from '@/utils/unitConversion'
import { DEFAULT_WEATHER_THRESHOLDS } from '@/types/weatherConfig'

describe('unitConversion', () => {
    it('converts temperature both ways', () => {
        expect(convertTemperature(0, 'celsius', 'fahrenheit')).toBe(32)
        expect(convertTemperature(32, 'fahrenheit', 'celsius')).toBe(0)
        expect(convertTemperature(20, 'celsius', 'celsius')).toBe(20)
    })

    it('converts speed both ways', () => {
        expect(convertSpeed(10, 'kmh', 'mph')).toBeCloseTo(6.21371, 4)
        expect(convertSpeed(10, 'mph', 'kmh')).toBeCloseTo(16.0934, 3)
    })

    it('converts distance both ways', () => {
        expect(convertDistance(5, 'kilometers', 'miles')).toBeCloseTo(3.106855, 4)
        expect(convertDistance(5, 'miles', 'kilometers')).toBeCloseTo(8.0467, 3)
    })

    it('atomically converts temperature thresholds on unit switch', () => {
        const next = convertThresholdsOnUnitChange(
            DEFAULT_WEATHER_THRESHOLDS,
            'temperature',
            'fahrenheit'
        )
        expect(next.temperature.unit).toBe('fahrenheit')
        expect(next.temperature.min).toBe(32)
        expect(next.temperature.max).toBe(104)
    })

    it('atomically converts wind and gust thresholds together', () => {
        const base = {
            ...DEFAULT_WEATHER_THRESHOLDS,
            windSpeed: { unit: 'kmh' as const, max: 32 },
            windGust: { max: 48 },
        }
        const next = convertThresholdsOnUnitChange(base, 'windSpeed', 'mph')
        expect(next.windSpeed.unit).toBe('mph')
        expect(next.windSpeed.max).toBe(Math.round(convertSpeed(32, 'kmh', 'mph')))
        expect(next.windGust.max).toBe(Math.round(convertSpeed(48, 'kmh', 'mph')))
    })

    it('atomically converts visibility thresholds', () => {
        const next = convertThresholdsOnUnitChange(
            DEFAULT_WEATHER_THRESHOLDS,
            'visibility',
            'miles'
        )
        expect(next.visibility.unit).toBe('miles')
        expect(next.visibility.min).toBeCloseTo(3.1, 1)
    })
})
