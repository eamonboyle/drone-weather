import bundledUk from '../../assets/airspace/uk-restrictions.json'
import type { AirspaceFeatureCollection } from '@/types/airspace'

/**
 * Bundled UK restrictions pack produced by `npm run airspace:ingest-nats`
 * (or the OpenAIP bootstrap script).
 */
export function loadBundledUkRestrictions(): AirspaceFeatureCollection {
    const pack = bundledUk as AirspaceFeatureCollection
    if (!pack || pack.type !== 'FeatureCollection') {
        return {
            type: 'FeatureCollection',
            features: [],
            metadata: { source: 'nats', country: 'GB', featureCount: 0 },
        }
    }
    return pack
}

export function bundledUkEffectiveFrom(): string | undefined {
    return loadBundledUkRestrictions().metadata?.effectiveFrom
}
