import {
    filterHoursByFlyability,
    buildForecastPlanningSummary,
} from '@/utils/forecastPlanning'
import { HourlyWeatherData } from '@/types/weather'
import { DEFAULT_WEATHER_THRESHOLDS } from '@/types/weatherConfig'

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

describe('forecastPlanning', () => {
    it('filters flyable hours without using cloud cover', () => {
        const hours = [
            createHourData({
                time: new Date('2026-05-24T14:00:00Z'),
                cloudCover: 100,
            }),
            createHourData({
                time: new Date('2026-05-24T15:00:00Z'),
                windSpeed10m: 40,
            }),
        ]

        const filtered = filterHoursByFlyability(
            hours,
            DEFAULT_WEATHER_THRESHOLDS,
            'flyable'
        )

        expect(filtered).toHaveLength(1)
        expect(filtered[0].time.toISOString()).toBe('2026-05-24T14:00:00.000Z')
    })

    it('builds a planning summary with a best day', () => {
        const dayA = new Date(Date.now() + 2 * 60 * 60 * 1000)
        const dayABad = new Date(Date.now() + 3 * 60 * 60 * 1000)
        const dayB = new Date(Date.now() + 26 * 60 * 60 * 1000)
        const dayB2 = new Date(Date.now() + 27 * 60 * 60 * 1000)

        const hourly = [
            createHourData({ time: dayA }),
            createHourData({
                time: dayABad,
                windSpeed10m: 40,
            }),
            createHourData({ time: dayB }),
            createHourData({ time: dayB2 }),
        ]
        const dateA = dayA.toISOString().slice(0, 10)
        const dateB = dayB.toISOString().slice(0, 10)
        const days: [string, HourlyWeatherData[]][] = [
            [dateA, hourly.slice(0, 2)],
            [dateB, hourly.slice(2)],
        ]

        const summary = buildForecastPlanningSummary(
            hourly,
            days,
            DEFAULT_WEATHER_THRESHOLDS
        )

        expect(summary.bestDay?.date).toBe(dateB)
        expect(summary.nextWindow.type).not.toBe('none')
    })
})
