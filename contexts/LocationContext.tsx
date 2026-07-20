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
import { sharedDeviceLocationService } from '@/services/deviceLocationService'
import { getHasCompletedOnboarding } from '@/services/onboardingService'

const LAST_LOCATION_KEY = 'last_known_location'

interface LocationContextType {
    location: Location.LocationObject | null
    locationName: string
    errorMsg: string | null
    isLocating: boolean
    deviceLocation: Location.LocationObject | null
    deviceLocationName: string
    isDeviceLocating: boolean
    updateLocation: (manualLocation?: Location.LocationObject) => Promise<void>
    refreshLocation: () => Promise<void>
    /** Soft shared GPS for preview only — does not change the active selection. */
    ensureDeviceLocation: () => Promise<void>
}

const LocationContext = createContext<LocationContextType | undefined>(
    undefined
)

async function persistLocation(location: Location.LocationObject) {
    try {
        await AsyncStorage.setItem(LAST_LOCATION_KEY, JSON.stringify(location))
    } catch (error) {
        console.error('Error persisting location:', error)
    }
}

async function loadPersistedLocation(): Promise<Location.LocationObject | null> {
    try {
        const stored = await AsyncStorage.getItem(LAST_LOCATION_KEY)
        return stored ? JSON.parse(stored) : null
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
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [isLocating, setIsLocating] = useState(true)
    const [deviceLocation, setDeviceLocation] =
        useState<Location.LocationObject | null>(null)
    const [deviceLocationName, setDeviceLocationName] = useState('')
    const [isDeviceLocating, setIsDeviceLocating] = useState(false)
    const isManualSelectionRef = useRef(false)
    const acquireGenerationRef = useRef(0)
    const activeNameTokenRef = useRef(0)
    const deviceNameTokenRef = useRef(0)

    const resolveName = useCallback(
        async (coords: Location.LocationObjectCoords): Promise<string> => {
            try {
                return await sharedDeviceLocationService.reverseGeocodeCached(
                    coords.latitude,
                    coords.longitude
                )
            } catch (error) {
                console.error('Error reverse geocoding:', error)
                return 'Location name unavailable'
            }
        },
        []
    )

    const applyActiveLocation = useCallback(
        (nextLocation: Location.LocationObject, name?: string) => {
            setLocation(nextLocation)
            void persistLocation(nextLocation)
            if (name != null) {
                setLocationName(name)
                return
            }
            const token = ++activeNameTokenRef.current
            void resolveName(nextLocation.coords).then((resolved) => {
                if (token === activeNameTokenRef.current) {
                    setLocationName(resolved)
                }
            })
        },
        [resolveName]
    )

    const applyDeviceLocation = useCallback(
        (nextLocation: Location.LocationObject, name?: string) => {
            setDeviceLocation(nextLocation)
            if (name != null) {
                setDeviceLocationName(name)
                return
            }
            const token = ++deviceNameTokenRef.current
            void resolveName(nextLocation.coords).then((resolved) => {
                if (token === deviceNameTokenRef.current) {
                    setDeviceLocationName(resolved)
                }
            })
        },
        [resolveName]
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
                        const persisted = await loadPersistedLocation()
                        if (!isCurrent()) return
                        if (persisted) {
                            applyActiveLocation(persisted)
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
                        const persisted = await loadPersistedLocation()
                        if (!isCurrent()) return
                        if (persisted) {
                            applyActiveLocation(persisted)
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
                    const persisted = await loadPersistedLocation()
                    if (!isCurrent()) return
                    if (persisted) {
                        activeFallback = persisted
                        if (!isManualSelectionRef.current) {
                            applyActiveLocation(persisted)
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

                    const name = await resolveName(currentLocation.coords)
                    if (!isCurrent()) return

                    applyDeviceLocation(currentLocation, name)

                    // Only replace the active selection when this acquire is meant
                    // for the active location and the user has not picked manually
                    // since acquire started (force refresh always wins).
                    if (
                        applyToActive &&
                        (force || !isManualSelectionRef.current)
                    ) {
                        isManualSelectionRef.current = false
                        applyActiveLocation(currentLocation, name)
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
        [applyActiveLocation, applyDeviceLocation, resolveName]
    )

    async function updateLocation(manualLocation?: Location.LocationObject) {
        if (manualLocation) {
            isManualSelectionRef.current = true
            applyActiveLocation(manualLocation)
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
