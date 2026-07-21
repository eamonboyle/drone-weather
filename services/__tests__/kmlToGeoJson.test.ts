import * as fs from 'fs'
import * as path from 'path'
import { kmlToGeoJson } from '@/services/airspace/kmlToGeoJson'
import { normalizeNatsFeatureCollection } from '@/services/airspace/normalizeAirspace'

describe('kmlToGeoJson', () => {
    it('parses the sample UK FRZ fixture into polygons', () => {
        const kmlPath = path.join(
            __dirname,
            '../../scripts/airspace/fixtures/sample-uk-frz.kml'
        )
        const kml = fs.readFileSync(kmlPath, 'utf8')
        const geojson = kmlToGeoJson(kml)
        expect(geojson.features).toHaveLength(3)
        expect(geojson.features[0].geometry?.type).toBe('Polygon')

        const normalized = normalizeNatsFeatureCollection(geojson, {
            effectiveFrom: '2026-07-20',
        })
        expect(normalized.metadata?.source).toBe('nats')
        expect(normalized.features[0].properties.category).toBe('restricted')
        expect(normalized.features[0].properties.source).toBe('nats')
    })
})
