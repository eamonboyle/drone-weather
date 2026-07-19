import { useCallback, useEffect } from 'react'
import { useLocation } from '@/contexts/LocationContext'
import { useWeatherData } from '@/contexts/WeatherDataContext'

/**
 * Thin consumer of the shared weather store. Home, Forecast, Map, and LocationBar
 * all read the same location-keyed freshness/error state.
 */
export function useWeatherForLocation() {
    const { location, isLocating, errorMsg } = useLocation()
    const store = useWeatherData()

    useEffect(() => {
        if (!location) return
        const { latitude, longitude } = location.coords
        void store.loadWeather(latitude, longitude)
    }, [
        location?.coords.latitude,
        location?.coords.longitude,
        store.loadWeather,
    ])

    const refetch = useCallback(async () => {
        if (!location) return null
        const { latitude, longitude } = location.coords
        return store.refetch(latitude, longitude)
    }, [location, store.refetch])

    const isBootstrapping =
        !store.weatherData &&
        !store.error &&
        !errorMsg &&
        (isLocating || store.isLoading || store.isInitialLoad)

    return {
        weatherData: store.weatherData,
        isLoading: store.isLoading,
        isInitialLoad: store.isInitialLoad,
        isBootstrapping,
        error: store.error,
        refetch,
        lastUpdated: store.lastUpdated,
        isShowingCachedData: store.isShowingCachedData,
        isOfflineOrStale: store.isOfflineOrStale,
    }
}
