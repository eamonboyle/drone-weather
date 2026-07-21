import {
    guessCountryCode,
    isInUkBounds,
    MAP_CONFIG,
} from '@/constants/mapConfig'

describe('mapConfig', () => {
    it('exposes a default UK-region center and style URL', () => {
        expect(MAP_CONFIG.defaultCenter.latitude).toBeGreaterThan(50)
        expect(MAP_CONFIG.mapStyleUrl).toContain('http')
    })

    it('detects UK bounds without swallowing the Republic of Ireland', () => {
        expect(isInUkBounds(51.5, -0.12)).toBe(true)
        expect(isInUkBounds(54.6, -5.9)).toBe(true) // NI
        expect(isInUkBounds(53.3, -6.3)).toBe(false) // Dublin
        expect(isInUkBounds(40.7, -74)).toBe(false)
    })

    it('guesses country codes from approximate regions', () => {
        expect(guessCountryCode(51.5, -0.12)).toBe('gb')
        expect(guessCountryCode(53.3, -6.3)).toBe('ie')
        expect(guessCountryCode(40.7, -74)).toBe('us')
    })
})
