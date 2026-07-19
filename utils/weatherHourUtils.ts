import { HourlyWeatherData, WeatherData } from '@/types/weather'
import {
    getCurrentLocationClockHour,
    getLocationHours,
    isSameLocationDay,
    resolveUtcOffsetSeconds,
} from '@/utils/locationTime'

export function getWeatherUtcOffset(weatherData?: WeatherData | null): number {
    return resolveUtcOffsetSeconds(weatherData?.meta?.utcOffsetSeconds)
}

export function findHourlyDataForClockHour(
    hourlyData: HourlyWeatherData[],
    clockHour: number,
    options: {
        now?: Date
        utcOffsetSeconds?: number
    } = {}
): HourlyWeatherData | undefined {
    const now = options.now ?? new Date()
    const utcOffsetSeconds = resolveUtcOffsetSeconds(options.utcOffsetSeconds, now)

    const match = hourlyData.find(
        (data) =>
            isSameLocationDay(data.time, now, utcOffsetSeconds) &&
            getLocationHours(data.time, utcOffsetSeconds) === clockHour
    )

    if (match) return match

    const todayData = hourlyData.filter((data) =>
        isSameLocationDay(data.time, now, utcOffsetSeconds)
    )

    const futureHour = todayData.find(
        (data) => getLocationHours(data.time, utcOffsetSeconds) >= clockHour
    )
    if (futureHour) return futureHour

    return todayData[0] ?? hourlyData[0]
}

export function getHourlyIndexForClockHour(
    hourlyData: HourlyWeatherData[],
    clockHour: number,
    options: {
        now?: Date
        utcOffsetSeconds?: number
    } = {}
): number {
    const hourData = findHourlyDataForClockHour(hourlyData, clockHour, options)
    if (!hourData) return -1

    const target = hourData.time instanceof Date
        ? hourData.time.getTime()
        : new Date(hourData.time).getTime()

    return hourlyData.findIndex((data) => {
        const t = data.time instanceof Date ? data.time.getTime() : new Date(data.time).getTime()
        return t === target
    })
}

export function getTodayHourlyData(
    hourlyData: HourlyWeatherData[],
    options: {
        now?: Date
        utcOffsetSeconds?: number
    } = {}
): HourlyWeatherData[] {
    const now = options.now ?? new Date()
    const utcOffsetSeconds = resolveUtcOffsetSeconds(options.utcOffsetSeconds, now)
    return hourlyData.filter((data) =>
        isSameLocationDay(data.time, now, utcOffsetSeconds)
    )
}

export function getNowClockHour(
    weatherData?: WeatherData | null,
    now: Date = new Date()
): number {
    const offset = getWeatherUtcOffset(weatherData)
    return getCurrentLocationClockHour(offset, now)
}
