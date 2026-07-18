import { useCallback, useEffect, useRef, useState } from 'react'
import { WeatherService } from '@/services/weatherService'
import { WeatherCacheService } from '@/services/weatherCacheService'
import { DroneFlyabilityService } from '@/services/droneFlyabilityService'
import { useWeatherConfig } from '@/contexts/WeatherConfigContext'
import { useWeatherData } from '@/contexts/WeatherDataContext'
import { useLocation } from '@/contexts/LocationContext'
import {
    findHourlyDataForClockHour,
    getNowClockHour,
    getWeatherUtcOffset,
} from '@/utils/weatherHourUtils'
import { msUntilNextLocationHour } from '@/utils/locationTime'
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

function thresholdsFingerprint(thresholds: WeatherThresholds): string {
    return [
        thresholds.temperature.unit,
        thresholds.temperature.min,
        thresholds.temperature.max,
        thresholds.windSpeed.unit,
        thresholds.windSpeed.max,
        thresholds.windGust.max,
        thresholds.visibility.unit,
        thresholds.visibility.min,
        thresholds.weather.maxPrecipitationProbability,
    ].join(':')
}

function resultCacheKey(
    latitude: number,
    longitude: number,
    weatherStamp: number | null,
    thresholds: WeatherThresholds,
    clockHour: number
): string {
    return [
        coordKey(latitude, longitude),
        weatherStamp ?? 'none',
        clockHour,
        thresholdsFingerprint(thresholds),
    ].join('|')
}

function evaluateFlyability(
    weatherData: WeatherData,
    thresholds: WeatherThresholds
): FlyabilityStatus {
    const hourData = findHourlyDataForClockHour(
        weatherData.hourlyData,
        getNowClockHour(weatherData),
        { utcOffsetSeconds: getWeatherUtcOffset(weatherData) }
    )
    if (!hourData) return 'unavailable'

    const conditions = DroneFlyabilityService.checkFlyingConditions(
        hourData,
        thresholds
    )
    if (conditions.checks.some((c) => c.status === 'unavailable')) {
        return 'unavailable'
    }
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
    const { weatherData, lastUpdated } = useWeatherData()
    const { location } = useLocation()
    const [statusById, setStatusById] = useState<
        Record<string, FlyabilityStatus>
    >({})
    const resolvedRef = useRef<Map<string, FlyabilityStatus>>(new Map())
    const mountedRef = useRef(true)
    const generationRef = useRef(0)
    const [hourTick, setHourTick] = useState(0)

    useEffect(() => {
        mountedRef.current = true
        return () => {
            mountedRef.current = false
        }
    }, [])

    // Invalidate only at the next location-local hour boundary (not every minute)
    useEffect(() => {
        let timeoutId: ReturnType<typeof setTimeout> | null = null
        let cancelled = false

        const schedule = () => {
            const offset = getWeatherUtcOffset(weatherData)
            const delay = msUntilNextLocationHour(offset)
            timeoutId = setTimeout(() => {
                if (cancelled) return
                setHourTick((t) => t + 1)
                schedule()
            }, delay)
        }

        schedule()
        return () => {
            cancelled = true
            if (timeoutId) clearTimeout(timeoutId)
        }
    }, [weatherData?.meta?.utcOffsetSeconds])

    const processLocation = useCallback(
        async (
            item: FlyabilityLocation,
            generation: number
        ): Promise<FlyabilityStatus | null> => {
            if (generation !== generationRef.current) return null

            let data: WeatherData | null = null
            if (
                location &&
                weatherData &&
                coordsMatch(location.coords, item)
            ) {
                data = weatherData
            } else {
                data = await fetchWeatherForLocation(
                    item.latitude,
                    item.longitude
                )
            }

            if (generation !== generationRef.current) return null
            if (!data) return 'unavailable'

            const stamp = data.meta?.fetchedAt ?? lastUpdated
            const clockHour = getNowClockHour(data)
            const key = resultCacheKey(
                item.latitude,
                item.longitude,
                stamp,
                thresholds,
                clockHour
            )

            const cached = resolvedRef.current.get(key)
            if (cached) return cached

            const status = evaluateFlyability(data, thresholds)
            if (generation !== generationRef.current) return null

            resolvedRef.current.set(key, status)
            return status
        },
        [location, weatherData, lastUpdated, thresholds, hourTick]
    )

    useEffect(() => {
        if (!enabled) return

        if (locations.length === 0) {
            setStatusById({})
            return
        }

        const generation = ++generationRef.current
        resolvedRef.current.clear()

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
                if (generation !== generationRef.current) return

                const status = await processLocation(item, generation)
                if (
                    status === null ||
                    generation !== generationRef.current ||
                    !locationIds.has(item.id)
                ) {
                    return
                }

                if (mountedRef.current) {
                    setStatusById((prev) => ({
                        ...prev,
                        [item.id]: status,
                    }))
                }
            }

            while (queue.length > 0 && generation === generationRef.current) {
                while (
                    inFlight.length < MAX_CONCURRENT &&
                    queue.length > 0 &&
                    generation === generationRef.current
                ) {
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
            generationRef.current += 1
        }
    }, [locations, processLocation, enabled])

    const getStatus = useCallback(
        (id: string): FlyabilityStatus => statusById[id] ?? 'loading',
        [statusById]
    )

    return { getStatus }
}
