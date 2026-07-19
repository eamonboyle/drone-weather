import {
    DroneFlyabilityService,
    type SafeFlyingWindow,
} from '@/services/droneFlyabilityService'
import {
    DroneFlightConditions,
    HourlyWeatherData,
    WeatherData,
} from '@/types/weather'
import { WeatherThresholds } from '@/types/weatherConfig'
import {
    DayFlyabilitySummary,
    ForecastFilter,
    ForecastPlanningSummary,
} from '@/utils/forecastPlanning'
import { addHours, isBefore, startOfHour } from '@/utils/dateHour'
import {
    checkStatusToCellSafe,
    getCheckStatus,
} from '@/utils/flyabilityChecks'
import { getLocationDayKey, formatLocationTime } from '@/utils/locationTime'
import { getWeatherUtcOffset } from '@/utils/weatherHourUtils'
import {
    formatPercentDisplay,
    formatTemperatureDisplay,
    formatWindDisplay,
} from '@/utils/weatherDisplay'

export interface ForecastHourViewModel {
    key: number
    hour: HourlyWeatherData
    isSuitable: boolean
    timeLabel: string
    tempDisplay: string
    windDisplay: string
    gustDisplay: string
    cloudDisplay: string
    precipDisplay: string
    tempCellSafe: boolean | 'neutral'
    windCellSafe: boolean | 'neutral'
    gustCellSafe: boolean | 'neutral'
    precipCellSafe: boolean | 'neutral'
    tempStatus: ReturnType<typeof getCheckStatus>
    windStatus: ReturnType<typeof getCheckStatus>
    gustStatus: ReturnType<typeof getCheckStatus>
    precipStatus: ReturnType<typeof getCheckStatus>
    conditions: DroneFlightConditions
}

export interface ForecastDayViewModel {
    date: string
    hours: ForecastHourViewModel[]
    safeCount: number
    totalHours: number
}

export interface ForecastViewModel {
    days: ForecastDayViewModel[]
    planningSummary: ForecastPlanningSummary
    utcOffsetSeconds: number
}

function formatWindValue(
    speed: number | null,
    unit: WeatherThresholds['windSpeed']['unit']
): string {
    return formatWindDisplay(speed, unit).replace(/\s*(mph|km\/h)$/, '')
}

function formatTempValue(
    temp: number | null,
    unit: WeatherThresholds['temperature']['unit']
): string {
    return formatTemperatureDisplay(temp, unit).replace(/°[CF]$/, '')
}

function toHourKey(time: Date | string | number): number {
    return time instanceof Date ? time.getTime() : new Date(time).getTime()
}

function toHourDate(time: Date | string): Date {
    return time instanceof Date ? time : new Date(time)
}

/** Next safe window from precomputed suitability — no extra flyability checks. */
export function findNextSafeFlyingWindowFromSuitability(
    hours: { time: Date | string; isSuitable: boolean }[],
    options?: { lookAheadHours?: number; from?: Date }
): SafeFlyingWindow {
    const lookAheadHours = options?.lookAheadHours ?? 48
    const from = options?.from ?? new Date()
    const fromHour = startOfHour(from)

    const relevantHours = hours
        .filter((hour) => !isBefore(toHourDate(hour.time), fromHour))
        .slice(0, lookAheadHours)

    if (relevantHours.length === 0) return { type: 'none' }

    const blocks: {
        start: Date
        end: Date
        durationHours: number
    }[] = []
    let blockStart: Date | null = null
    let blockCount = 0
    let lastSafeTime: Date | null = null

    for (const hour of relevantHours) {
        const hourTime = toHourDate(hour.time)
        if (hour.isSuitable) {
            if (!blockStart) blockStart = hourTime
            blockCount++
            lastSafeTime = hourTime
        } else if (blockStart && lastSafeTime) {
            blocks.push({
                start: blockStart,
                end: addHours(lastSafeTime, 1),
                durationHours: blockCount,
            })
            blockStart = null
            blockCount = 0
            lastSafeTime = null
        }
    }

    if (blockStart && lastSafeTime) {
        blocks.push({
            start: blockStart,
            end: addHours(lastSafeTime, 1),
            durationHours: blockCount,
        })
    }

    if (blocks.length === 0) return { type: 'none' }

    const firstBlock = blocks[0]
    const isNow =
        firstBlock.start.getTime() <= fromHour.getTime() &&
        firstBlock.end.getTime() > from.getTime()

    return {
        type: isNow ? 'now' : 'upcoming',
        startTime: firstBlock.start,
        endTime: firstBlock.end,
        durationHours: firstBlock.durationHours,
    }
}

function findBestDayFromViewModel(
    days: ForecastDayViewModel[]
): DayFlyabilitySummary | null {
    if (days.length === 0) return null
    return days.reduce((best, current) => {
        const summary: DayFlyabilitySummary = {
            date: current.date,
            safeCount: current.safeCount,
            totalHours: current.totalHours,
        }
        if (summary.safeCount > best.safeCount) return summary
        if (
            summary.safeCount === best.safeCount &&
            summary.date < best.date
        ) {
            return summary
        }
        return best
    }, {
        date: days[0].date,
        safeCount: days[0].safeCount,
        totalHours: days[0].totalHours,
    })
}

export function buildForecastViewModel(
    weatherData: WeatherData,
    thresholds: WeatherThresholds,
    now: Date = new Date()
): ForecastViewModel {
    const utcOffsetSeconds = getWeatherUtcOffset(weatherData)
    const fromHour = startOfHour(now)

    const futureHours = weatherData.hourlyData.filter(
        (hour) => !isBefore(new Date(hour.time), fromHour)
    )

    const grouped: Record<string, ForecastHourViewModel[]> = {}

    for (const hour of futureHours) {
        const conditions = DroneFlyabilityService.checkFlyingConditions(
            hour,
            thresholds
        )
        const tempStatus = getCheckStatus(conditions, 'temperature')
        const windStatus = getCheckStatus(conditions, 'windSpeed')
        const gustStatus = getCheckStatus(conditions, 'windGust')
        const precipStatus = getCheckStatus(conditions, 'precipitation')

        const hourVm: ForecastHourViewModel = {
            key: toHourKey(hour.time),
            hour,
            isSuitable: conditions.isSuitable,
            timeLabel: formatLocationTime(hour.time, utcOffsetSeconds),
            tempDisplay: formatTempValue(
                hour.temperature2m,
                thresholds.temperature.unit
            ),
            windDisplay: formatWindValue(
                hour.windSpeed10m,
                thresholds.windSpeed.unit
            ),
            gustDisplay: formatWindValue(
                hour.windGusts10m,
                thresholds.windSpeed.unit
            ),
            cloudDisplay: formatPercentDisplay(hour.cloudCover),
            precipDisplay: formatPercentDisplay(
                hour.precipitationProbability
            ),
            tempCellSafe: checkStatusToCellSafe(tempStatus),
            windCellSafe: checkStatusToCellSafe(windStatus),
            gustCellSafe: checkStatusToCellSafe(gustStatus),
            precipCellSafe: checkStatusToCellSafe(precipStatus),
            tempStatus,
            windStatus,
            gustStatus,
            precipStatus,
            conditions,
        }

        const date = getLocationDayKey(hour.time, utcOffsetSeconds)
        if (!grouped[date]) grouped[date] = []
        grouped[date].push(hourVm)
    }

    const days: ForecastDayViewModel[] = Object.entries(grouped)
        .filter(([, hours]) => hours.length > 0)
        .map(([date, hours]) => ({
            date,
            hours,
            safeCount: hours.filter((h) => h.isSuitable).length,
            totalHours: hours.length,
        }))

    const suitabilityHours = days.flatMap((day) =>
        day.hours.map((h) => ({
            time: h.hour.time,
            isSuitable: h.isSuitable,
        }))
    )

    const planningSummary: ForecastPlanningSummary = {
        nextWindow: findNextSafeFlyingWindowFromSuitability(suitabilityHours, {
            from: now,
        }),
        bestDay: findBestDayFromViewModel(days),
    }

    return {
        days,
        planningSummary,
        utcOffsetSeconds,
    }
}

export function filterForecastDays(
    days: ForecastDayViewModel[],
    filter: ForecastFilter
): ForecastDayViewModel[] {
    if (filter === 'all') return days

    return days
        .map((day) => {
            const hours = day.hours.filter((hour) =>
                filter === 'flyable' ? hour.isSuitable : !hour.isSuitable
            )
            return {
                ...day,
                hours,
                safeCount: hours.filter((h) => h.isSuitable).length,
                totalHours: hours.length,
            }
        })
        .filter((day) => day.hours.length > 0)
}

/** Exported for tests — ensures addHours semantics stay available without date-fns. */
export function hourBlockEnd(lastSafeTime: Date): Date {
    return addHours(lastSafeTime, 1)
}
