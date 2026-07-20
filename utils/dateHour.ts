/** Native hour-boundary helpers (replaces date-fns for these call sites). */

export function startOfHour(date: Date): Date {
    const next = new Date(date.getTime())
    next.setMinutes(0, 0, 0)
    return next
}

export function isBefore(date: Date, dateToCompare: Date): boolean {
    return date.getTime() < dateToCompare.getTime()
}

/** Calendar-hour add (date-fns compatible) so DST transitions stay correct. */
export function addHours(date: Date, amount: number): Date {
    const next = new Date(date.getTime())
    next.setHours(next.getHours() + amount)
    return next
}
