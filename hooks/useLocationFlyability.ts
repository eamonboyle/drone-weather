import { useCallback, useEffect, useRef, useState } from 'react'
import { WeatherService } from '@/services/weatherService'
import { WeatherCacheService } from '@/services/weatherCacheService'
import { DroneFlyabilityService } from '@/services/droneFlyabilityService'
import { useWeatherConfig } from '@/contexts/WeatherConfigContext'
import { useWeatherData } from '@/contexts/WeatherDataContext'
import { useLocation } from '@/contexts/LocationContext'
import { findHourlyDataForClockHour } from '@/utils/weatherHourUtils'
import { WeatherData } from '@/types/weather'
import { WeatherThresholds } from '@/types/weatherConfig'

export type FlyabilityStatus =
    | 'loading'
    | 'safe'
    | 'not_flyable'
    | 'unavailable'

export interface FlyabilityLocation {
    id: string
    latitude: number
    longitude: number
}

const MAX_CONCURRENT = 3

function coordKey(latitude: number, longitude: number): string {
    return `${latitude.toFixed(4)},${longitude.toFixed(4)}`
}

function coordsMatch(
    a: { latitude: number; longitude: number },
    b: { latitude: number; longitude: number }
): boolean {
    return coordKey(a.latitude, a.longitude) === coordKey(b.latitude, b.longitude)
}

function evaluateFlyability(
    weatherData: WeatherData,
    thresholds: WeatherThresholds
): FlyabilityStatus {
    const hourData = findHourlyDataForClockHour(
        weatherData.hourlyData,
        new Date().getHours()
    )
    if (!hourData) return 'unavailable'

    const conditions = DroneFlyabilityService.checkFlyingConditions(
        hourData,
        thresholds
    )
    return conditions.isSuitable ? 'safe' : 'not_flyable'
}

async function fetchWeatherForLocation(
    latitude: number,
    longitude: number
): Promise<WeatherData | null> {
    try {
        const cached = await WeatherCacheService.getCachedWeather(
            latitude,
            longitude
        )
        if (cached) return cached
        return await WeatherService.getCurrentWeather(latitude, longitude)
    } catch {
        return null
    }
}

export function useLocationFlyability(
    locations: FlyabilityLocation[],
    options: { enabled?: boolean } = {}
) {
    const { enabled = true } = options
    const { thresholds } = useWeatherConfig()
    const { weatherData } = useWeatherData()
    const { location } = useLocation()
    const [statusById, setStatusById] = useState<
        Record<string, FlyabilityStatus>
    >({})
    const resolvedRef = useRef<Map<string, FlyabilityStatus>>(new Map())
    const mountedRef = useRef(true)

    useEffect(() => {
        mountedRef.current = true
        return () => {
            mountedRef.current = false
        }
    }, [])

    const processLocation = useCallback(
        async (item: FlyabilityLocation): Promise<FlyabilityStatus> => {
            const key = coordKey(item.latitude, item.longitude)
            const cached = resolvedRef.current.get(key)
            if (cached && cached !== 'loading') return cached

            if (
                location &&
                weatherData &&
                coordsMatch(location.coords, item)
            ) {
                return evaluateFlyability(weatherData, thresholds)
            }

            const data = await fetchWeatherForLocation(
                item.latitude,
                item.longitude
            )
            if (!data) return 'unavailable'
            return evaluateFlyability(data, thresholds)
        },
        [location, weatherData, thresholds]
    )

    useEffect(() => {
        if (!enabled) return

        if (locations.length === 0) {
            setStatusById({})
            return
        }

        let cancelled = false
        const locationIds = new Set(locations.map((item) => item.id))

        setStatusById((prev) => {
            const next: Record<string, FlyabilityStatus> = {}
            for (const item of locations) {
                next[item.id] = prev[item.id] ?? 'loading'
            }
            return next
        })

        const runQueue = async () => {
            const queue = [...locations]
            const inFlight: Promise<void>[] = []

            const runOne = async (item: FlyabilityLocation) => {
                if (cancelled) return

                const key = coordKey(item.latitude, item.longitude)
                const status = await processLocation(item)
                if (cancelled || !locationIds.has(item.id)) return

                resolvedRef.current.set(key, status)
                if (mountedRef.current) {
                    setStatusById((prev) => ({
                        ...prev,
                        [item.id]: status,
                    }))
                }
            }

            while (queue.length > 0 && !cancelled) {
                while (inFlight.length < MAX_CONCURRENT && queue.length > 0) {
                    const item = queue.shift()!
                    const task = runOne(item).finally(() => {
                        const index = inFlight.indexOf(task)
                        if (index >= 0) inFlight.splice(index, 1)
                    })
                    inFlight.push(task)
                }
                if (inFlight.length > 0) {
                    await Promise.race(inFlight)
                }
            }

            await Promise.all(inFlight)
        }

        void runQueue()

        return () => {
            cancelled = true
        }
    }, [locations, processLocation, enabled])

    const getStatus = useCallback(
        (id: string): FlyabilityStatus => statusById[id] ?? 'loading',
        [statusById]
    )

    return { getStatus }
}
