import {
    isAllowedGoogleMapsHost,
    isAllowedMapNavigationUrl,
} from '@/constants/mapConfig'

describe('mapConfig allowlist', () => {
    it('allows google.com and country TLDs', () => {
        expect(isAllowedGoogleMapsHost('www.google.com')).toBe(true)
        expect(isAllowedGoogleMapsHost('maps.google.co.uk')).toBe(true)
        expect(isAllowedGoogleMapsHost('google.de')).toBe(true)
        expect(isAllowedGoogleMapsHost('www.googleapis.com')).toBe(true)
        expect(isAllowedGoogleMapsHost('fonts.gstatic.com')).toBe(true)
    })

    it('rejects non-Google hosts and suffix spoofs', () => {
        expect(isAllowedGoogleMapsHost('evil.com')).toBe(false)
        expect(isAllowedGoogleMapsHost('notgoogle.com')).toBe(false)
        expect(isAllowedGoogleMapsHost('google.evil.com')).toBe(false)
        expect(isAllowedGoogleMapsHost('maps.google.com.evil')).toBe(false)
        expect(isAllowedGoogleMapsHost('maps.google.com.evil.com')).toBe(false)
        expect(isAllowedGoogleMapsHost('www.google.com.attacker.io')).toBe(
            false
        )
    })

    it('allows https Google URLs and blank/blob', () => {
        expect(
            isAllowedMapNavigationUrl('https://maps.google.co.uk/maps')
        ).toBe(true)
        expect(isAllowedMapNavigationUrl('about:blank')).toBe(true)
        expect(isAllowedMapNavigationUrl('blob:https://example.com/1')).toBe(
            true
        )
        expect(isAllowedMapNavigationUrl('http://maps.google.com')).toBe(false)
        expect(isAllowedMapNavigationUrl('https://evil.com')).toBe(false)
    })
})
