import { useEffect, useState } from 'react'
import * as Location from 'expo-location'
import { reverseGeocodePlaceName } from '@/utils/locationFormatting'

interface DeviceLocationPreview {
    name: string
    isLoading: boolean
    permissionDenied: boolean
}

/**
 * Resolves the phone's GPS position for display only — does not change the
 * app's active selected location.
 */
export function useDeviceLocationPreview(
    enabled: boolean
): DeviceLocationPreview {
    const [name, setName] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [permissionDenied, setPermissionDenied] = useState(false)

    useEffect(() => {
        if (!enabled) return

        let cancelled = false

        async function loadDeviceLocation() {
            setIsLoading(true)
            setPermissionDenied(false)

            try {
                const { status } =
                    await Location.requestForegroundPermissionsAsync()

                if (status !== 'granted') {
                    if (!cancelled) {
                        setPermissionDenied(true)
                        setName('Location access needed')
                    }
                    return
                }

                const lastKnown = await Location.getLastKnownPositionAsync({
                    maxAge: 300_000,
                })

                if (lastKnown && !cancelled) {
                    const previewName = await reverseGeocodePlaceName(
                        lastKnown.coords.latitude,
                        lastKnown.coords.longitude
                    )
                    if (!cancelled) setName(previewName)
                }

                try {
                    const current = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Balanced,
                    })

                    if (cancelled) return

                    const currentName = await reverseGeocodePlaceName(
                        current.coords.latitude,
                        current.coords.longitude
                    )
                    if (!cancelled) setName(currentName)
                } catch {
                    // Emulators often have no GPS fix; keep last-known preview if any.
                    if (!cancelled && !lastKnown) {
                        setName('Unable to detect location')
                    }
                }
            } catch {
                if (!cancelled) {
                    setName('Unable to detect location')
                }
            } finally {
                if (!cancelled) setIsLoading(false)
            }
        }

        void loadDeviceLocation()

        return () => {
            cancelled = true
        }
    }, [enabled])

    return { name, isLoading, permissionDenied }
}
