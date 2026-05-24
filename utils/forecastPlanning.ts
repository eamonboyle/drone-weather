import { format, isToday, isTomorrow } from 'date-fns'
import { DroneFlyabilityService } from '@/services/droneFlyabilityService'
import { HourlyWeatherData } from '@/types/weather'
import { WeatherThresholds } from '@/types/weatherConfig'

export type ForecastFilter = 'all' | 'flyable' | 'blocked'

export interface DayFlyabilitySummary {
    date: string
    safeCount: number
    totalHours: number
}

export interface ForecastPlanningSummary {
    nextWindow: ReturnType<typeof DroneFlyabilityService.findNextSafeFlyingWindow>
    bestDay: DayFlyabilitySummary | null
}

export function isHourFlyable(
    hour: HourlyWeatherData,
    thresholds: WeatherThresholds
): boolean {
    return DroneFlyabilityService.checkFlyingConditions(hour, thresholds)
        .isSuitable
}

export function filterHoursByFlyability(
    hours: HourlyWeatherData[],
    thresholds: WeatherThresholds,
    filter: ForecastFilter
): HourlyWeatherData[] {
    if (filter === 'all') return hours

    return hours.filter((hour) => {
        const flyable = isHourFlyable(hour, thresholds)
        return filter === 'flyable' ? flyable : !flyable
    })
}

export function summarizeDaysByFlyability(
    days: [string, HourlyWeatherData[]][],
    thresholds: WeatherThresholds
): DayFlyabilitySummary[] {
    return days.map(([date, hours]) => ({
        date,
        safeCount: hours.filter((hour) => isHourFlyable(hour, thresholds))
            .length,
        totalHours: hours.length,
    }))
}

export function findBestDay(
    days: [string, HourlyWeatherData[]][],
    thresholds: WeatherThresholds
): DayFlyabilitySummary | null {
    const summaries = summarizeDaysByFlyability(days, thresholds)
    if (summaries.length === 0) return null

    return summaries.reduce((best, current) => {
        if (current.safeCount > best.safeCount) return current
        if (
            current.safeCount === best.safeCount &&
            current.date < best.date
        ) {
            return current
        }
        return best
    })
}

export function buildForecastPlanningSummary(
    hourlyData: HourlyWeatherData[],
    days: [string, HourlyWeatherData[]][],
    thresholds: WeatherThresholds
): ForecastPlanningSummary {
    return {
        nextWindow: DroneFlyabilityService.findNextSafeFlyingWindow(
            hourlyData,
            thresholds
        ),
        bestDay: findBestDay(days, thresholds),
    }
}

export function formatDayLabel(dateStr: string): string {
    const date = new Date(dateStr)
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    return format(date, 'EEE, MMM d')
}

export function formatWindowTimeRange(start: Date, end: Date): string {
    return `${format(start, 'h a')} – ${format(end, 'h a')}`
}
