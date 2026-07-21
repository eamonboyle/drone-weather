import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Location from 'expo-location'
import { normalizeCountryCode } from '@/constants/mapConfig'
import { sharedDeviceLocationService } from '@/services/deviceLocationService'
import { getHasCompletedOnboarding } from '@/services/onboardingService'

/** Legacy key: bare Location.LocationObject JSON. */
const LEGACY_LOCATION_KEY = 'last_known_location'
/** Atomic active location: coords + name + ISO country. */
const ACTIVE_LOCATION_KEY = 'last_active_location_v2'

export interface ActiveLocation {
    location: Location.LocationObject
    name: string
    countryCode: string | null
}

export interface UpdateLocationMeta {
    name?: string
    countryCode?: string | null
}

interface LocationContextType {
    location: Location.LocationObject | null
    locationName: string
    locationCountryCode: string | null
    errorMsg: string | null
    isLocating: boolean
    deviceLocation: Location.LocationObject | null
    deviceLocationName: string
    isDeviceLocating: boolean
    updateLocation: (
        manualLocation?: Location.LocationObject,
        meta?: UpdateLocationMeta
    ) => Promise<void>
    refreshLocation: () => Promise<void>
    /** Soft shared GPS for preview only — does not change the active selection. */
    ensureDeviceLocation: () => Promise<void>
}

const LocationContext = createContext<LocationContextType | undefined>(
    undefined
)

function isLocationObject(value: unknown): value is Location.LocationObject {
    if (!value || typeof value !== 'object') return false
    const coords = (value as Location.LocationObject).coords
    return (
        coords != null &&
        typeof coords.latitude === 'number' &&
        typeof coords.longitude === 'number'
    )
}

function parseActiveLocation(raw: string): ActiveLocation | null {
    try {
        const parsed: unknown = JSON.parse(raw)
        if (!parsed || typeof parsed !== 'object') return null

        // New shape: { location, name, countryCode }
        if ('location' in parsed) {
            const record = parsed as {
                location?: unknown
                name?: unknown
                countryCode?: unknown
            }
            if (!isLocationObject(record.location)) return null
            return {
                location: record.location,
                name: typeof record.name === 'string' ? record.name : '',
                countryCode: normalizeCountryCode(
                    typeof record.countryCode === 'string'
                        ? record.countryCode
                        : null
                ),
            }
        }

        // Legacy shape: bare LocationObject
        if (isLocationObject(parsed)) {
            return {
                location: parsed,
                name: '',
                countryCode: null,
            }
        }

        return null
    } catch {
        return null
    }
}

async function persistActiveLocation(active: ActiveLocation): Promise<void> {
    try {
        await AsyncStorage.setItem(ACTIVE_LOCATION_KEY, JSON.stringify(active))
        // Keep legacy key in sync for older readers during rollout.
        await AsyncStorage.setItem(
            LEGACY_LOCATION_KEY,
            JSON.stringify(active.location)
        )
    } catch (error) {
        console.error('Error persisting location:', error)
    }
}

async function loadPersistedActiveLocation(): Promise<ActiveLocation | null> {
    try {
        const stored = await AsyncStorage.getItem(ACTIVE_LOCATION_KEY)
        if (stored) {
            const active = parseActiveLocation(stored)
            if (active) return active
        }

        const legacy = await AsyncStorage.getItem(LEGACY_LOCATION_KEY)
        if (!legacy) return null
        const migrated = parseActiveLocation(legacy)
        if (migrated) {
            await persistActiveLocation(migrated)
        }
        return migrated
    } catch (error) {
        console.error('Error loading persisted location:', error)
        return null
    }
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
    const [location, setLocation] = useState<Location.LocationObject | null>(
        null
    )
    const [locationName, setLocationName] = useState<string>('')
    const [locationCountryCode, setLocationCountryCode] = useState<
        string | null
    >(null)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [isLocating, setIsLocating] = useState(true)
    const [deviceLocation, setDeviceLocation] =
        useState<Location.LocationObject | null>(null)
    const [deviceLocationName, setDeviceLocationName] = useState('')
    const [isDeviceLocating, setIsDeviceLocating] = useState(false)
    const isManualSelectionRef = useRef(false)
    const acquireGenerationRef = useRef(0)
    const activePlaceTokenRef = useRef(0)
    const deviceNameTokenRef = useRef(0)

    const applyActiveLocation = useCallback(
        (
            nextLocation: Location.LocationObject,
            meta?: UpdateLocationMeta
        ) => {
            setLocation(nextLocation)

            const hasName = meta?.name != null
            const hasCountry = meta != null && 'countryCode' in meta
            const explicitName = hasName ? meta.name! : null
            const explicitCountry = hasCountry
                ? normalizeCountryCode(meta.countryCode ?? null)
                : undefined

            if (explicitName != null) setLocationName(explicitName)
            if (explicitCountry !== undefined) {
                setLocationCountryCode(explicitCountry)
            }

            if (explicitName != null && explicitCountry !== undefined) {
                void persistActiveLocation({
                    location: nextLocation,
                    name: explicitName,
                    countryCode: explicitCountry,
                })
                return
            }

            const token = ++activePlaceTokenRef.current
            void sharedDeviceLocationService
                .reverseGeocodePlaceCached(
                    nextLocation.coords.latitude,
                    nextLocation.coords.longitude
                )
                .then((place) => {
                    if (token !== activePlaceTokenRef.current) return
                    const nextName = explicitName ?? place.name
                    const nextCountry =
                        explicitCountry !== undefined
                            ? explicitCountry
                            : place.countryCode
                    setLocationName(nextName)
                    setLocationCountryCode(nextCountry)
                    void persistActiveLocation({
                        location: nextLocation,
                        name: nextName,
                        countryCode: nextCountry,
                    })
                })
                .catch((error) => {
                    console.error('Error reverse geocoding:', error)
                    if (token !== activePlaceTokenRef.current) return
                    if (explicitName == null) {
                        setLocationName('Location name unavailable')
                    }
                    void persistActiveLocation({
                        location: nextLocation,
                        name: explicitName ?? 'Location name unavailable',
                        countryCode:
                            explicitCountry !== undefined
                                ? explicitCountry
                                : null,
                    })
                })
        },
        []
    )

    const applyDeviceLocation = useCallback(
        (nextLocation: Location.LocationObject, name?: string) => {
            setDeviceLocation(nextLocation)
            if (name != null) {
                setDeviceLocationName(name)
                return
            }
            const token = ++deviceNameTokenRef.current
            void sharedDeviceLocationService
                .reverseGeocodePlaceCached(
                    nextLocation.coords.latitude,
                    nextLocation.coords.longitude
                )
                .then((place) => {
                    if (token === deviceNameTokenRef.current) {
                        setDeviceLocationName(place.name)
                    }
                })
                .catch((error) => {
                    console.error('Error reverse geocoding:', error)
                })
        },
        []
    )

    const acquireDeviceLocation = useCallback(
        async (options?: { force?: boolean; applyToActive?: boolean }) => {
            const force = options?.force ?? false
            const applyToActive = options?.applyToActive ?? true
            const generation = ++acquireGenerationRef.current

            setIsDeviceLocating(true)
            if (applyToActive) {
                setIsLocating(true)
                setErrorMsg(null)
            }

            let activeFallback: Location.LocationObject | null = null
            let deviceFallback: Location.LocationObject | null = null

            const isCurrent = () =>
                generation === acquireGenerationRef.current

            try {
                const { status } =
                    await Location.requestForegroundPermissionsAsync()
                if (!isCurrent()) return

                if (status !== 'granted') {
                    if (applyToActive) {
                        const persisted = await loadPersistedActiveLocation()
                        if (!isCurrent()) return
                        if (persisted) {
                            applyActiveLocation(persisted.location, {
                                name: persisted.name || undefined,
                                countryCode: persisted.countryCode,
                            })
                            setErrorMsg(
                                'Location permission denied — showing last known location'
                            )
                        } else {
                            setErrorMsg(
                                'Permission to access location was denied'
                            )
                        }
                    }
                    setDeviceLocationName('Location access needed')
                    return
                }

                const servicesEnabled =
                    await Location.hasServicesEnabledAsync()
                if (!isCurrent()) return

                if (!servicesEnabled) {
                    if (applyToActive) {
                        const persisted = await loadPersistedActiveLocation()
                        if (!isCurrent()) return
                        if (persisted) {
                            applyActiveLocation(persisted.location, {
                                name: persisted.name || undefined,
                                countryCode: persisted.countryCode,
                            })
                            setErrorMsg(
                                'Location services are off — showing last known location'
                            )
                        } else {
                            setErrorMsg(
                                'Location services are off. Enable them or pick a location manually.'
                            )
                        }
                    }
                    setDeviceLocationName('Unable to detect location')
                    return
                }

                // Active fallback may use persisted last selection; device preview
                // must only use real GPS last-known / fresh fix (never manual persist).
                if (applyToActive && !force) {
                    const persisted = await loadPersistedActiveLocation()
                    if (!isCurrent()) return
                    if (persisted) {
                        activeFallback = persisted.location
                        if (!isManualSelectionRef.current) {
                            applyActiveLocation(persisted.location, {
                                name: persisted.name || undefined,
                                countryCode: persisted.countryCode,
                            })
                        }
                    }
                }

                const lastKnown = await Location.getLastKnownPositionAsync({
                    maxAge: 600_000,
                })
                if (!isCurrent()) return

                if (lastKnown) {
                    deviceFallback = lastKnown
                    applyDeviceLocation(lastKnown)
                    if (
                        applyToActive &&
                        !force &&
                        !activeFallback &&
                        !isManualSelectionRef.current
                    ) {
                        activeFallback = lastKnown
                        applyActiveLocation(lastKnown)
                    }
                }

                if (activeFallback && applyToActive) {
                    setIsLocating(false)
                }

                try {
                    const currentLocation =
                        await sharedDeviceLocationService.acquireFirstFix({
                            force,
                        })
                    if (!isCurrent()) return

                    const place =
                        await sharedDeviceLocationService.reverseGeocodePlaceCached(
                            currentLocation.coords.latitude,
                            currentLocation.coords.longitude
                        )
                    if (!isCurrent()) return

                    applyDeviceLocation(currentLocation, place.name)

                    // Only replace the active selection when this acquire is meant
                    // for the active location and the user has not picked manually
                    // since acquire started (force refresh always wins).
                    if (
                        applyToActive &&
                        (force || !isManualSelectionRef.current)
                    ) {
                        isManualSelectionRef.current = false
                        applyActiveLocation(currentLocation, {
                            name: place.name,
                            countryCode: place.countryCode,
                        })
                    }
                } catch {
                    if (!isCurrent()) return

                    if (deviceFallback) {
                        // Keep GPS last-known on device; do not promote persisted manual.
                        return
                    }

                    const lateLastKnown =
                        await Location.getLastKnownPositionAsync()
                    if (!isCurrent()) return

                    if (lateLastKnown) {
                        applyDeviceLocation(lateLastKnown)
                        if (
                            applyToActive &&
                            !isManualSelectionRef.current
                        ) {
                            applyActiveLocation(lateLastKnown)
                        }
                        return
                    }

                    if (applyToActive) {
                        setErrorMsg(
                            'Current location is unavailable. Enable location services or pick a place manually.'
                        )
                    }
                    setDeviceLocationName('Unable to detect location')
                }
            } catch (error) {
                console.error('Error updating location:', error)
                if (isCurrent() && applyToActive && !activeFallback) {
                    setErrorMsg('Failed to get location')
                }
            } finally {
                if (!isCurrent()) return
                setIsDeviceLocating(false)
                if (applyToActive) {
                    setIsLocating(false)
                }
            }
        },
        [applyActiveLocation, applyDeviceLocation]
    )

    async function updateLocation(
        manualLocation?: Location.LocationObject,
        meta?: UpdateLocationMeta
    ) {
        if (manualLocation) {
            isManualSelectionRef.current = true
            applyActiveLocation(manualLocation, meta)
            setIsLocating(false)
            return
        }

        isManualSelectionRef.current = false
        await acquireDeviceLocation({ force: false, applyToActive: true })
    }

    async function refreshLocation() {
        isManualSelectionRef.current = false
        await acquireDeviceLocation({ force: true, applyToActive: true })
    }

    const ensureDeviceLocation = useCallback(async () => {
        if (deviceLocation || isDeviceLocating) return
        await acquireDeviceLocation({ force: false, applyToActive: false })
    }, [acquireDeviceLocation, deviceLocation, isDeviceLocating])

    useEffect(() => {
        let cancelled = false

        async function bootstrap() {
            const hasCompletedOnboarding = await getHasCompletedOnboarding()
            if (cancelled) return

            // Defer the system permission prompt until onboarding's Location step
            // (or a later launch after onboarding is complete).
            if (!hasCompletedOnboarding) {
                setIsLocating(false)
                return
            }

            await updateLocation()
        }

        void bootstrap()
        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap once
    }, [])

    return (
        <LocationContext.Provider
            value={{
                location,
                locationName,
                locationCountryCode,
                errorMsg,
                isLocating,
                deviceLocation,
                deviceLocationName,
                isDeviceLocating,
                updateLocation,
                refreshLocation,
                ensureDeviceLocation,
            }}
        >
            {children}
        </LocationContext.Provider>
    )
}

export function useLocation() {
    const context = useContext(LocationContext)
    if (context === undefined) {
        throw new Error('useLocation must be used within a LocationProvider')
    }
    return context
}
