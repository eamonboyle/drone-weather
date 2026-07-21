import {
    classifyAirspaceLabel,
    formatAltitudeLimit,
    isDroneRelevantAirspace,
    openAipIcaoClassLabel,
    openAipTypeLabel,
} from '@/services/airspace/classifyAirspace'
import type {
    AirspaceFeature,
    AirspaceFeatureCollection,
    AirspaceSource,
} from '@/types/airspace'

function isPolygonGeometry(
    geometry: GeoJSON.Geometry | null
): geometry is GeoJSON.Polygon | GeoJSON.MultiPolygon {
    return (
        geometry != null &&
        (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon')
    )
}

function simplifyRing(
    ring: GeoJSON.Position[],
    stride: number
): GeoJSON.Position[] {
    if (ring.length <= 16 || stride <= 1) return ring
    const kept: GeoJSON.Position[] = []
    for (let i = 0; i < ring.length - 1; i += stride) {
        kept.push(ring[i])
    }
    const first = ring[0]
    const last = kept[kept.length - 1]
    if (last[0] !== first[0] || last[1] !== first[1]) {
        kept.push(first)
    }
    return kept
}

/** Lightweight vertex thinning for mobile rendering. */
export function simplifyGeometry(
    geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon,
    stride = 3
): GeoJSON.Polygon | GeoJSON.MultiPolygon {
    if (geometry.type === 'Polygon') {
        return {
            type: 'Polygon',
            coordinates: geometry.coordinates.map((ring) =>
                simplifyRing(ring, stride)
            ),
        }
    }
    return {
        type: 'MultiPolygon',
        coordinates: geometry.coordinates.map((poly) =>
            poly.map((ring) => simplifyRing(ring, stride))
        ),
    }
}

export function normalizeOpenAipFeatureCollection(
    raw: GeoJSON.FeatureCollection,
    options: {
        country: string
        simplifyStride?: number
        /** Keep only drone-relevant categories when true. */
        droneRelevantOnly?: boolean
    }
): AirspaceFeatureCollection {
    const stride = options.simplifyStride ?? 3
    const features: AirspaceFeature[] = []

    for (const feature of raw.features) {
        if (!isPolygonGeometry(feature.geometry)) continue
        const props = (feature.properties ?? {}) as Record<string, unknown>
        const typeLabel = openAipTypeLabel(
            props.type as number | string | undefined
        )
        const rawLower = props.lowerLimit as
            | { value?: number; unit?: number; referenceDatum?: number }
            | undefined

        if (
            options.droneRelevantOnly &&
            !isDroneRelevantAirspace(typeLabel, rawLower)
        ) {
            continue
        }

        const category = classifyAirspaceLabel(typeLabel)

        const name =
            typeof props.name === 'string' && props.name.trim()
                ? props.name.trim()
                : typeLabel
        const id =
            typeof props._id === 'string'
                ? props._id
                : `openaip-${options.country}-${features.length}`

        features.push({
            type: 'Feature',
            id,
            geometry: simplifyGeometry(feature.geometry, stride),
            properties: {
                id,
                name,
                source: 'openaip',
                category,
                typeLabel,
                country: options.country.toUpperCase(),
                lowerLimit: formatAltitudeLimit(rawLower),
                upperLimit: formatAltitudeLimit(
                    props.upperLimit as
                        | {
                              value?: number
                              unit?: number
                              referenceDatum?: number
                          }
                        | undefined
                ),
                icaoClass: openAipIcaoClassLabel(
                    props.icaoClass as number | string | undefined
                ),
                byNotam: Boolean(props.byNotam),
                onDemand: Boolean(props.onDemand),
                onRequest: Boolean(props.onRequest),
            },
        })
    }

    return {
        type: 'FeatureCollection',
        features,
        metadata: {
            source: 'openaip',
            country: options.country.toUpperCase(),
            generatedAt: new Date().toISOString(),
            featureCount: features.length,
        },
    }
}

export function normalizeNatsFeatureCollection(
    raw: GeoJSON.FeatureCollection,
    options: { effectiveFrom?: string; simplifyStride?: number } = {}
): AirspaceFeatureCollection {
    const stride = options.simplifyStride ?? 2
    const features: AirspaceFeature[] = []

    for (const feature of raw.features) {
        if (!isPolygonGeometry(feature.geometry)) continue
        const props = (feature.properties ?? {}) as Record<string, unknown>
        const name =
            (typeof props.name === 'string' && props.name) ||
            (typeof props.Name === 'string' && props.Name) ||
            (typeof props.description === 'string' && props.description) ||
            'UK restriction'
        const typeLabel = String(
            props.typeLabel ||
                props.type ||
                props.airspaceType ||
                inferNatsTypeFromName(name) ||
                'RESTRICTED'
        ).toUpperCase()
        const category = classifyAirspaceLabel(typeLabel)
        const id = `nats-${features.length}-${slugify(name)}`

        features.push({
            type: 'Feature',
            id,
            geometry: simplifyGeometry(feature.geometry, stride),
            properties: {
                id,
                name: String(name),
                source: 'nats' satisfies AirspaceSource,
                category,
                typeLabel,
                country: 'GB',
                lowerLimit:
                    typeof props.lowerLimit === 'string'
                        ? props.lowerLimit
                        : undefined,
                upperLimit:
                    typeof props.upperLimit === 'string'
                        ? props.upperLimit
                        : undefined,
                effectiveFrom: options.effectiveFrom,
            },
        })
    }

    return {
        type: 'FeatureCollection',
        features,
        metadata: {
            source: 'nats',
            country: 'GB',
            effectiveFrom: options.effectiveFrom,
            generatedAt: new Date().toISOString(),
            featureCount: features.length,
        },
    }
}

function inferNatsTypeFromName(name: string): string {
    const upper = name.toUpperCase()
    if (upper.includes('FRZ') || upper.includes('FLIGHT RESTRICTION')) {
        return 'FRZ'
    }
    if (upper.includes('RPZ')) return 'RPZ'
    if (upper.includes('DANGER') || upper.startsWith('D')) return 'DANGER'
    if (upper.includes('PROHIBIT') || upper.startsWith('P')) return 'PROHIBITED'
    if (upper.includes('RESTRICT') || upper.startsWith('R')) return 'RESTRICTED'
    return 'RESTRICTED'
}

function slugify(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40)
}
