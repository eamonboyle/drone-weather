export type AirspaceSource = 'nats' | 'openaip'

/** Visual / legend category used for styling. */
export type AirspaceCategory = 'restricted' | 'controlled' | 'advisory'

export interface AirspaceFeatureProperties {
    id: string
    name: string
    source: AirspaceSource
    category: AirspaceCategory
    /** Original type label (e.g. FRZ, DANGER, CTR). */
    typeLabel: string
    country?: string
    lowerLimit?: string
    upperLimit?: string
    effectiveFrom?: string
    /** ICAO class letter when known (A–G). */
    icaoClass?: string
    byNotam?: boolean
    onDemand?: boolean
    onRequest?: boolean
}

export interface AirspaceFeature
    extends GeoJSON.Feature<
        GeoJSON.Polygon | GeoJSON.MultiPolygon,
        AirspaceFeatureProperties
    > {}

export interface AirspaceFeatureCollection
    extends GeoJSON.FeatureCollection<
        GeoJSON.Polygon | GeoJSON.MultiPolygon,
        AirspaceFeatureProperties
    > {
    metadata?: {
        source: AirspaceSource | 'mixed'
        country?: string
        effectiveFrom?: string
        generatedAt?: string
        featureCount?: number
    }
}

export interface AirspacePackMeta {
    country: string
    source: AirspaceSource
    fetchedAt: string
    effectiveFrom?: string
    featureCount: number
    schemaVersion?: number
    attribution?: string
}

export interface SelectedAirspaceFeature {
    id: string
    name: string
    typeLabel: string
    source: AirspaceSource
    category: AirspaceCategory
    lowerLimit?: string
    upperLimit?: string
    country?: string
    icaoClass?: string
    byNotam?: boolean
    onDemand?: boolean
    onRequest?: boolean
    geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
}
