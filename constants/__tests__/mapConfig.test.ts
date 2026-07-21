import {
    guessCountryCode,
    isInUkBounds,
    MAP_CONFIG,
    resolveCountryCode,
} from '@/constants/mapConfig'

describe('mapConfig', () => {
    it('exposes a default UK-region center and style URL', () => {
        expect(MAP_CONFIG.defaultCenter.latitude).toBeGreaterThan(50)
        expect(MAP_CONFIG.mapStyleUrl).toContain('http')
        expect(MAP_CONFIG.basemapAttribution).toContain('OpenFreeMap')
    })

    it('detects UK bounds without swallowing the Republic of Ireland', () => {
        expect(isInUkBounds(51.5, -0.12)).toBe(true)
        expect(isInUkBounds(54.6, -5.9)).toBe(true) // NI
        expect(isInUkBounds(53.3, -6.3)).toBe(false) // Dublin
        expect(isInUkBounds(40.7, -74)).toBe(false)
    })

    it('resolves high-confidence offline regions without a silent GB fallback', () => {
        expect(resolveCountryCode(51.5, -0.12)).toBe('gb')
        expect(resolveCountryCode(53.3, -6.3)).toBe('ie')
        expect(resolveCountryCode(40.7, -74)).toBe('us')
        expect(resolveCountryCode(-33.87, 151.21)).toBeNull() // Sydney
    })

    it('prefers an explicit ISO country code over offline heuristics', () => {
        expect(resolveCountryCode(43.65, -79.38, 'ca')).toBe('ca')
        expect(resolveCountryCode(43.65, -79.38, 'CA')).toBe('ca')
        expect(resolveCountryCode(51.5, -0.12, 'fr')).toBe('fr')
    })

    it('does not classify Toronto as US without an ISO code', () => {
        expect(resolveCountryCode(43.65, -79.38)).toBeNull()
        expect(guessCountryCode(43.65, -79.38)).toBeNull()
    })

    it('treats Canada-adjacent northern CONUS as ambiguous offline', () => {
        // Detroit-ish — do not guess US vs CA from rectangles alone.
        expect(resolveCountryCode(42.33, -83.05)).toBeNull()
    })
})
