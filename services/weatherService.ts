import { WeatherData } from '@/types/weather'
import { WeatherConfigService } from '@/services/weatherConfigService'
import { WeatherCacheService } from '@/services/weatherCacheService'
import { WeatherApiClient } from '@/services/weatherApiClient'
import {
    DroneFlyabilityService,
    DroneFlightConditions,
} from '@/services/droneFlyabilityService'
import { findHourlyDataForClockHour } from '@/utils/weatherHourUtils'

function convertTemperature(
    value: number,
    fromUnit: 'celsius' | 'fahrenheit',
    toUnit: 'celsius' | 'fahrenheit'
): number {
    if (fromUnit === toUnit) return value
    if (fromUnit === 'celsius' && toUnit === 'fahrenheit') {
        return (value * 9) / 5 + 32
    }
    return ((value - 32) * 5) / 9
}

function convertSpeed(
    value: number,
    fromUnit: 'kmh' | 'mph',
    toUnit: 'kmh' | 'mph'
): number {
    if (fromUnit === toUnit) return value
    if (fromUnit === 'kmh' && toUnit === 'mph') {
        return value * 0.621371
    }
    return value * 1.60934
}

function convertDistance(
    value: number,
    fromUnit: 'kilometers' | 'miles',
    toUnit: 'kilometers' | 'miles'
): number {
    if (fromUnit === toUnit) return value
    if (fromUnit === 'kilometers' && toUnit === 'miles') {
        return value * 0.621371
    }
    return value * 1.60934
}

export class WeatherService {
    static async getCurrentWeather(
        latitude: number,
        longitude: number
    ): Promise<WeatherData> {
        try {
            // Try to get cached data first
            const cachedData = await WeatherCacheService.getCachedWeather(
                latitude,
                longitude
            )
            if (cachedData) {
                return cachedData
            }

            // Fetch fresh data from API
            const hourlyData = await WeatherApiClient.fetchWeatherData(
                latitude,
                longitude
            )

            const result = { hourlyData }

            // Cache the fetched data
            await WeatherCacheService.cacheWeather(result, latitude, longitude)

            return result
        } catch (error) {
            console.error('Error getting weather data:', error)
            throw new Error('Failed to get weather data')
        }
    }

    static async isDroneFlyable(
        weather: WeatherData,
        clockHour: number = new Date().getHours()
    ): Promise<DroneFlightConditions> {
        try {
            const thresholds = await WeatherConfigService.getThresholds()
            if (!thresholds) {
                throw new Error('Weather thresholds not available')
            }

            const hourData = findHourlyDataForClockHour(
                weather.hourlyData,
                clockHour
            )
            if (!hourData) {
                throw new Error('No weather data available for selected hour')
            }

            return DroneFlyabilityService.checkFlyingConditions(
                hourData,
                thresholds
            )
        } catch (error) {
            console.error('Error checking drone flyability:', error)
            return {
                isSuitable: false,
                reasons: [
                    'Unable to determine flight conditions due to configuration error',
                ],
                windSpeedDetails: [],
                windGustDetails: [],
            }
        }
    }
}
