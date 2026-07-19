import {
    DroneFlightConditions,
    FlyabilityCheck,
    FlyabilityCheckStatus,
    HourlyWeatherData,
} from '@/types/weather'
import { WeatherThresholds } from '@/types/weatherConfig'
import {
    convertTemperature,
    convertSpeed,
    convertDistance,
} from '@/utils/unitConversion'
import { API_WIND_UNIT } from '@/constants/weatherUnits'
import { addHours, isBefore, startOfHour } from 'date-fns'

export type { DroneFlightConditions } from '@/types/weather'

export interface SafeFlyingWindow {
    type: 'now' | 'upcoming' | 'none'
    startTime?: Date
    endTime?: Date
    durationHours?: number
}

interface SafeBlock {
    start: Date
    end: Date
    durationHours: number
}

function toHourDate(time: Date | string): Date {
    return time instanceof Date ? time : new Date(time)
}

function isMissing(value: number | null | undefined): boolean {
    return value === null || value === undefined || Number.isNaN(value)
}

function normalizeApiWind(
    windMph: number,
    thresholdUnit: WeatherThresholds['windSpeed']['unit']
): number {
    if (thresholdUnit === API_WIND_UNIT) return windMph
    return convertSpeed(windMph, 'mph', 'kmh')
}

function buildCheck(
    factor: FlyabilityCheck['factor'],
    status: FlyabilityCheckStatus,
    value: number | null,
    displayValue: string,
    thresholdLabel: string,
    explanation: string
): FlyabilityCheck {
    return {
        factor,
        status,
        value,
        displayValue,
        thresholdLabel,
        explanation,
    }
}

function checkTemperature(
    temperature: number | null,
    thresholds: WeatherThresholds
): FlyabilityCheck {
    const unitLabel = thresholds.temperature.unit === 'fahrenheit' ? '°F' : '°C'
    const thresholdLabel = `${thresholds.temperature.min}${unitLabel} – ${thresholds.temperature.max}${unitLabel}`

    if (isMissing(temperature)) {
        return buildCheck(
            'temperature',
            'unavailable',
            null,
            '—',
            thresholdLabel,
            'Temperature data is unavailable for this hour'
        )
    }

    const minTempC =
        thresholds.temperature.unit === 'fahrenheit'
            ? convertTemperature(
                  thresholds.temperature.min,
                  'fahrenheit',
                  'celsius'
              )
            : thresholds.temperature.min
    const maxTempC =
        thresholds.temperature.unit === 'fahrenheit'
            ? convertTemperature(
                  thresholds.temperature.max,
                  'fahrenheit',
                  'celsius'
              )
            : thresholds.temperature.max

    const displayTemp =
        thresholds.temperature.unit === 'fahrenheit'
            ? convertTemperature(temperature!, 'celsius', 'fahrenheit')
            : temperature!

    const isSafe = temperature! >= minTempC && temperature! <= maxTempC
    const displayValue = `${displayTemp.toFixed(1)}${unitLabel}`

    return buildCheck(
        'temperature',
        isSafe ? 'safe' : 'unsafe',
        temperature!,
        displayValue,
        thresholdLabel,
        isSafe
            ? `Temperature (${displayValue}) is within safe range (${thresholdLabel})`
            : `Temperature (${displayValue}) is outside safe range (${thresholdLabel})`
    )
}

function checkWindSpeed(
    windSpeedMph: number | null,
    thresholds: WeatherThresholds
): FlyabilityCheck {
    const unitLabel = thresholds.windSpeed.unit === 'mph' ? 'mph' : 'km/h'
    const thresholdLabel = `≤ ${thresholds.windSpeed.max} ${unitLabel}`

    if (isMissing(windSpeedMph)) {
        return buildCheck(
            'windSpeed',
            'unavailable',
            null,
            '—',
            thresholdLabel,
            'Wind speed data is unavailable for this hour'
        )
    }

    const windInThresholdUnit = normalizeApiWind(
        windSpeedMph!,
        thresholds.windSpeed.unit
    )
    const isSafe = windInThresholdUnit <= thresholds.windSpeed.max
    const displayValue = `${windInThresholdUnit.toFixed(1)} ${unitLabel}`

    return buildCheck(
        'windSpeed',
        isSafe ? 'safe' : 'unsafe',
        windSpeedMph!,
        displayValue,
        thresholdLabel,
        isSafe
            ? `Wind speed (${displayValue}) is within limit (${thresholdLabel})`
            : `Wind speed (${displayValue}) exceeds maximum (${thresholds.windSpeed.max} ${unitLabel})`
    )
}

function checkWindGust(
    windGustMph: number | null,
    thresholds: WeatherThresholds
): FlyabilityCheck {
    const unitLabel = thresholds.windSpeed.unit === 'mph' ? 'mph' : 'km/h'
    const thresholdLabel = `≤ ${thresholds.windGust.max} ${unitLabel}`

    if (isMissing(windGustMph)) {
        return buildCheck(
            'windGust',
            'unavailable',
            null,
            '—',
            thresholdLabel,
            'Wind gust data is unavailable for this hour'
        )
    }

    const gustInThresholdUnit = normalizeApiWind(
        windGustMph!,
        thresholds.windSpeed.unit
    )
    const isSafe = gustInThresholdUnit <= thresholds.windGust.max
    const displayValue = `${gustInThresholdUnit.toFixed(1)} ${unitLabel}`

    return buildCheck(
        'windGust',
        isSafe ? 'safe' : 'unsafe',
        windGustMph!,
        displayValue,
        thresholdLabel,
        isSafe
            ? `Wind gusts (${displayValue}) are within limit (${thresholdLabel})`
            : `Wind gusts (${displayValue}) exceed maximum (${thresholds.windGust.max} ${unitLabel})`
    )
}

function checkVisibility(
    visibilityMeters: number | null,
    thresholds: WeatherThresholds
): FlyabilityCheck {
    const unitLabel = thresholds.visibility.unit === 'miles' ? 'mi' : 'km'
    const thresholdLabel = `≥ ${thresholds.visibility.min} ${unitLabel}`

    if (isMissing(visibilityMeters)) {
        return buildCheck(
            'visibility',
            'unavailable',
            null,
            '—',
            thresholdLabel,
            'Visibility data is unavailable for this hour'
        )
    }

    const visibilityKm = visibilityMeters! / 1000
    const minVisibilityKm =
        thresholds.visibility.unit === 'miles'
            ? convertDistance(thresholds.visibility.min, 'miles', 'kilometers')
            : thresholds.visibility.min

    const displayVisibility =
        thresholds.visibility.unit === 'miles'
            ? convertDistance(visibilityKm, 'kilometers', 'miles')
            : visibilityKm

    const isSafe = visibilityKm >= minVisibilityKm
    const displayValue = `${displayVisibility.toFixed(1)} ${unitLabel}`

    return buildCheck(
        'visibility',
        isSafe ? 'safe' : 'unsafe',
        visibilityMeters!,
        displayValue,
        thresholdLabel,
        isSafe
            ? `Visibility (${displayValue}) meets minimum (${thresholdLabel})`
            : `Visibility (${displayValue}) is below minimum (${thresholds.visibility.min} ${unitLabel})`
    )
}

function checkPrecipitation(
    precipitationProbability: number | null,
    thresholds: WeatherThresholds
): FlyabilityCheck {
    const thresholdLabel = `≤ ${thresholds.weather.maxPrecipitationProbability}%`

    if (isMissing(precipitationProbability)) {
        return buildCheck(
            'precipitation',
            'unavailable',
            null,
            '—',
            thresholdLabel,
            'Precipitation probability is unavailable for this hour'
        )
    }

    const isSafe =
        precipitationProbability! <=
        thresholds.weather.maxPrecipitationProbability
    const displayValue = `${precipitationProbability!.toFixed(0)}%`

    return buildCheck(
        'precipitation',
        isSafe ? 'safe' : 'unsafe',
        precipitationProbability!,
        displayValue,
        thresholdLabel,
        isSafe
            ? `Precipitation probability (${displayValue}) is within limit (${thresholdLabel})`
            : `Precipitation probability (${displayValue}) exceeds maximum (${thresholds.weather.maxPrecipitationProbability}%)`
    )
}

function getWindDetails(hourData: HourlyWeatherData): {
    speeds: { height: string; speed: number | null }[]
    gusts: { height: string; speed: number | null }[]
} {
    return {
        speeds: [
            { height: '10m', speed: hourData.windSpeed10m },
            { height: '80m', speed: hourData.windSpeed80m },
            { height: '120m', speed: hourData.windSpeed120m },
            { height: '180m', speed: hourData.windSpeed180m },
        ],
        gusts: [{ height: '10m', speed: hourData.windGusts10m }],
    }
}

export class DroneFlyabilityService {
    static checkFlyingConditions(
        hourData: HourlyWeatherData,
        thresholds: WeatherThresholds
    ): DroneFlightConditions {
        const { speeds: windSpeedDetails, gusts: windGustDetails } =
            getWindDetails(hourData)

        // Cloud cover is intentionally omitted — informational only (AGENTS.md).
        const checks: FlyabilityCheck[] = [
            checkTemperature(hourData.temperature2m, thresholds),
            checkWindSpeed(hourData.windSpeed10m, thresholds),
            checkWindGust(hourData.windGusts10m, thresholds),
            checkVisibility(hourData.visibility, thresholds),
            checkPrecipitation(hourData.precipitationProbability, thresholds),
        ]

        const blocking = checks.filter((check) => check.status !== 'safe')
        const reasons = blocking.map((check) => check.explanation)

        return {
            isSuitable: blocking.length === 0,
            checks,
            reasons,
            windSpeedDetails,
            windGustDetails,
        }
    }

    static findNextSafeFlyingWindow(
        hourlyData: HourlyWeatherData[],
        thresholds: WeatherThresholds,
        options?: { lookAheadHours?: number; from?: Date }
    ): SafeFlyingWindow {
        const lookAheadHours = options?.lookAheadHours ?? 48
        const from = options?.from ?? new Date()
        const fromHour = startOfHour(from)

        const relevantHours = hourlyData
            .filter((hour) => !isBefore(toHourDate(hour.time), fromHour))
            .slice(0, lookAheadHours)

        if (relevantHours.length === 0) {
            return { type: 'none' }
        }

        const blocks: SafeBlock[] = []
        let blockStart: Date | null = null
        let blockCount = 0
        let lastSafeTime: Date | null = null

        for (const hourData of relevantHours) {
            const hourTime = toHourDate(hourData.time)
            const isSafe = DroneFlyabilityService.checkFlyingConditions(
                hourData,
                thresholds
            ).isSuitable

            if (isSafe) {
                if (!blockStart) {
                    blockStart = hourTime
                }
                blockCount++
                lastSafeTime = hourTime
            } else if (blockStart && lastSafeTime) {
                blocks.push({
                    start: blockStart,
                    end: addHours(lastSafeTime, 1),
                    durationHours: blockCount,
                })
                blockStart = null
                blockCount = 0
                lastSafeTime = null
            }
        }

        if (blockStart && lastSafeTime) {
            blocks.push({
                start: blockStart,
                end: addHours(lastSafeTime, 1),
                durationHours: blockCount,
            })
        }

        if (blocks.length === 0) {
            return { type: 'none' }
        }

        const firstBlock = blocks[0]
        const isNow =
            firstBlock.start.getTime() <= fromHour.getTime() &&
            firstBlock.end.getTime() > from.getTime()

        return {
            type: isNow ? 'now' : 'upcoming',
            startTime: firstBlock.start,
            endTime: firstBlock.end,
            durationHours: firstBlock.durationHours,
        }
    }
}
