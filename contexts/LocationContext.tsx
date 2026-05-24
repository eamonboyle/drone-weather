import React, { createContext, useContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Location from 'expo-location'
import { formatPlaceName } from '@/utils/locationFormatting'

const LAST_LOCATION_KEY = 'last_known_location'

interface LocationContextType {
    location: Location.LocationObject | null
    locationName: string
    errorMsg: string | null
    isLocating: boolean
    updateLocation: (manualLocation?: Location.LocationObject) => Promise<void>
    refreshLocation: () => Promise<void>
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

    async function updateLocationName(
        coords: Location.LocationObjectCoords
    ): Promise<void> {
        try {
            const [place] = await Location.reverseGeocodeAsync({
                latitude: coords.latitude,
                longitude: coords.longitude,
            })

            if (place) {
                setLocationName(formatPlaceName(place))
            } else {
                setLocationName('Location name unavailable')
            }
        } catch (error) {
            console.error('Error reverse geocoding:', error)
            setLocationName('Location name unavailable')
        }
    }

    function applyLocation(nextLocation: Location.LocationObject) {
        setLocation(nextLocation)
        void persistLocation(nextLocation)
        void updateLocationName(nextLocation.coords)
    }

    async function acquireDeviceLocation(forceRefresh = false) {
        setIsLocating(true)
        setErrorMsg(null)

        try {
            const { status } =
                await Location.requestForegroundPermissionsAsync()

            if (status !== 'granted') {
                const persisted = await loadPersistedLocation()
                if (persisted) {
                    applyLocation(persisted)
                    setErrorMsg(
                        'Location permission denied — showing last known location'
                    )
                } else {
                    setErrorMsg('Permission to access location was denied')
                }
                return
            }

            let fastLocation: Location.LocationObject | null = null

            if (!forceRefresh) {
                const persisted = await loadPersistedLocation()
                if (persisted) {
                    fastLocation = persisted
                    applyLocation(persisted)
                }

                if (!fastLocation) {
                    const lastKnown = await Location.getLastKnownPositionAsync({
                        maxAge: 600_000,
                    })
                    if (lastKnown) {
                        fastLocation = lastKnown
                        applyLocation(lastKnown)
                    }
                }
            }

            if (fastLocation) {
                setIsLocating(false)
            }

            const currentLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            })
            applyLocation(currentLocation)
        } catch (error) {
            console.error('Error updating location:', error)
            if (!location) {
                setErrorMsg('Failed to get location')
            }
        } finally {
            setIsLocating(false)
        }
    }

    async function updateLocation(manualLocation?: Location.LocationObject) {
        if (manualLocation) {
            applyLocation(manualLocation)
            setIsLocating(false)
            return
        }

        await acquireDeviceLocation(false)
    }

    async function refreshLocation() {
        await acquireDeviceLocation(true)
    }

    useEffect(() => {
        void updateLocation()
    }, [])

    return (
        <LocationContext.Provider
            value={{
                location,
                locationName,
                errorMsg,
                isLocating,
                updateLocation,
                refreshLocation,
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
