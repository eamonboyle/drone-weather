import { WeatherData, DroneFlightConditions } from '@/types/weather'
import { WeatherThresholds } from '@/types/weatherConfig'
import { WeatherConfigService } from '@/services/weatherConfigService'
import { WeatherCacheService } from '@/services/weatherCacheService'
import { WeatherApiClient } from '@/services/weatherApiClient'
import { DroneFlyabilityService } from '@/services/droneFlyabilityService'
import {
    findHourlyDataForClockHour,
    getWeatherUtcOffset,
} from '@/utils/weatherHourUtils'

export interface GetWeatherOptions {
    /** When true, skip disk cache and fetch from the network. */
    bypassCache?: boolean
}

export class WeatherService {
    static async getCurrentWeather(
        latitude: number,
        longitude: number,
        options: GetWeatherOptions = {}
    ): Promise<WeatherData> {
        try {
            if (!options.bypassCache) {
                const cachedData = await WeatherCacheService.getCachedWeather(
                    latitude,
                    longitude
                )
                if (cachedData) {
                    return cachedData
                }
            }

            const result = await WeatherApiClient.fetchWeatherData(
                latitude,
                longitude
            )

            await WeatherCacheService.cacheWeather(result, latitude, longitude)

            return result
        } catch (error) {
            console.error('Error getting weather data:', error)
            throw new Error('Failed to get weather data')
        }
    }

    /**
     * Prefer passing thresholds from context for immediate UI updates.
     * Falls back to persisted thresholds when omitted.
     */
    static evaluateFlyability(
        weather: WeatherData,
        clockHour: number,
        thresholds: WeatherThresholds
    ): DroneFlightConditions {
        const hourData = findHourlyDataForClockHour(
            weather.hourlyData,
            clockHour,
            { utcOffsetSeconds: getWeatherUtcOffset(weather) }
        )

        if (!hourData) {
            return {
                isSuitable: false,
                checks: [],
                reasons: ['No weather data available for selected hour'],
                windSpeedDetails: [],
                windGustDetails: [],
            }
        }

        return DroneFlyabilityService.checkFlyingConditions(hourData, thresholds)
    }

    static async isDroneFlyable(
        weather: WeatherData,
        clockHour: number,
        thresholds?: WeatherThresholds
    ): Promise<DroneFlightConditions> {
        try {
            const resolved =
                thresholds ?? (await WeatherConfigService.getThresholds())
            return WeatherService.evaluateFlyability(
                weather,
                clockHour,
                resolved
            )
        } catch (error) {
            console.error('Error checking drone flyability:', error)
            return {
                isSuitable: false,
                checks: [],
                reasons: [
                    'Unable to determine flight conditions due to configuration error',
                ],
                windSpeedDetails: [],
                windGustDetails: [],
            }
        }
    }
}
