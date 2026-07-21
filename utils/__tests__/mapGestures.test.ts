import { exceedsTapSlop, MAP_TAP_SLOP_PT } from '@/utils/mapGestures'

describe('exceedsTapSlop', () => {
    it('treats small movement as a tap', () => {
        expect(exceedsTapSlop(0, 0)).toBe(false)
        expect(exceedsTapSlop(3, 4)).toBe(false) // distance 5
        expect(exceedsTapSlop(MAP_TAP_SLOP_PT, 0)).toBe(false)
    })

    it('treats movement beyond slop as a pan', () => {
        expect(exceedsTapSlop(MAP_TAP_SLOP_PT + 1, 0)).toBe(true)
        expect(exceedsTapSlop(8, 8)).toBe(true)
    })

    it('respects a custom slop', () => {
        expect(exceedsTapSlop(5, 0, 4)).toBe(true)
        expect(exceedsTapSlop(3, 0, 4)).toBe(false)
    })
})
