import React, {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
} from 'react'
import { WeatherData } from '@/types/weather'
import { WeatherService } from '@/services/weatherService'
import { WeatherCacheService } from '@/services/weatherCacheService'

const LOCATION_DELTA = 0.01

export interface WeatherStoreState {
    latitude: number | null
    longitude: number | null
    weatherData: WeatherData | null
    lastUpdated: number | null
    isShowingCachedData: boolean
    isOfflineOrStale: boolean
    error: string | null
    isLoading: boolean
    isInitialLoad: boolean
}

interface LoadOptions {
    force?: boolean
    /** Skip disk cache and hit the network. */
    bypassCache?: boolean
}

interface WeatherDataContextType extends WeatherStoreState {
    loadWeather: (
        latitude: number,
        longitude: number,
        options?: LoadOptions
    ) => Promise<WeatherData | null>
    refetch: (
        latitude: number,
        longitude: number
    ) => Promise<WeatherData | null>
}

interface FetchResult {
    weather: WeatherData
    fromCache: boolean
}

const INITIAL_STATE: WeatherStoreState = {
    latitude: null,
    longitude: null,
    weatherData: null,
    lastUpdated: null,
    isShowingCachedData: false,
    isOfflineOrStale: false,
    error: null,
    isLoading: false,
    isInitialLoad: true,
}

const WeatherDataContext = createContext<WeatherDataContextType | undefined>(
    undefined
)

function coordsMatch(
    aLat: number,
    aLng: number,
    bLat: number | null | undefined,
    bLng: number | null | undefined
): boolean {
    if (bLat === null || bLat === undefined || bLng === null || bLng === undefined) {
        return false
    }
    return (
        Math.abs(aLat - bLat) <= LOCATION_DELTA &&
        Math.abs(aLng - bLng) <= LOCATION_DELTA
    )
}

function weatherCoordsMatch(
    weather: WeatherData | null,
    latitude: number,
    longitude: number
): boolean {
    if (!weather?.meta) return false
    return coordsMatch(
        latitude,
        longitude,
        weather.meta.latitude,
        weather.meta.longitude
    )
}

function fetchKey(lat: number, lng: number, bypassCache: boolean): string {
    return `${lat.toFixed(4)},${lng.toFixed(4)}:${bypassCache ? 'net' : 'any'}`
}

async function fetchWeather(
    latitude: number,
    longitude: number,
    bypassCache: boolean
): Promise<FetchResult> {
    if (!bypassCache) {
        const cached = await WeatherCacheService.getCachedWeather(
            latitude,
            longitude
        )
        if (cached) {
            return { weather: cached, fromCache: true }
        }
    }

    const weather = await WeatherService.getCurrentWeather(latitude, longitude, {
        bypassCache: true,
    })
    return { weather, fromCache: false }
}

export function WeatherDataProvider({
    children,
}: {
    children: React.ReactNode
}) {
    const [state, setState] = useState<WeatherStoreState>(INITIAL_STATE)
    const stateRef = useRef(state)
    stateRef.current = state
    const requestIdRef = useRef(0)

    const inFlightRef = useRef<{
        key: string
        promise: Promise<FetchResult>
    } | null>(null)

    const loadWeather = useCallback(
        async (
            latitude: number,
            longitude: number,
            options: LoadOptions = {}
        ): Promise<WeatherData | null> => {
            const force = options.force === true
            const bypassCache = options.bypassCache === true
            const current = stateRef.current

            const hasUsableData =
                !force &&
                !bypassCache &&
                current.weatherData &&
                coordsMatch(
                    latitude,
                    longitude,
                    current.latitude,
                    current.longitude
                ) &&
                weatherCoordsMatch(current.weatherData, latitude, longitude) &&
                !current.isOfflineOrStale

            if (hasUsableData) {
                setState((prev) => ({ ...prev, isInitialLoad: false }))
                return current.weatherData
            }

            const requestId = ++requestIdRef.current
            const switchingLocation = !coordsMatch(
                latitude,
                longitude,
                current.latitude,
                current.longitude
            )

            setState((prev) => ({
                ...prev,
                isLoading: true,
                error: null,
                // Clear weather when leaving prior coords so UI never pairs A with B
                weatherData: switchingLocation ? null : prev.weatherData,
                lastUpdated: switchingLocation ? null : prev.lastUpdated,
                isShowingCachedData: switchingLocation
                    ? false
                    : prev.isShowingCachedData,
                isOfflineOrStale: switchingLocation
                    ? false
                    : prev.isOfflineOrStale,
                latitude,
                longitude,
            }))

            const key = fetchKey(latitude, longitude, bypassCache)
            let tracked = inFlightRef.current
            if (!tracked || tracked.key !== key) {
                tracked = {
                    key,
                    promise: fetchWeather(latitude, longitude, bypassCache),
                }
                inFlightRef.current = tracked
            }

            try {
                const { weather, fromCache } = await tracked.promise
                if (requestId !== requestIdRef.current) {
                    return weather
                }

                const fetchedAt = weather.meta?.fetchedAt ?? Date.now()
                setState({
                    latitude,
                    longitude,
                    weatherData: weather,
                    lastUpdated: fetchedAt,
                    isShowingCachedData: fromCache,
                    isOfflineOrStale: false,
                    error: null,
                    isLoading: false,
                    isInitialLoad: false,
                })
                return weather
            } catch (err) {
                console.error('Error fetching weather data:', err)
                if (requestId !== requestIdRef.current) {
                    return null
                }

                setState((prev) => {
                    const weatherStillMatches = weatherCoordsMatch(
                        prev.weatherData,
                        latitude,
                        longitude
                    )
                    return {
                        ...prev,
                        latitude,
                        longitude,
                        isLoading: false,
                        isInitialLoad: false,
                        error: 'Failed to fetch weather data. Please try again.',
                        isShowingCachedData: weatherStillMatches,
                        isOfflineOrStale: weatherStillMatches,
                        // Drop mismatched leftover weather
                        weatherData: weatherStillMatches
                            ? prev.weatherData
                            : null,
                        lastUpdated: weatherStillMatches
                            ? prev.lastUpdated
                            : null,
                    }
                })
                return null
            } finally {
                if (inFlightRef.current?.key === key) {
                    inFlightRef.current = null
                }
            }
        },
        []
    )

    const refetch = useCallback(
        (latitude: number, longitude: number) =>
            loadWeather(latitude, longitude, {
                force: true,
                bypassCache: true,
            }),
        [loadWeather]
    )

    const value = useMemo<WeatherDataContextType>(
        () => ({
            ...state,
            loadWeather,
            refetch,
        }),
        [state, loadWeather, refetch]
    )

    return (
        <WeatherDataContext.Provider value={value}>
            {children}
        </WeatherDataContext.Provider>
    )
}

export function useWeatherData() {
    const context = useContext(WeatherDataContext)
    if (context === undefined) {
        throw new Error(
            'useWeatherData must be used within a WeatherDataProvider'
        )
    }
    return context
}
