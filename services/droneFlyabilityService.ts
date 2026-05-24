import { HourlyWeatherData } from '@/types/weather'
import { WeatherThresholds } from '@/types/weatherConfig'
import {
    convertTemperature,
    convertSpeed,
    convertDistance,
} from '@/utils/unitConversion'
import { API_WIND_UNIT } from '@/constants/weatherUnits'

export interface DroneFlightConditions {
    isSuitable: boolean
    reasons: string[]
    windSpeedDetails: { height: string; speed: number }[]
    windGustDetails: { height: string; speed: number }[]
}

interface ConditionCheck {
    isSafe: boolean
    reason?: string
}

function normalizeApiWind(
    windMph: number,
    thresholdUnit: WeatherThresholds['windSpeed']['unit']
): number {
    if (thresholdUnit === API_WIND_UNIT) return windMph
    return convertSpeed(windMph, 'mph', 'kmh')
}

function checkTemperature(
    temperature: number,
    thresholds: WeatherThresholds
): ConditionCheck {
    const minTemp =
        thresholds.temperature.unit === 'fahrenheit'
            ? convertTemperature(
                  thresholds.temperature.min,
                  'fahrenheit',
                  'celsius'
              )
            : thresholds.temperature.min
    const maxTemp =
        thresholds.temperature.unit === 'fahrenheit'
            ? convertTemperature(
                  thresholds.temperature.max,
                  'fahrenheit',
                  'celsius'
              )
            : thresholds.temperature.max

    const isSafe = temperature >= minTemp && temperature <= maxTemp
    return {
        isSafe,
        reason: isSafe
            ? undefined
            : `Temperature (${temperature.toFixed(1)}°C) is outside safe range (${minTemp.toFixed(1)}°C - ${maxTemp.toFixed(1)}°C)`,
    }
}

function checkWindSpeed(
    windSpeedMph: number,
    thresholds: WeatherThresholds
): ConditionCheck {
    const windInThresholdUnit = normalizeApiWind(
        windSpeedMph,
        thresholds.windSpeed.unit
    )
    const maxWindSpeed = thresholds.windSpeed.max
    const unitLabel = thresholds.windSpeed.unit === 'mph' ? 'mph' : 'km/h'

    const isSafe = windInThresholdUnit <= maxWindSpeed
    return {
        isSafe,
        reason: isSafe
            ? undefined
            : `Wind speed (${windInThresholdUnit.toFixed(1)} ${unitLabel}) exceeds maximum (${maxWindSpeed} ${unitLabel})`,
    }
}

function checkWindGust(
    windGustMph: number,
    thresholds: WeatherThresholds
): ConditionCheck {
    const gustInThresholdUnit = normalizeApiWind(
        windGustMph,
        thresholds.windSpeed.unit
    )
    const maxGust = thresholds.windGust.max
    const unitLabel = thresholds.windSpeed.unit === 'mph' ? 'mph' : 'km/h'

    const isSafe = gustInThresholdUnit <= maxGust
    return {
        isSafe,
        reason: isSafe
            ? undefined
            : `Wind gusts (${gustInThresholdUnit.toFixed(1)} ${unitLabel}) exceed maximum (${maxGust} ${unitLabel})`,
    }
}

function checkVisibility(
    visibilityMeters: number,
    thresholds: WeatherThresholds
): ConditionCheck {
    const visibilityKm = visibilityMeters / 1000
    const minVisibilityKm =
        thresholds.visibility.unit === 'miles'
            ? convertDistance(thresholds.visibility.min, 'miles', 'kilometers')
            : thresholds.visibility.min

    const isSafe = visibilityKm >= minVisibilityKm
    const unitLabel =
        thresholds.visibility.unit === 'miles' ? 'mi' : 'km'
    const displayVisibility =
        thresholds.visibility.unit === 'miles'
            ? convertDistance(visibilityKm, 'kilometers', 'miles')
            : visibilityKm

    return {
        isSafe,
        reason: isSafe
            ? undefined
            : `Visibility (${displayVisibility.toFixed(1)} ${unitLabel}) is below minimum (${thresholds.visibility.min} ${unitLabel})`,
    }
}

function checkWeatherConditions(
    cloudCover: number,
    precipitationProbability: number,
    thresholds: WeatherThresholds
): ConditionCheck[] {
    const checks: ConditionCheck[] = []

    if (cloudCover > thresholds.weather.maxCloudCover) {
        checks.push({
            isSafe: false,
            reason: `Cloud cover (${cloudCover.toFixed(0)}%) exceeds maximum (${thresholds.weather.maxCloudCover}%)`,
        })
    }

    if (
        precipitationProbability >
        thresholds.weather.maxPrecipitationProbability
    ) {
        checks.push({
            isSafe: false,
            reason: `Precipitation probability (${precipitationProbability.toFixed(0)}%) exceeds maximum (${thresholds.weather.maxPrecipitationProbability}%)`,
        })
    }

    return checks
}

function getWindDetails(hourData: HourlyWeatherData): {
    speeds: { height: string; speed: number }[]
    gusts: { height: string; speed: number }[]
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
        const reasons: string[] = []
        const { speeds: windSpeedDetails, gusts: windGustDetails } =
            getWindDetails(hourData)

        const checks: ConditionCheck[] = [
            checkTemperature(hourData.temperature2m, thresholds),
            checkWindSpeed(hourData.windSpeed10m, thresholds),
            checkWindGust(hourData.windGusts10m, thresholds),
            checkVisibility(hourData.visibility, thresholds),
            ...checkWeatherConditions(
                hourData.cloudCover,
                hourData.precipitationProbability,
                thresholds
            ),
        ]

        checks.forEach((check) => {
            if (!check.isSafe && check.reason) {
                reasons.push(check.reason)
            }
        })

        return {
            isSuitable: reasons.length === 0,
            reasons,
            windSpeedDetails,
            windGustDetails,
        }
    }
}
