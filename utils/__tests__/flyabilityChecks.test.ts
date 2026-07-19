import {
    checkStatusToBooleanSafe,
    checkStatusToCellSafe,
    checkStatusToMetricSafety,
} from '@/utils/flyabilityChecks'

describe('flyabilityChecks', () => {
    describe('checkStatusToCellSafe', () => {
        it('maps safe to true', () => {
            expect(checkStatusToCellSafe('safe')).toBe(true)
        })

        it('maps unsafe to false', () => {
            expect(checkStatusToCellSafe('unsafe')).toBe(false)
        })

        it('maps unavailable to neutral, not unsafe red', () => {
            expect(checkStatusToCellSafe('unavailable')).toBe('neutral')
        })
    })

    describe('checkStatusToMetricSafety', () => {
        it('passes through structured statuses', () => {
            expect(checkStatusToMetricSafety('safe')).toBe('safe')
            expect(checkStatusToMetricSafety('unsafe')).toBe('unsafe')
            expect(checkStatusToMetricSafety('unavailable')).toBe(
                'unavailable'
            )
        })
    })

    describe('checkStatusToBooleanSafe', () => {
        it('is true only for safe', () => {
            expect(checkStatusToBooleanSafe('safe')).toBe(true)
            expect(checkStatusToBooleanSafe('unsafe')).toBe(false)
            expect(checkStatusToBooleanSafe('unavailable')).toBe(false)
        })
    })
})
