/**
 * Minimal KML → GeoJSON converter for NATS UAS KML packs.
 * Handles Placemark polygons / MultiGeometry common in AIP visualisations.
 */

function decodeXmlEntities(value: string): string {
    return value
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
}

function extractTag(block: string, tag: string): string | undefined {
    const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i')
    const match = block.match(re)
    return match ? decodeXmlEntities(match[1].trim()) : undefined
}

function parseCoordinateTuples(text: string): GeoJSON.Position[] {
    return text
        .trim()
        .split(/\s+/)
        .map((tuple) => tuple.split(',').map(Number))
        .filter(
            (parts) =>
                parts.length >= 2 &&
                Number.isFinite(parts[0]) &&
                Number.isFinite(parts[1])
        )
        .map(([lng, lat, alt]) =>
            alt == null || Number.isNaN(alt) ? [lng, lat] : [lng, lat, alt]
        )
}

function extractPolygonsFromBlock(block: string): GeoJSON.Polygon[] {
    const polygons: GeoJSON.Polygon[] = []
    const polygonBlocks = block.match(/<Polygon[\s\S]*?<\/Polygon>/gi) ?? []
    for (const polygonBlock of polygonBlocks) {
        const outer = polygonBlock.match(
            /<outerBoundaryIs[\s\S]*?<coordinates[^>]*>([\s\S]*?)<\/coordinates>/i
        )
        if (!outer) continue
        const ring = parseCoordinateTuples(outer[1])
        if (ring.length < 4) continue
        const holes: GeoJSON.Position[][] = []
        const innerMatches = polygonBlock.matchAll(
            /<innerBoundaryIs[\s\S]*?<coordinates[^>]*>([\s\S]*?)<\/coordinates>/gi
        )
        for (const inner of innerMatches) {
            const hole = parseCoordinateTuples(inner[1])
            if (hole.length >= 4) holes.push(hole)
        }
        polygons.push({ type: 'Polygon', coordinates: [ring, ...holes] })
    }
    return polygons
}

export function kmlToGeoJson(kml: string): GeoJSON.FeatureCollection {
    const features: GeoJSON.Feature[] = []
    const placemarks = kml.match(/<Placemark[\s\S]*?<\/Placemark>/gi) ?? []

    for (const placemark of placemarks) {
        const name = extractTag(placemark, 'name') ?? 'Unnamed'
        const description = extractTag(placemark, 'description')
        const polygons = extractPolygonsFromBlock(placemark)
        if (polygons.length === 0) continue

        const geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon =
            polygons.length === 1
                ? polygons[0]
                : {
                      type: 'MultiPolygon',
                      coordinates: polygons.map((p) => p.coordinates),
                  }

        features.push({
            type: 'Feature',
            properties: {
                name,
                description,
                typeLabel: inferTypeLabel(name, description),
            },
            geometry,
        })
    }

    return { type: 'FeatureCollection', features }
}

function inferTypeLabel(name: string, description?: string): string {
    const text = `${name} ${description ?? ''}`.toUpperCase()
    if (text.includes('FRZ') || text.includes('FLIGHT RESTRICTION ZONE')) {
        return 'FRZ'
    }
    if (text.includes('RPZ')) return 'RPZ'
    if (text.includes('DANGER')) return 'DANGER'
    if (text.includes('PROHIBIT')) return 'PROHIBITED'
    if (text.includes('RESTRICT')) return 'RESTRICTED'
    return 'RESTRICTED'
}
