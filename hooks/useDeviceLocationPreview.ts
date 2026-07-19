import { useEffect } from 'react'
import { useLocation } from '@/contexts/LocationContext'

interface DeviceLocationPreview {
    name: string
    isLoading: boolean
    permissionDenied: boolean
}

/**
 * Display-only device location from the shared LocationContext GPS state.
 * Does not request permission, GPS, or reverse geocoding independently.
 */
export function useDeviceLocationPreview(
    enabled: boolean
): DeviceLocationPreview {
    const {
        deviceLocationName,
        isDeviceLocating,
        deviceLocation,
        ensureDeviceLocation,
    } = useLocation()

    useEffect(() => {
        if (!enabled) return
        void ensureDeviceLocation()
    }, [enabled, ensureDeviceLocation])

    const permissionDenied =
        enabled &&
        !isDeviceLocating &&
        !deviceLocation &&
        deviceLocationName === 'Location access needed'

    return {
        name: deviceLocationName,
        isLoading: enabled && (isDeviceLocating || (!deviceLocationName && !permissionDenied)),
        permissionDenied,
    }
}
