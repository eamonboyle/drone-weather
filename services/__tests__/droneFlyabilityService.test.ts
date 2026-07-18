import { DroneFlyabilityService } from '../droneFlyabilityService'
import { HourlyWeatherData } from '@/types/weather'
import { DEFAULT_WEATHER_THRESHOLDS } from '@/types/weatherConfig'
import { getCheckStatus } from '@/utils/flyabilityChecks'

function createHourData(
    overrides: Partial<HourlyWeatherData> = {}
): HourlyWeatherData {
    return {
        time: new Date('2026-05-24T12:00:00Z'),
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
        ...overrides,
    }
}

describe('DroneFlyabilityService', () => {
    it('passes when all conditions are within thresholds', () => {
        const result = DroneFlyabilityService.checkFlyingConditions(
            createHourData(),
            DEFAULT_WEATHER_THRESHOLDS
        )

        expect(result.isSuitable).toBe(true)
        expect(result.reasons).toHaveLength(0)
        expect(result.checks).toHaveLength(5)
        expect(result.checks.every((c) => c.status === 'safe')).toBe(true)
    })

    it('flags wind speed when API mph exceeds km/h threshold', () => {
        const thresholds = {
            ...DEFAULT_WEATHER_THRESHOLDS,
            windSpeed: { unit: 'kmh' as const, max: 20 },
        }

        const result = DroneFlyabilityService.checkFlyingConditions(
            createHourData({ windSpeed10m: 20 }),
            thresholds
        )

        expect(result.isSuitable).toBe(false)
        expect(getCheckStatus(result, 'windSpeed')).toBe('unsafe')
        expect(getCheckStatus(result, 'windGust')).toBe('safe')
    })

    it('flags wind gusts independently of wind speed', () => {
        const thresholds = {
            ...DEFAULT_WEATHER_THRESHOLDS,
            windGust: { max: 20 },
        }

        const result = DroneFlyabilityService.checkFlyingConditions(
            createHourData({ windGusts10m: 20 }),
            thresholds
        )

        expect(result.isSuitable).toBe(false)
        expect(getCheckStatus(result, 'windGust')).toBe('unsafe')
        expect(getCheckStatus(result, 'windSpeed')).toBe('safe')
    })

    it('converts visibility from meters before comparing', () => {
        const thresholds = {
            ...DEFAULT_WEATHER_THRESHOLDS,
            visibility: { unit: 'kilometers' as const, min: 5 },
        }

        const result = DroneFlyabilityService.checkFlyingConditions(
            createHourData({ visibility: 3000 }),
            thresholds
        )

        expect(result.isSuitable).toBe(false)
        expect(getCheckStatus(result, 'visibility')).toBe('unsafe')
    })

    it('treats Fahrenheit thresholds correctly against Celsius API values', () => {
        const thresholds = {
            ...DEFAULT_WEATHER_THRESHOLDS,
            temperature: {
                unit: 'fahrenheit' as const,
                min: 50,
                max: 86,
            },
        }

        const safe = DroneFlyabilityService.checkFlyingConditions(
            createHourData({ temperature2m: 20 }),
            thresholds
        )
        expect(getCheckStatus(safe, 'temperature')).toBe('safe')

        const unsafe = DroneFlyabilityService.checkFlyingConditions(
            createHourData({ temperature2m: 5 }),
            thresholds
        )
        expect(getCheckStatus(unsafe, 'temperature')).toBe('unsafe')
    })

    it('marks missing safety-critical fields unavailable, never safe', () => {
        const result = DroneFlyabilityService.checkFlyingConditions(
            createHourData({
                temperature2m: null,
                windSpeed10m: null,
                visibility: null,
            }),
            DEFAULT_WEATHER_THRESHOLDS
        )

        expect(result.isSuitable).toBe(false)
        expect(getCheckStatus(result, 'temperature')).toBe('unavailable')
        expect(getCheckStatus(result, 'windSpeed')).toBe('unavailable')
        expect(getCheckStatus(result, 'visibility')).toBe('unavailable')
    })

    it('does not flag cloud cover as unsafe regardless of threshold', () => {
        const thresholds = {
            ...DEFAULT_WEATHER_THRESHOLDS,
            weather: {
                maxCloudCover: 10,
                maxPrecipitationProbability: 50,
            },
        }

        const result = DroneFlyabilityService.checkFlyingConditions(
            createHourData({ cloudCover: 100 }),
            thresholds
        )

        expect(result.isSuitable).toBe(true)
        expect(
            result.checks.some((c) => c.factor === ('cloudCover' as never))
        ).toBe(false)
        expect(result.reasons.some((r) => r.includes('Cloud cover'))).toBe(
            false
        )
    })

    it('allows zero precipitation and wind thresholds', () => {
        const thresholds = {
            ...DEFAULT_WEATHER_THRESHOLDS,
            windSpeed: { unit: 'kmh' as const, max: 0 },
            weather: {
                maxCloudCover: 100,
                maxPrecipitationProbability: 0,
            },
        }

        const result = DroneFlyabilityService.checkFlyingConditions(
            createHourData({ windSpeed10m: 1, precipitationProbability: 1 }),
            thresholds
        )

        expect(getCheckStatus(result, 'windSpeed')).toBe('unsafe')
        expect(getCheckStatus(result, 'precipitation')).toBe('unsafe')
    })

    describe('findNextSafeFlyingWindow', () => {
        it('returns now when the current hour is safe', () => {
            const now = new Date('2026-05-24T14:30:00Z')
            const hourlyData = [
                createHourData({ time: new Date('2026-05-24T14:00:00Z') }),
                createHourData({ time: new Date('2026-05-24T15:00:00Z') }),
            ]

            const result = DroneFlyabilityService.findNextSafeFlyingWindow(
                hourlyData,
                DEFAULT_WEATHER_THRESHOLDS,
                { from: now }
            )

            expect(result.type).toBe('now')
            expect(result.durationHours).toBeGreaterThanOrEqual(1)
        })

        it('returns upcoming when the first safe hour is later', () => {
            const now = new Date('2026-05-24T14:30:00Z')
            const hourlyData = [
                createHourData({
                    time: new Date('2026-05-24T14:00:00Z'),
                    windSpeed10m: 30,
                }),
                createHourData({
                    time: new Date('2026-05-24T15:00:00Z'),
                    windSpeed10m: 30,
                }),
                createHourData({ time: new Date('2026-05-24T16:00:00Z') }),
                createHourData({ time: new Date('2026-05-24T17:00:00Z') }),
            ]

            const result = DroneFlyabilityService.findNextSafeFlyingWindow(
                hourlyData,
                DEFAULT_WEATHER_THRESHOLDS,
                { from: now }
            )

            expect(result.type).toBe('upcoming')
            expect(result.startTime?.toISOString()).toBe(
                '2026-05-24T16:00:00.000Z'
            )
            expect(result.durationHours).toBe(2)
        })

        it('returns none when no hours are safe', () => {
            const now = new Date('2026-05-24T14:30:00Z')
            const hourlyData = [
                createHourData({
                    time: new Date('2026-05-24T14:00:00Z'),
                    windSpeed10m: 30,
                }),
                createHourData({
                    time: new Date('2026-05-24T15:00:00Z'),
                    windSpeed10m: 30,
                }),
            ]

            const result = DroneFlyabilityService.findNextSafeFlyingWindow(
                hourlyData,
                DEFAULT_WEATHER_THRESHOLDS,
                { from: now }
            )

            expect(result.type).toBe('none')
        })

        it('handles ISO string times from cached weather data', () => {
            const now = new Date('2026-05-24T14:30:00Z')
            const hourlyData = [
                createHourData({
                    time: '2026-05-24T14:00:00.000Z' as unknown as Date,
                }),
                createHourData({
                    time: '2026-05-24T15:00:00.000Z' as unknown as Date,
                }),
            ]

            const result = DroneFlyabilityService.findNextSafeFlyingWindow(
                hourlyData,
                DEFAULT_WEATHER_THRESHOLDS,
                { from: now }
            )

            expect(result.type).toBe('now')
            expect(result.startTime).toBeInstanceOf(Date)
            expect(result.endTime).toBeInstanceOf(Date)
        })
    })
})
