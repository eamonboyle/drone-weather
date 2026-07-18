import {
    formatDayKey,
    formatLocationDayLabel,
    formatLocationTime,
    formatLocationTimeRange,
    getLocationDayKey,
    getLocationHours,
    isLocationTodayDayKey,
    isSameLocationDay,
    msUntilNextLocationHour,
} from '@/utils/locationTime'

describe('locationTime', () => {
    // 2026-05-24T18:00:00Z with +3600 offset → 19:00 local
    const utcInstant = new Date('2026-05-24T18:00:00.000Z')
    const offsetPlusOneHour = 3600

    it('reads clock hour in location timezone', () => {
        expect(getLocationHours(utcInstant, offsetPlusOneHour)).toBe(19)
        expect(getLocationHours(utcInstant, 0)).toBe(18)
        expect(getLocationHours(utcInstant, -5 * 3600)).toBe(13)
    })

    it('groups days by location calendar date', () => {
        const lateUtc = new Date('2026-05-24T23:30:00.000Z')
        // +2h → May 25 01:30 local
        expect(getLocationDayKey(lateUtc, 2 * 3600)).toBe('2026-05-25')
        expect(getLocationDayKey(lateUtc, 0)).toBe('2026-05-24')
    })

    it('compares same location day across UTC midnight', () => {
        const a = new Date('2026-05-24T22:00:00.000Z')
        const b = new Date('2026-05-25T01:00:00.000Z')
        // +3h: a=May 25 01:00, b=May 25 04:00
        expect(isSameLocationDay(a, b, 3 * 3600)).toBe(true)
        expect(isSameLocationDay(a, b, 0)).toBe(false)
    })

    it('schedules the next location-local hour boundary', () => {
        // 18:30:00Z with +0 → 30 minutes into hour → ~30m remaining (+50ms buffer)
        const midHour = new Date('2026-05-24T18:30:00.000Z')
        const remaining = msUntilNextLocationHour(0, midHour)
        expect(remaining).toBeGreaterThanOrEqual(30 * 60 * 1000)
        expect(remaining).toBeLessThanOrEqual(30 * 60 * 1000 + 100)
    })

    it('formats HH:mm in location timezone', () => {
        expect(formatLocationTime(utcInstant, offsetPlusOneHour)).toBe('19:00')
        expect(
            formatLocationTime(utcInstant, offsetPlusOneHour, { hour12: true })
        ).toBe('7:00 PM')
    })

    it('formats day keys without device timezone parsing', () => {
        expect(formatDayKey('2026-05-24', 'weekday')).toBe('Sunday')
        expect(formatDayKey('2026-05-24', 'monthDay')).toBe('May 24')
    })

    it('labels today relative to location offset', () => {
        const now = new Date('2026-05-24T18:00:00.000Z')
        const todayKey = getLocationDayKey(now, 2 * 3600) // May 24 20:00
        expect(isLocationTodayDayKey(todayKey, 2 * 3600, now)).toBe(true)
        expect(formatLocationDayLabel(todayKey, 2 * 3600, now)).toBe('Today')
        expect(
            formatLocationDayLabel('2026-05-25', 2 * 3600, now)
        ).toBe('Tomorrow')
    })

    it('formats time ranges in location timezone', () => {
        const start = new Date('2026-05-24T10:00:00.000Z')
        const end = new Date('2026-05-24T12:00:00.000Z')
        expect(formatLocationTimeRange(start, end, 3600)).toBe('11 AM – 1 PM')
    })
})
