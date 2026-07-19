import { WeatherThresholds } from '@/types/weatherConfig'

export type TemperatureUnit = 'celsius' | 'fahrenheit'
export type SpeedUnit = 'kmh' | 'mph'
export type DistanceUnit = 'kilometers' | 'miles'

export function convertTemperature(
    value: number,
    fromUnit: TemperatureUnit,
    toUnit: TemperatureUnit
): number {
    if (fromUnit === toUnit) return value
    if (fromUnit === 'celsius' && toUnit === 'fahrenheit') {
        return (value * 9) / 5 + 32
    }
    return ((value - 32) * 5) / 9
}

export function convertSpeed(
    value: number,
    fromUnit: SpeedUnit,
    toUnit: SpeedUnit
): number {
    if (fromUnit === toUnit) return value
    if (fromUnit === 'kmh' && toUnit === 'mph') {
        return value * 0.621371
    }
    return value * 1.60934
}

export function convertDistance(
    value: number,
    fromUnit: DistanceUnit,
    toUnit: DistanceUnit
): number {
    if (fromUnit === toUnit) return value
    if (fromUnit === 'kilometers' && toUnit === 'miles') {
        return value * 0.621371
    }
    return value * 1.60934
}

/** Atomically convert stored threshold values when the user switches units. */
export function convertThresholdsOnUnitChange(
    thresholds: WeatherThresholds,
    category: 'temperature' | 'windSpeed' | 'visibility',
    newUnit: string
): WeatherThresholds {
    if (category === 'temperature') {
        const from = thresholds.temperature.unit
        const to = newUnit as TemperatureUnit
        if (from === to) return thresholds
        return {
            ...thresholds,
            temperature: {
                unit: to,
                min: Math.round(convertTemperature(thresholds.temperature.min, from, to)),
                max: Math.round(convertTemperature(thresholds.temperature.max, from, to)),
            },
        }
    }

    if (category === 'windSpeed') {
        const from = thresholds.windSpeed.unit
        const to = newUnit as SpeedUnit
        if (from === to) return thresholds
        return {
            ...thresholds,
            windSpeed: {
                unit: to,
                max: Math.round(convertSpeed(thresholds.windSpeed.max, from, to)),
            },
            windGust: {
                max: Math.round(convertSpeed(thresholds.windGust.max, from, to)),
            },
        }
    }

    const from = thresholds.visibility.unit
    const to = newUnit as DistanceUnit
    if (from === to) return thresholds
    return {
        ...thresholds,
        visibility: {
            unit: to,
            min: Math.round(
                convertDistance(thresholds.visibility.min, from, to) * 10
            ) / 10,
        },
    }
}

export function roundForDisplay(value: number, digits = 1): string {
    return value.toFixed(digits)
}
