import {
    buildForecastPlanningSummary,
    filterHoursByFlyability,
    findBestDay,
} from '../forecastPlanning'
import { HourlyWeatherData } from '@/types/weather'
import { DEFAULT_WEATHER_THRESHOLDS } from '@/types/weatherConfig'

function createHour(
    time: string,
    overrides: Partial<HourlyWeatherData> = {}
): HourlyWeatherData {
    return {
        time: new Date(time),
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
    const dayOneHours = [
        createHour('2026-05-24T14:00:00'),
        createHour('2026-05-24T15:00:00', { windSpeed10m: 30 }),
    ]
    const dayTwoHours = [
        createHour('2026-05-25T10:00:00'),
        createHour('2026-05-25T11:00:00'),
        createHour('2026-05-25T12:00:00'),
    ]
    const days: [string, HourlyWeatherData[]][] = [
        ['2026-05-24', dayOneHours],
        ['2026-05-25', dayTwoHours],
    ]

    it('filters flyable hours only', () => {
        const filtered = filterHoursByFlyability(
            dayOneHours,
            DEFAULT_WEATHER_THRESHOLDS,
            'flyable'
        )

        expect(filtered).toHaveLength(1)
        expect(filtered[0].time.getHours()).toBe(14)
    })

    it('finds the day with the most flyable hours', () => {
        const bestDay = findBestDay(days, DEFAULT_WEATHER_THRESHOLDS)

        expect(bestDay?.date).toBe('2026-05-25')
        expect(bestDay?.safeCount).toBe(3)
    })

    it('builds a planning summary with next window and best day', () => {
        const summary = buildForecastPlanningSummary(
            [...dayOneHours, ...dayTwoHours],
            days,
            DEFAULT_WEATHER_THRESHOLDS
        )

        expect(summary.bestDay?.date).toBe('2026-05-25')
        expect(['now', 'upcoming', 'none']).toContain(summary.nextWindow.type)
    })
})
