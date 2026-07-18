import { fetchWeatherApi } from 'openmeteo'
import {
    HourlyWeatherData,
    WeatherData,
    WEATHER_SOURCE_OPEN_METEO,
} from '@/types/weather'
import { range } from '@/utils/range'

interface WeatherApiParams {
    latitude: number
    longitude: number
    hourly: string[]
    wind_speed_unit: string
    timezone: string
}

const HOURLY_VARIABLES = [
    'temperature_2m',
    'relative_humidity_2m',
    'dew_point_2m',
    'apparent_temperature',
    'precipitation_probability',
    'precipitation',
    'rain',
    'showers',
    'snowfall',
    'snow_depth',
    'weather_code',
    'cloud_cover',
    'cloud_cover_low',
    'cloud_cover_mid',
    'cloud_cover_high',
    'visibility',
    'evapotranspiration',
    'et0_fao_evapotranspiration',
    'vapour_pressure_deficit',
    'wind_speed_10m',
    'wind_speed_80m',
    'wind_speed_120m',
    'wind_speed_180m',
    'wind_direction_10m',
    'wind_direction_80m',
    'wind_direction_120m',
    'wind_direction_180m',
    'wind_gusts_10m',
    'temperature_80m',
    'temperature_120m',
    'temperature_180m',
] as const

const API_URL = 'https://api.open-meteo.com/v1/forecast'

/** Safety-critical variable indices in HOURLY_VARIABLES */
const SAFETY_CRITICAL_INDICES = new Set([0, 4, 15, 19, 27])

function readValue(
    values: Float32Array | null | undefined,
    index: number,
    variableIndex: number
): number | null {
    if (!values) return null
    const raw = values[index]
    if (raw === undefined || raw === null || Number.isNaN(raw)) {
        return null
    }
    // Informational zeros are fine; safety-critical missing must stay null.
    // Open-Meteo uses NaN for missing; zeros can be valid (e.g. 0% precip).
    if (SAFETY_CRITICAL_INDICES.has(variableIndex) && !Number.isFinite(raw)) {
        return null
    }
    return raw
}

export class WeatherApiClient {
    static async fetchWeatherData(
        latitude: number,
        longitude: number
    ): Promise<WeatherData> {
        try {
            const params: WeatherApiParams = {
                latitude,
                longitude,
                hourly: [...HOURLY_VARIABLES],
                wind_speed_unit: 'mph',
                timezone: 'auto',
            }

            const responses = await fetchWeatherApi(API_URL, params)
            const response = responses[0]
            const utcOffsetSeconds = response.utcOffsetSeconds()
            const timezone =
                typeof response.timezone === 'function'
                    ? String(response.timezone())
                    : 'auto'
            const hourly = response.hourly()

            if (!hourly) {
                throw new Error('No hourly data available')
            }

            const valueArrays = HOURLY_VARIABLES.map((_, variableIndex) =>
                hourly.variables(variableIndex)?.valuesArray()
            )

            // Real UTC instants — location wall clock via meta.utcOffsetSeconds
            const times = range(
                Number(hourly.time()),
                Number(hourly.timeEnd()),
                hourly.interval()
            ).map((t) => new Date(t * 1000))

            const hourlyData: HourlyWeatherData[] = times.map((time, index) => ({
                time,
                temperature2m: readValue(valueArrays[0], index, 0),
                relativeHumidity2m: readValue(valueArrays[1], index, 1),
                dewPoint2m: readValue(valueArrays[2], index, 2),
                apparentTemperature: readValue(valueArrays[3], index, 3),
                precipitationProbability: readValue(valueArrays[4], index, 4),
                precipitation: readValue(valueArrays[5], index, 5),
                rain: readValue(valueArrays[6], index, 6),
                showers: readValue(valueArrays[7], index, 7),
                snowfall: readValue(valueArrays[8], index, 8),
                snowDepth: readValue(valueArrays[9], index, 9),
                weatherCode: readValue(valueArrays[10], index, 10),
                cloudCover: readValue(valueArrays[11], index, 11),
                cloudCoverLow: readValue(valueArrays[12], index, 12),
                cloudCoverMid: readValue(valueArrays[13], index, 13),
                cloudCoverHigh: readValue(valueArrays[14], index, 14),
                visibility: readValue(valueArrays[15], index, 15),
                evapotranspiration: readValue(valueArrays[16], index, 16),
                et0FaoEvapotranspiration: readValue(valueArrays[17], index, 17),
                vapourPressureDeficit: readValue(valueArrays[18], index, 18),
                windSpeed10m: readValue(valueArrays[19], index, 19),
                windSpeed80m: readValue(valueArrays[20], index, 20),
                windSpeed120m: readValue(valueArrays[21], index, 21),
                windSpeed180m: readValue(valueArrays[22], index, 22),
                windDirection10m: readValue(valueArrays[23], index, 23),
                windDirection80m: readValue(valueArrays[24], index, 24),
                windDirection120m: readValue(valueArrays[25], index, 25),
                windDirection180m: readValue(valueArrays[26], index, 26),
                windGusts10m: readValue(valueArrays[27], index, 27),
                temperature80m: readValue(valueArrays[28], index, 28),
                temperature120m: readValue(valueArrays[29], index, 29),
                temperature180m: readValue(valueArrays[30], index, 30),
            }))

            return {
                hourlyData,
                meta: {
                    latitude,
                    longitude,
                    timezone,
                    utcOffsetSeconds,
                    fetchedAt: Date.now(),
                    source: WEATHER_SOURCE_OPEN_METEO,
                },
            }
        } catch (error) {
            console.error('Error fetching weather data:', error)
            throw new Error('Failed to fetch weather data')
        }
    }
}
