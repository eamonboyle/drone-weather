import { API_WIND_UNIT } from '@/constants/weatherUnits'
import { convertSpeed, SpeedUnit } from '@/utils/unitConversion'

export function windMphToThresholdUnit(
    speedMph: number,
    unit: SpeedUnit
): number {
    if (unit === API_WIND_UNIT) return speedMph
    return convertSpeed(speedMph, 'mph', 'kmh')
}

export function formatWindSpeedMph(
    speedMph: number,
    unit: SpeedUnit,
    decimals = 1
): string {
    if (unit === 'mph') {
        return `${speedMph.toFixed(decimals)} mph`
    }
    return `${convertSpeed(speedMph, 'mph', 'kmh').toFixed(decimals)} km/h`
}

export function isWindWithinThreshold(
    speedMph: number,
    max: number,
    unit: SpeedUnit
): boolean {
    return windMphToThresholdUnit(speedMph, unit) <= max
}
