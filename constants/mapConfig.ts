/**
 * Native airspace map configuration (MapLibre + free data packs).
 */
export const MAP_CONFIG = {
    defaultCenter: {
        latitude: 53.969343189733976,
        longitude: -7.362310992457914,
    },
    defaultZoom: 10,
    /** OpenFreeMap vector style — no API key required. */
    mapStyleUrl: 'https://tiles.openfreemap.org/styles/liberty',
    /**
     * Approximate Great Britain + Northern Ireland coverage.
     * Republic of Ireland is intentionally excluded (use OpenAIP `ie`).
     */
    ukBounds: {
        // West edge kept east of Dublin so ROI is not treated as GB.
        gb: { west: -5.75, south: 49.85, east: 1.9, north: 60.9 },
        ni: { west: -8.25, south: 54.0, east: -5.4, north: 55.4 },
    },
    /** OpenAIP daily country export bucket (public GCS). */
    openAipBucketBase:
        'https://storage.googleapis.com/29f98e10-a489-4c82-ae5e-489dbcd4912f',
    /** Refresh country packs after this many days. */
    packTtlDays: 7,
    openAipAttribution:
        'Airspace outside UK (and UK community overlay): OpenAIP data, CC BY-NC 4.0 — https://www.openaip.net',
    natsAttribution:
        'UK permanent UAS restrictions: derived from NATS / UK AIP ENR 5.1 digital datasets when ingested.',
} as const

function inBox(
    latitude: number,
    longitude: number,
    box: { west: number; south: number; east: number; north: number }
): boolean {
    return (
        longitude >= box.west &&
        longitude <= box.east &&
        latitude >= box.south &&
        latitude <= box.north
    )
}

export function isInUkBounds(latitude: number, longitude: number): boolean {
    return (
        inBox(latitude, longitude, MAP_CONFIG.ukBounds.gb) ||
        inBox(latitude, longitude, MAP_CONFIG.ukBounds.ni)
    )
}

/** Rough ISO country hint from map center for OpenAIP pack selection. */
export function guessCountryCode(
    latitude: number,
    longitude: number
): string {
    // Ireland (ROI) before UK so Dublin is not treated as GB.
    if (
        latitude >= 51.3 &&
        latitude <= 55.5 &&
        longitude >= -10.8 &&
        longitude <= -5.3 &&
        !isInUkBounds(latitude, longitude)
    ) {
        return 'ie'
    }
    if (isInUkBounds(latitude, longitude)) return 'gb'
    // Very coarse continental hints — OpenAIP pack fetch is best-effort.
    if (
        latitude >= 41 &&
        latitude <= 51.2 &&
        longitude >= -5.5 &&
        longitude <= 10
    ) {
        return 'fr'
    }
    if (
        latitude >= 47 &&
        latitude <= 55.2 &&
        longitude >= 5.5 &&
        longitude <= 15.5
    ) {
        return 'de'
    }
    if (
        latitude >= 36 &&
        latitude <= 44 &&
        longitude >= -10 &&
        longitude <= 5
    ) {
        return 'es'
    }
    if (
        latitude >= 36.5 &&
        latitude <= 47.2 &&
        longitude >= 6.5 &&
        longitude <= 19
    ) {
        return 'it'
    }
    if (
        latitude >= 24 &&
        latitude <= 50 &&
        longitude >= -125 &&
        longitude <= -66
    ) {
        return 'us'
    }
    return 'gb'
}
