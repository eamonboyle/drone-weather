/**
 * Location-timezone helpers.
 * Weather hours are stored as real UTC instants; wall-clock labels use
 * the provider utcOffsetSeconds from WeatherLocationMeta.
 */

export interface LocationDateParts {
    year: number
    month: number
    day: number
    hours: number
    minutes: number
    seconds: number
    weekday: number
}

const WEEKDAYS = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
] as const

const WEEKDAYS_SHORT = [
    'Sun',
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
] as const

const MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
] as const

const MONTHS_SHORT = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
] as const

function toDate(time: Date | string | number): Date {
    return time instanceof Date ? time : new Date(time)
}

/**
 * Shift a UTC instant by the location offset, then read UTC components
 * (those components equal the location wall clock).
 */
export function getLocationDateParts(
    time: Date | string | number,
    utcOffsetSeconds: number
): LocationDateParts {
    const date = toDate(time)
    const shifted = new Date(date.getTime() + utcOffsetSeconds * 1000)
    return {
        year: shifted.getUTCFullYear(),
        month: shifted.getUTCMonth(),
        day: shifted.getUTCDate(),
        hours: shifted.getUTCHours(),
        minutes: shifted.getUTCMinutes(),
        seconds: shifted.getUTCSeconds(),
        weekday: shifted.getUTCDay(),
    }
}

export function getLocationHours(
    time: Date | string | number,
    utcOffsetSeconds: number
): number {
    return getLocationDateParts(time, utcOffsetSeconds).hours
}

export function isSameLocationDay(
    timeA: Date | string | number,
    timeB: Date | string | number,
    utcOffsetSeconds: number
): boolean {
    const a = getLocationDateParts(timeA, utcOffsetSeconds)
    const b = getLocationDateParts(timeB, utcOffsetSeconds)
    return a.year === b.year && a.month === b.month && a.day === b.day
}

export function getLocationDayKey(
    time: Date | string | number,
    utcOffsetSeconds: number
): string {
    const parts = getLocationDateParts(time, utcOffsetSeconds)
    const month = String(parts.month + 1).padStart(2, '0')
    const day = String(parts.day).padStart(2, '0')
    return `${parts.year}-${month}-${day}`
}

export function getCurrentLocationClockHour(
    utcOffsetSeconds: number,
    now: Date = new Date()
): number {
    return getLocationHours(now, utcOffsetSeconds)
}

/** Milliseconds until the next location-local hour boundary (+ small settle buffer). */
export function msUntilNextLocationHour(
    utcOffsetSeconds: number,
    now: Date = new Date()
): number {
    const shiftedMs = now.getTime() + utcOffsetSeconds * 1000
    const shifted = new Date(shiftedMs)
    const msIntoHour =
        (shifted.getUTCMinutes() * 60 + shifted.getUTCSeconds()) * 1000 +
        shifted.getUTCMilliseconds()
    const remaining = 3_600_000 - msIntoHour
    return Math.max(remaining, 1) + 50
}

export function parseLocationDayKey(dayKey: string): {
    year: number
    month: number
    day: number
} {
    const [year, month, day] = dayKey.split('-').map(Number)
    return { year, month: month - 1, day }
}

/** Weekday for a yyyy-MM-dd calendar key (timezone-independent). */
export function getDayKeyWeekday(dayKey: string): number {
    const { year, month, day } = parseLocationDayKey(dayKey)
    return new Date(Date.UTC(year, month, day)).getUTCDay()
}

export function addDaysToDayKey(dayKey: string, days: number): string {
    const { year, month, day } = parseLocationDayKey(dayKey)
    const next = new Date(Date.UTC(year, month, day + days))
    const m = String(next.getUTCMonth() + 1).padStart(2, '0')
    const d = String(next.getUTCDate()).padStart(2, '0')
    return `${next.getUTCFullYear()}-${m}-${d}`
}

export function isLocationTodayDayKey(
    dayKey: string,
    utcOffsetSeconds: number,
    now: Date = new Date()
): boolean {
    return dayKey === getLocationDayKey(now, utcOffsetSeconds)
}

export function isLocationTomorrowDayKey(
    dayKey: string,
    utcOffsetSeconds: number,
    now: Date = new Date()
): boolean {
    const today = getLocationDayKey(now, utcOffsetSeconds)
    return dayKey === addDaysToDayKey(today, 1)
}

export function formatLocationTime(
    time: Date | string | number,
    utcOffsetSeconds: number,
    options: { hour12?: boolean } = {}
): string {
    const parts = getLocationDateParts(time, utcOffsetSeconds)
    const hour12 = options.hour12 ?? false
    if (!hour12) {
        return `${String(parts.hours).padStart(2, '0')}:${String(parts.minutes).padStart(2, '0')}`
    }
    const period = parts.hours >= 12 ? 'PM' : 'AM'
    const hour = parts.hours % 12 || 12
    return `${hour}:${String(parts.minutes).padStart(2, '0')} ${period}`
}

export function formatLocationHourLabel(
    time: Date | string | number,
    utcOffsetSeconds: number
): string {
    return `${getLocationHours(time, utcOffsetSeconds)}H`
}

export function formatLocationHourAmPm(
    time: Date | string | number,
    utcOffsetSeconds: number
): string {
    const parts = getLocationDateParts(time, utcOffsetSeconds)
    const period = parts.hours >= 12 ? 'PM' : 'AM'
    const hour = parts.hours % 12 || 12
    return `${hour} ${period}`
}

export function formatLocationTimeRange(
    start: Date | string | number,
    end: Date | string | number,
    utcOffsetSeconds: number
): string {
    return `${formatLocationHourAmPm(start, utcOffsetSeconds)} – ${formatLocationHourAmPm(end, utcOffsetSeconds)}`
}

export function formatLocationWeekday(
    time: Date | string | number,
    utcOffsetSeconds: number
): string {
    return WEEKDAYS[getLocationDateParts(time, utcOffsetSeconds).weekday]
}

export function formatLocationMonthDay(
    time: Date | string | number,
    utcOffsetSeconds: number
): string {
    const parts = getLocationDateParts(time, utcOffsetSeconds)
    return `${MONTHS_SHORT[parts.month]} ${parts.day}`
}

export function formatLocationFullDate(
    time: Date | string | number,
    utcOffsetSeconds: number
): string {
    const parts = getLocationDateParts(time, utcOffsetSeconds)
    return `${WEEKDAYS[parts.weekday]}, ${MONTHS[parts.month]} ${parts.day}`
}

/** Format a yyyy-MM-dd day key without device-timezone parsing. */
export function formatDayKey(
    dayKey: string,
    style: 'weekday' | 'monthDay' | 'weekdayMonthDay' | 'full' = 'weekdayMonthDay'
): string {
    const { year, month, day } = parseLocationDayKey(dayKey)
    const weekday = getDayKeyWeekday(dayKey)
    switch (style) {
        case 'weekday':
            return WEEKDAYS[weekday]
        case 'monthDay':
            return `${MONTHS_SHORT[month]} ${day}`
        case 'weekdayMonthDay':
            return `${WEEKDAYS_SHORT[weekday]}, ${MONTHS_SHORT[month]} ${day}`
        case 'full':
            return `${WEEKDAYS[weekday]}, ${MONTHS[month]} ${day}`
        default: {
            const _exhaustive: never = style
            return _exhaustive
        }
    }
}

/**
 * Today / Tomorrow / short date for a day key or UTC instant,
 * relative to the location calendar.
 */
export function formatLocationDayLabel(
    dayKeyOrTime: string | Date,
    utcOffsetSeconds: number,
    now: Date = new Date()
): string {
    const dayKey =
        typeof dayKeyOrTime === 'string'
            ? dayKeyOrTime
            : getLocationDayKey(dayKeyOrTime, utcOffsetSeconds)

    if (isLocationTodayDayKey(dayKey, utcOffsetSeconds, now)) return 'Today'
    if (isLocationTomorrowDayKey(dayKey, utcOffsetSeconds, now))
        return 'Tomorrow'
    return formatDayKey(dayKey, 'weekdayMonthDay')
}

/**
 * Resolve offset from weather meta, or fall back to the device offset
 * when meta is missing (should be rare after cache migration).
 */
export function resolveUtcOffsetSeconds(
    metaOffset: number | undefined,
    now: Date = new Date()
): number {
    if (typeof metaOffset === 'number' && Number.isFinite(metaOffset)) {
        return metaOffset
    }
    return -now.getTimezoneOffset() * 60
}
