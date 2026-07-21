import * as Location from 'expo-location'
import {
    reverseGeocodePlace,
    type ReverseGeocodePlace,
} from '@/utils/locationFormatting'

const GPS_TIMEOUT_MS = 8_000

function geocodeCacheKey(latitude: number, longitude: number): string {
    return `${latitude.toFixed(3)},${longitude.toFixed(3)}`
}

export interface DeviceLocationDeps {
    requestForegroundPermissionsAsync: typeof Location.requestForegroundPermissionsAsync
    hasServicesEnabledAsync: typeof Location.hasServicesEnabledAsync
    getLastKnownPositionAsync: typeof Location.getLastKnownPositionAsync
    watchPositionAsync: typeof Location.watchPositionAsync
    reverseGeocodePlace: typeof reverseGeocodePlace
}

const defaultDeps: DeviceLocationDeps = {
    requestForegroundPermissionsAsync: Location.requestForegroundPermissionsAsync,
    hasServicesEnabledAsync: Location.hasServicesEnabledAsync,
    getLastKnownPositionAsync: Location.getLastKnownPositionAsync,
    watchPositionAsync: Location.watchPositionAsync,
    reverseGeocodePlace,
}

/**
 * Single-flight GPS acquisition: balanced-accuracy watch, first fix wins,
 * cancelled after 8s. Reverse-geocode names are cached for the session.
 */
export class DeviceLocationService {
    private inFlight: Promise<Location.LocationObject> | null = null
    private activeCancel: (() => void) | null = null
    private readonly geocodeCache = new Map<string, ReverseGeocodePlace>()
    private readonly deps: DeviceLocationDeps

    constructor(deps: Partial<DeviceLocationDeps> = {}) {
        this.deps = { ...defaultDeps, ...deps }
    }

    /** Exposed for tests. */
    get isAcquiring(): boolean {
        return this.inFlight != null
    }

    clearGeocodeCacheForTests(): void {
        this.geocodeCache.clear()
    }

    async reverseGeocodePlaceCached(
        latitude: number,
        longitude: number
    ): Promise<ReverseGeocodePlace> {
        const key = geocodeCacheKey(latitude, longitude)
        const cached = this.geocodeCache.get(key)
        if (cached != null) return cached

        const place = await this.deps.reverseGeocodePlace(latitude, longitude)
        this.geocodeCache.set(key, place)
        return place
    }

    /** @deprecated Prefer reverseGeocodePlaceCached for country codes. */
    async reverseGeocodeCached(
        latitude: number,
        longitude: number
    ): Promise<string> {
        const place = await this.reverseGeocodePlaceCached(latitude, longitude)
        return place.name
    }

    /**
     * Acquire a device fix. Concurrent callers share one in-flight promise
     * unless `force` cancels and starts a new watch.
     */
    acquireFirstFix(options?: {
        force?: boolean
    }): Promise<Location.LocationObject> {
        if (!options?.force && this.inFlight) {
            return this.inFlight
        }

        if (options?.force) {
            this.cancelActive()
        }

        const promise = this.runWatch().finally(() => {
            if (this.inFlight === promise) {
                this.inFlight = null
                this.activeCancel = null
            }
        })
        this.inFlight = promise
        return promise
    }

    cancelActive(): void {
        this.activeCancel?.()
        this.activeCancel = null
        this.inFlight = null
    }

    private runWatch(): Promise<Location.LocationObject> {
        return new Promise((resolve, reject) => {
            let settled = false
            let subscription: Location.LocationSubscription | null = null
            let timeoutId: ReturnType<typeof setTimeout> | null = null

            const settle = (fn: () => void) => {
                if (settled) return
                settled = true
                if (timeoutId) clearTimeout(timeoutId)
                subscription?.remove()
                subscription = null
                this.activeCancel = null
                fn()
            }

            this.activeCancel = () => {
                settle(() => {
                    reject(new Error('GPS acquisition cancelled'))
                })
            }

            timeoutId = setTimeout(() => {
                settle(() => {
                    reject(new Error('GPS acquisition timed out'))
                })
            }, GPS_TIMEOUT_MS)

            void this.deps
                .watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.Balanced,
                        distanceInterval: 0,
                        timeInterval: 1000,
                    },
                    (location) => {
                        settle(() => {
                            resolve(location)
                        })
                    }
                )
                .then((sub) => {
                    if (settled) {
                        sub.remove()
                        return
                    }
                    subscription = sub
                })
                .catch((error) => {
                    settle(() => {
                        reject(error)
                    })
                })
        })
    }
}

export const sharedDeviceLocationService = new DeviceLocationService()
