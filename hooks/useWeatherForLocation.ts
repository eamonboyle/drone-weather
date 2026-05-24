import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from '@/contexts/LocationContext'
import { useWeatherData } from '@/contexts/WeatherDataContext'
import { WeatherService } from '@/services/weatherService'
import { WeatherCacheService } from '@/services/weatherCacheService'
import { WeatherData } from '@/types/weather'

const LOCATION_DELTA = 0.01

let inFlightFetch: {
    key: string
    promise: Promise<WeatherData>
} | null = null

let sharedLastFetched: { lat: number; lng: number } | null = null

function coordsChanged(
    lat: number,
    lng: number,
    last: { lat: number; lng: number } | null
): boolean {
    if (!last) return true
    return (
        Math.abs(lat - last.lat) > LOCATION_DELTA ||
        Math.abs(lng - last.lng) > LOCATION_DELTA
    )
}

function fetchKey(lat: number, lng: number): string {
    return `${lat.toFixed(4)},${lng.toFixed(4)}`
}

async function fetchWeatherDeduped(
    latitude: number,
    longitude: number
): Promise<WeatherData> {
    const key = fetchKey(latitude, longitude)
    if (inFlightFetch?.key === key) {
        return inFlightFetch.promise
    }

    const promise = WeatherService.getCurrentWeather(latitude, longitude)
    inFlightFetch = { key, promise }

    try {
        return await promise
    } finally {
        if (inFlightFetch?.key === key) {
            inFlightFetch = null
        }
    }
}

export function useWeatherForLocation() {
    const { location, isLocating, errorMsg } = useLocation()
    const { weatherData, setWeatherData } = useWeatherData()
    const [isLoading, setIsLoading] = useState(false)
    const [isInitialLoad, setIsInitialLoad] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const mountedRef = useRef(true)
    const hydratedFromCacheRef = useRef(false)

    useEffect(() => {
        mountedRef.current = true
        return () => {
            mountedRef.current = false
        }
    }, [])

    useEffect(() => {
        let cancelled = false

        async function hydrateFromCache() {
            if (hydratedFromCacheRef.current) return

            const cached = await WeatherCacheService.getLastCachedWeather()
            if (cancelled || !cached) return

            hydratedFromCacheRef.current = true
            setWeatherData(cached.data)
            sharedLastFetched = {
                lat: cached.latitude,
                lng: cached.longitude,
            }
            setIsInitialLoad(false)
        }

        void hydrateFromCache()

        return () => {
            cancelled = true
        }
    }, [setWeatherData])

    const loadWeather = useCallback(
        async (latitude: number, longitude: number, force = false) => {
            const hasDataForCoords =
                !coordsChanged(latitude, longitude, sharedLastFetched) &&
                weatherData

            if (!force && hasDataForCoords) {
                setIsInitialLoad(false)
                return weatherData
            }

            setIsLoading(true)
            setError(null)

            try {
                const weather = await fetchWeatherDeduped(latitude, longitude)
                if (!mountedRef.current) return weather
                setWeatherData(weather)
                sharedLastFetched = { lat: latitude, lng: longitude }
                return weather
            } catch (err) {
                console.error('Error fetching weather data:', err)
                if (mountedRef.current) {
                    setError(
                        'Failed to fetch weather data. Please try again.'
                    )
                }
                return null
            } finally {
                if (mountedRef.current) {
                    setIsLoading(false)
                    setIsInitialLoad(false)
                }
            }
        },
        [setWeatherData, weatherData]
    )

    useEffect(() => {
        if (!location) return

        const { latitude, longitude } = location.coords

        if (
            weatherData &&
            !coordsChanged(latitude, longitude, sharedLastFetched)
        ) {
            sharedLastFetched = { lat: latitude, lng: longitude }
            setIsInitialLoad(false)
            return
        }

        void loadWeather(latitude, longitude)
    }, [location?.coords.latitude, location?.coords.longitude, loadWeather])

    const refetch = useCallback(async () => {
        if (!location) return null
        const { latitude, longitude } = location.coords
        return loadWeather(latitude, longitude, true)
    }, [location, loadWeather])

    const isBootstrapping =
        !weatherData &&
        !error &&
        !errorMsg &&
        (isLocating || isLoading || isInitialLoad)

    return {
        weatherData,
        isLoading,
        isInitialLoad,
        isBootstrapping,
        error,
        refetch,
    }
}
