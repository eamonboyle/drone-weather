import { DroneFlyabilityService } from '@/services/droneFlyabilityService'
import { HourlyWeatherData, WeatherData, WEATHER_SOURCE_OPEN_METEO } from '@/types/weather'
import { DEFAULT_WEATHER_THRESHOLDS } from '@/types/weatherConfig'
import {
    buildForecastViewModel,
    filterForecastDays,
} from '@/utils/forecastViewModel'

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

function makeWeather(hours: HourlyWeatherData[]): WeatherData {
    return {
        hourlyData: hours,
        meta: {
            latitude: 53.35,
            longitude: -6.26,
            timezone: 'UTC',
            utcOffsetSeconds: 0,
            fetchedAt: Date.now(),
            source: WEATHER_SOURCE_OPEN_METEO,
        },
    }
}

describe('forecastViewModel', () => {
    const now = new Date('2026-05-24T10:30:00.000Z')

    it('uses stable timestamp keys per hour', () => {
        const weather = makeWeather([
            createHour('2026-05-24T12:00:00.000Z'),
            createHour('2026-05-24T13:00:00.000Z'),
        ])
        const vm = buildForecastViewModel(
            weather,
            DEFAULT_WEATHER_THRESHOLDS,
            now
        )
        const keys = vm.days.flatMap((d) => d.hours.map((h) => h.key))
        expect(keys).toEqual([
            new Date('2026-05-24T12:00:00.000Z').getTime(),
            new Date('2026-05-24T13:00:00.000Z').getTime(),
        ])
    })

    it('evaluates flyability once per hour while building the view model', () => {
        const spy = jest.spyOn(
            DroneFlyabilityService,
            'checkFlyingConditions'
        )
        const weather = makeWeather([
            createHour('2026-05-24T12:00:00.000Z'),
            createHour('2026-05-24T13:00:00.000Z', { windSpeed10m: 40 }),
            createHour('2026-05-24T14:00:00.000Z', { cloudCover: 100 }),
        ])

        buildForecastViewModel(weather, DEFAULT_WEATHER_THRESHOLDS, now)

        // Exactly one evaluation per future hour (planning reuses suitability flags)
        expect(spy).toHaveBeenCalledTimes(3)

        spy.mockClear()
        const vm = buildForecastViewModel(
            weather,
            DEFAULT_WEATHER_THRESHOLDS,
            now
        )
        expect(spy).toHaveBeenCalledTimes(3)
        const perHourInVm = vm.days.reduce((n, d) => n + d.hours.length, 0)
        expect(vm.planningSummary.bestDay?.safeCount).toBe(2)

        spy.mockClear()
        filterForecastDays(vm.days, 'flyable')
        filterForecastDays(vm.days, 'blocked')
        filterForecastDays(vm.days, 'all')
        expect(spy).not.toHaveBeenCalled()
        expect(perHourInVm).toBe(3)

        spy.mockRestore()
    })

    it('filters flyable/blocked without treating cloud cover as blocking', () => {
        const weather = makeWeather([
            createHour('2026-05-24T12:00:00.000Z', { cloudCover: 100 }),
            createHour('2026-05-24T13:00:00.000Z', { windSpeed10m: 40 }),
        ])
        const vm = buildForecastViewModel(
            weather,
            DEFAULT_WEATHER_THRESHOLDS,
            now
        )
        const flyable = filterForecastDays(vm.days, 'flyable')
        const blocked = filterForecastDays(vm.days, 'blocked')

        expect(flyable.flatMap((d) => d.hours)).toHaveLength(1)
        expect(flyable[0].hours[0].hour.cloudCover).toBe(100)
        expect(blocked.flatMap((d) => d.hours)).toHaveLength(1)
        expect(blocked[0].hours[0].hour.windSpeed10m).toBe(40)
    })

    it('marks cloud cells as neutral informational styling', () => {
        const weather = makeWeather([
            createHour('2026-05-24T12:00:00.000Z', { cloudCover: 90 }),
        ])
        const vm = buildForecastViewModel(
            weather,
            DEFAULT_WEATHER_THRESHOLDS,
            now
        )
        expect(vm.days[0].hours[0].cloudDisplay).toBeTruthy()
        // Cloud is never a flyability factor in the view model path
        expect(vm.days[0].hours[0].isSuitable).toBe(true)
    })
})
