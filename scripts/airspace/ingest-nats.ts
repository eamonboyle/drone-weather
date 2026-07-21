/**
 * Convert a NATS UAS Flight Restrictions KML/KMZ into the bundled UK GeoJSON pack.
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/airspace/ingest-nats.ts [path]
 *
 * Or via npm:
 *   npm run airspace:ingest-nats -- scripts/airspace/input/uas-flight-restrictions.kmz
 *
 * Download the official pack from:
 *   https://nats-uk.ead-it.com/cms-nats/opencms/en/Publications/digital-datasets
 */

import * as fs from 'fs'
import * as path from 'path'
import JSZip from 'jszip'
import { kmlToGeoJson } from '../../services/airspace/kmlToGeoJson'
import { normalizeNatsFeatureCollection } from '../../services/airspace/normalizeAirspace'

const ROOT = path.resolve(__dirname, '../..')
const DEFAULT_INPUT = path.join(
    ROOT,
    'scripts/airspace/fixtures/sample-uk-frz.kml'
)
const OUTPUT = path.join(ROOT, 'assets/airspace/uk-restrictions.json')

async function readKmlFromInput(inputPath: string): Promise<string> {
    const lower = inputPath.toLowerCase()
    const buffer = fs.readFileSync(inputPath)
    if (lower.endsWith('.kml')) {
        return buffer.toString('utf8')
    }
    if (lower.endsWith('.kmz')) {
        const zip = await JSZip.loadAsync(buffer)
        const kmlName = Object.keys(zip.files).find((name) =>
            name.toLowerCase().endsWith('.kml')
        )
        if (!kmlName) {
            throw new Error('KMZ does not contain a .kml file')
        }
        return zip.files[kmlName].async('string')
    }
    throw new Error('Input must be a .kml or .kmz file')
}

async function main() {
    const inputPath = path.resolve(process.argv[2] ?? DEFAULT_INPUT)
    if (!fs.existsSync(inputPath)) {
        throw new Error(`Input not found: ${inputPath}`)
    }

    console.log(`Reading ${inputPath}`)
    const kml = await readKmlFromInput(inputPath)
    const raw = kmlToGeoJson(kml)
    const effectiveFrom =
        process.env.AIRSPACE_EFFECTIVE_FROM ??
        new Date().toISOString().slice(0, 10)
    const normalized = normalizeNatsFeatureCollection(raw, {
        effectiveFrom,
        simplifyStride: 2,
    })

    fs.mkdirSync(path.dirname(OUTPUT), { recursive: true })
    fs.writeFileSync(OUTPUT, JSON.stringify(normalized))
    console.log(
        `Wrote ${normalized.features.length} features → ${OUTPUT} (effective ${effectiveFrom})`
    )
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
