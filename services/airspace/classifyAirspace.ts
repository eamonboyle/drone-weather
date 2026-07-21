import type { AirspaceCategory } from '@/types/airspace'

/** OpenAIP numeric airspace type → label (API schema enums). */
export const OPENAIP_TYPE_LABELS: Record<number, string> = {
    0: 'OTHER',
    1: 'RESTRICTED',
    2: 'DANGER',
    3: 'PROHIBITED',
    4: 'CTR',
    5: 'TMZ',
    6: 'RMZ',
    7: 'TMA',
    8: 'TRA',
    9: 'TSA',
    10: 'FIR',
    11: 'UIR',
    12: 'ADIZ',
    13: 'ATZ',
    14: 'MATZ',
    15: 'AIRWAY',
    16: 'MTR',
    17: 'ALERT',
    18: 'WARNING',
    19: 'PROTECTED',
    20: 'HTZ',
    21: 'GLIDING_SECTOR',
    22: 'TRP',
    23: 'TIZ',
    24: 'TIA',
    25: 'MTA',
    26: 'CTA',
    27: 'ACC_SECTOR',
    28: 'AERIAL_SPORTING_RECREATIONAL',
    29: 'OVERFLIGHT_RESTRICTION',
    /** Flight Information Service sectors (France SIV, etc.). */
    33: 'SIV',
    /** Lower traffic area / high en-route bands. */
    34: 'LTA',
}

/**
 * Types that can matter for typical recreational drone ops (low altitude).
 * High TMAs/CTAs are further gated by {@link DRONE_RELEVANT_MAX_FLOOR_FT}.
 */
export const DRONE_RELEVANT_TYPE_LABELS = new Set([
    'RESTRICTED',
    'DANGER',
    'PROHIBITED',
    'WARNING',
    'PROTECTED',
    'OVERFLIGHT_RESTRICTION',
    'FRZ',
    'RPZ',
    'UAS',
    'CTR',
    'ATZ',
    'MATZ',
    'TMZ',
    'RMZ',
    'ADIZ',
    'HTZ',
    'ALERT',
    'TMA',
    'CTA',
    'TRA',
    'TSA',
])

/**
 * Drop airspace whose floor is at/above this (ft). Typical drone limits are
 * ~400 ft AGL; 1,500 ft leaves a buffer for AMSL vs AGL and airport CTRs.
 */
export const DRONE_RELEVANT_MAX_FLOOR_FT = 1500

export function altitudeLimitToFeet(
    limit:
        | { value?: number; unit?: number; referenceDatum?: number }
        | undefined
): number {
    if (limit == null || typeof limit.value !== 'number') return 0
    if (limit.unit === 6) return limit.value * 100 // flight level
    if (limit.unit === 2) return limit.value * 3.28084 // metres
    return limit.value // feet (unit 1) or unknown → treat as feet
}

/** Whether an OpenAIP feature is worth showing to drone users. */
export function isDroneRelevantAirspace(
    typeLabel: string,
    lowerLimit?: { value?: number; unit?: number; referenceDatum?: number }
): boolean {
    const normalized = typeLabel.trim().toUpperCase()
    if (!DRONE_RELEVANT_TYPE_LABELS.has(normalized)) return false
    return altitudeLimitToFeet(lowerLimit) < DRONE_RELEVANT_MAX_FLOOR_FT
}

const RESTRICTED_LABELS = new Set([
    'RESTRICTED',
    'DANGER',
    'PROHIBITED',
    'WARNING',
    'PROTECTED',
    'OVERFLIGHT_RESTRICTION',
    'FRZ',
    'RPZ',
    'UAS',
    'P',
    'R',
    'D',
])

const CONTROLLED_LABELS = new Set([
    'CTR',
    'TMA',
    'CTA',
    'ATZ',
    'MATZ',
    'TMZ',
    'RMZ',
    'CLASS_A',
    'CLASS_B',
    'CLASS_C',
    'CLASS_D',
    'CONTROLLED',
])

export function openAipTypeLabel(typeCode: number | string | undefined): string {
    if (typeof typeCode === 'number') {
        return OPENAIP_TYPE_LABELS[typeCode] ?? `TYPE_${typeCode}`
    }
    if (typeof typeCode === 'string' && typeCode.trim()) {
        return typeCode.trim().toUpperCase()
    }
    return 'OTHER'
}

export function classifyAirspaceLabel(typeLabel: string): AirspaceCategory {
    const normalized = typeLabel.trim().toUpperCase()
    if (
        RESTRICTED_LABELS.has(normalized) ||
        normalized.includes('RESTRICT') ||
        normalized.includes('DANGER') ||
        normalized.includes('PROHIBIT') ||
        normalized.includes('FRZ') ||
        normalized.includes('RPZ')
    ) {
        return 'restricted'
    }
    if (
        CONTROLLED_LABELS.has(normalized) ||
        normalized.includes('CTR') ||
        normalized.includes('CONTROL')
    ) {
        return 'controlled'
    }
    return 'advisory'
}

export function categoryFillColor(category: AirspaceCategory): string {
    switch (category) {
        case 'restricted':
            return '#ef4444'
        case 'controlled':
            return '#3b82f6'
        case 'advisory':
            return '#f59e0b'
        default: {
            const _exhaustive: never = category
            return _exhaustive
        }
    }
}

/** OpenAIP icaoClass integer → ICAO letter (A–G). */
export const OPENAIP_ICAO_CLASS: Record<number, string> = {
    0: 'A',
    1: 'B',
    2: 'C',
    3: 'D',
    4: 'E',
    5: 'F',
    6: 'G',
    8: 'Unclassified',
}

export function openAipIcaoClassLabel(
    icaoClass: number | string | undefined
): string | undefined {
    if (typeof icaoClass === 'number') {
        return OPENAIP_ICAO_CLASS[icaoClass]
    }
    if (typeof icaoClass === 'string' && icaoClass.trim()) {
        return icaoClass.trim().toUpperCase()
    }
    return undefined
}

export function categoryDisplayLabel(category: AirspaceCategory): string {
    switch (category) {
        case 'restricted':
            return 'Restricted / danger'
        case 'controlled':
            return 'Controlled airspace'
        case 'advisory':
            return 'Advisory'
        default: {
            const _exhaustive: never = category
            return _exhaustive
        }
    }
}

export function formatAltitudeLimit(
    limit:
        | { value?: number; unit?: number; referenceDatum?: number }
        | string
        | undefined
): string | undefined {
    if (limit == null) return undefined
    if (typeof limit === 'string') return limit
    if (typeof limit.value !== 'number') return undefined
    const unit =
        limit.unit === 1
            ? 'ft'
            : limit.unit === 2
              ? 'm'
              : limit.unit === 6
                ? 'FL'
                : ''
    const datum =
        limit.referenceDatum === 0
            ? 'AGL'
            : limit.referenceDatum === 1
              ? 'AMSL'
              : limit.referenceDatum === 2
                ? ''
                : ''
    if (unit === 'FL') return `FL${limit.value}`
    return `${limit.value}${unit}${datum ? ` ${datum}` : ''}`.trim()
}
