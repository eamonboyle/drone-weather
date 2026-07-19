import { formatFreshnessLabelForTests } from '@/hooks/useFocusAwareFreshnessLabel'

describe('focus-aware freshness label formatting', () => {
    it('formats minute-aligned ages consistently', () => {
        const now = Date.parse('2026-05-24T12:00:00.000Z')
        expect(
            formatFreshnessLabelForTests(now - 30_000, now)
        ).toBe('Updated just now')
        expect(
            formatFreshnessLabelForTests(now - 60_000, now)
        ).toBe('Updated 1 min ago')
        expect(
            formatFreshnessLabelForTests(now - 597 * 60_000, now)
        ).toBe('Updated 597 min ago')
    })
})
