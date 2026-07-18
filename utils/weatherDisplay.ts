import { convertDistance, convertSpeed, convertTemperature } from '@/utils/unitConversion'
import { WeatherThresholds } from '@/types/weatherConfig'

export function formatNullable(
    value: number | null | undefined,
    formatter: (n: number) => string,
    fallback = '—'
): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return fallback
    }
    return formatter(value)
}

export function formatTemperatureDisplay(
    celsius: number | null | undefined,
    unit: WeatherThresholds['temperature']['unit']
): string {
    return formatNullable(celsius, (value) => {
        if (unit === 'fahrenheit') {
            return `${convertTemperature(value, 'celsius', 'fahrenheit').toFixed(1)}°F`
        }
        return `${value.toFixed(1)}°C`
    })
}

export function formatWindDisplay(
    speedMph: number | null | undefined,
    unit: WeatherThresholds['windSpeed']['unit']
): string {
    return formatNullable(speedMph, (value) => {
        if (unit === 'mph') {
            return `${value.toFixed(1)} mph`
        }
        return `${convertSpeed(value, 'mph', 'kmh').toFixed(1)} km/h`
    })
}

export function formatVisibilityDisplay(
    meters: number | null | undefined,
    unit: WeatherThresholds['visibility']['unit']
): string {
    return formatNullable(meters, (value) => {
        const km = value / 1000
        if (unit === 'miles') {
            return `${convertDistance(km, 'kilometers', 'miles').toFixed(1)} mi`
        }
        return `${km.toFixed(1)} km`
    })
}

export function formatPercentDisplay(
    value: number | null | undefined,
    digits = 0
): string {
    return formatNullable(value, (n) => `${n.toFixed(digits)}%`)
}
