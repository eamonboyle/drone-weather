/** Native hour-boundary helpers (replaces date-fns for these call sites). */

export function startOfHour(date: Date): Date {
    const next = new Date(date.getTime())
    next.setMinutes(0, 0, 0)
    return next
}

export function isBefore(date: Date, dateToCompare: Date): boolean {
    return date.getTime() < dateToCompare.getTime()
}

export function addHours(date: Date, amount: number): Date {
    return new Date(date.getTime() + amount * 3_600_000)
}
