/**
 * Bootstrap a UK restrictions pack from OpenAIP GB daily export.
 * Prefer `ingest-nats.ts` with the official NATS KMZ when available —
 * this is a free interim pack for development and CI.
 *
 *   npm run airspace:bootstrap-uk
 */

import * as fs from 'fs'
import * as path from 'path'
import { MAP_CONFIG } from '../../constants/mapConfig'
import { normalizeOpenAipFeatureCollection } from '../../services/airspace/normalizeAirspace'
import type { AirspaceFeatureCollection } from '../../types/airspace'

const ROOT = path.resolve(__dirname, '../..')
const OUTPUT = path.join(ROOT, 'assets/airspace/uk-restrictions.json')

async function main() {
    const url = `${MAP_CONFIG.openAipBucketBase}/gb_asp.geojson`
    console.log(`Downloading ${url}`)
    const response = await fetch(url)
    if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`)
    }
    const raw = (await response.json()) as GeoJSON.FeatureCollection
    const openAip = normalizeOpenAipFeatureCollection(raw, {
        country: 'gb',
        simplifyStride: 4,
        droneRelevantOnly: true,
    })

    // Keep restricted / controlled only for the bundled UK pack size.
    const features = openAip.features.filter(
        (f) =>
            f.properties.category === 'restricted' ||
            f.properties.category === 'controlled'
    )

    const pack: AirspaceFeatureCollection = {
        type: 'FeatureCollection',
        features,
        metadata: {
            source: 'openaip',
            country: 'GB',
            generatedAt: new Date().toISOString(),
            featureCount: features.length,
            effectiveFrom: new Date().toISOString().slice(0, 10),
        },
    }

    fs.mkdirSync(path.dirname(OUTPUT), { recursive: true })
    fs.writeFileSync(OUTPUT, JSON.stringify(pack))
    console.log(`Wrote ${features.length} features → ${OUTPUT}`)
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
