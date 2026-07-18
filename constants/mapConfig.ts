/**
 * Public client configuration for the reference airspace map.
 * These values are not secrets — they identify a published Google My Maps layer.
 */
export const MAP_CONFIG = {
    /** UK AIP / My Maps published map ID */
    googleMyMapsId: '1BktWMPYNuh6N5_IPngyq8jW80nAWXI8d',
    defaultCenter: {
        latitude: 53.969343189733976,
        longitude: -7.362310992457914,
    },
    defaultZoom: 12,
    /** Soft reveal if WebView load events never complete (common with My Maps). */
    loadTimeoutMs: 8_000,
    externalMapsBaseUrl: 'https://www.google.com/maps/d/viewer',
} as const

export function buildEmbedMapUrl(
    latitude: number,
    longitude: number,
    zoom = MAP_CONFIG.defaultZoom
): string {
    return `https://www.google.com/maps/d/embed?mid=${MAP_CONFIG.googleMyMapsId}&femb=1&ll=${latitude},${longitude}&z=${zoom}`
}

export function buildExternalMapUrl(
    latitude: number,
    longitude: number
): string {
    return `${MAP_CONFIG.externalMapsBaseUrl}?mid=${MAP_CONFIG.googleMyMapsId}&ll=${latitude},${longitude}&z=${MAP_CONFIG.defaultZoom}`
}

/**
 * Allow Google Maps hosts including country TLDs (google.co.uk, maps.google.de, …)
 * plus asset CDNs used by the embed.
 *
 * Rejects suffix spoofs like maps.google.com.evil.com (must end at the Google
 * registrable domain: google.<tld> or google.co|com.<cc>).
 */
export function isAllowedGoogleMapsHost(hostname: string): boolean {
    const host = hostname.toLowerCase().replace(/\.$/, '')
    if (/(^|\.)(googleapis|gstatic|googleusercontent|ggpht)\.com$/.test(host)) {
        return true
    }
    // (sub.)google.com | (sub.)google.de | (sub.)google.co.uk | (sub.)google.com.au
    // Final cc label is exactly 2 letters so google.com.evil is rejected.
    return /(?:^|\.)google\.(?:com|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})$/.test(
        host
    )
}

export function isAllowedMapNavigationUrl(url: string): boolean {
    if (
        url === 'about:blank' ||
        url.startsWith('about:blank') ||
        url.startsWith('blob:')
    ) {
        return true
    }
    try {
        const parsed = new URL(url)
        if (parsed.protocol !== 'https:') return false
        return isAllowedGoogleMapsHost(parsed.hostname)
    } catch {
        return false
    }
}
