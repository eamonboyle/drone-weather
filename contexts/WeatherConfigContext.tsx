import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react'
import {
    WeatherThresholds,
    DEFAULT_WEATHER_THRESHOLDS,
} from '@/types/weatherConfig'
import { WeatherConfigService } from '@/services/weatherConfigService'
import { DroneProfile, DRONE_PROFILES } from '@/types/droneProfiles'

interface WeatherConfigContextType {
    thresholds: WeatherThresholds
    selectedProfile: DroneProfile | null
    refreshThresholds: () => Promise<void>
    updateThresholds: (newThresholds: WeatherThresholds) => Promise<void>
    setSelectedProfile: (profile: DroneProfile) => Promise<void>
    clearSelectedProfile: () => Promise<void>
}

const WeatherConfigContext = createContext<
    WeatherConfigContextType | undefined
>(undefined)

function resolveProfile(profileId: string | null): DroneProfile | null {
    if (!profileId) return null
    return DRONE_PROFILES.find((p) => p.id === profileId) ?? null
}

export function WeatherConfigProvider({
    children,
}: {
    children: React.ReactNode
}) {
    const [thresholds, setThresholds] = useState<WeatherThresholds>(
        DEFAULT_WEATHER_THRESHOLDS
    )
    const [selectedProfile, setSelectedProfileState] =
        useState<DroneProfile | null>(null)

    const refreshThresholds = useCallback(async () => {
        try {
            const [loadedThresholds, profileId] = await Promise.all([
                WeatherConfigService.getThresholds(),
                WeatherConfigService.getSelectedProfileId(),
            ])
            setThresholds(loadedThresholds)
            setSelectedProfileState(resolveProfile(profileId))
        } catch (error) {
            console.error('Error refreshing thresholds:', error)
            setThresholds(DEFAULT_WEATHER_THRESHOLDS)
            setSelectedProfileState(null)
        }
    }, [])

    const updateThresholds = useCallback(
        async (newThresholds: WeatherThresholds) => {
            // Apply immediately so unit toggles don't wait on AsyncStorage.
            setThresholds(newThresholds)
            try {
                await WeatherConfigService.saveThresholds(newThresholds)
            } catch (error) {
                console.error('Error updating thresholds:', error)
                // Keep the optimistic value — snapping back to defaults flashes the UI.
                try {
                    await refreshThresholds()
                } catch {
                    // already logged above
                }
            }
        },
        [refreshThresholds]
    )

    const setSelectedProfile = useCallback(
        async (profile: DroneProfile) => {
            await Promise.all([
                updateThresholds(profile.thresholds),
                WeatherConfigService.saveSelectedProfileId(profile.id),
            ])
            setSelectedProfileState(profile)
        },
        [updateThresholds]
    )

    const clearSelectedProfile = useCallback(async () => {
        await WeatherConfigService.saveSelectedProfileId(null)
        setSelectedProfileState(null)
    }, [])

    useEffect(() => {
        void refreshThresholds()
    }, [refreshThresholds])

    const value = useMemo(
        () => ({
            thresholds,
            selectedProfile,
            refreshThresholds,
            updateThresholds,
            setSelectedProfile,
            clearSelectedProfile,
        }),
        [
            thresholds,
            selectedProfile,
            refreshThresholds,
            updateThresholds,
            setSelectedProfile,
            clearSelectedProfile,
        ]
    )

    return (
        <WeatherConfigContext.Provider value={value}>
            {children}
        </WeatherConfigContext.Provider>
    )
}

export function useWeatherConfig() {
    const context = useContext(WeatherConfigContext)
    if (context === undefined) {
        throw new Error(
            'useWeatherConfig must be used within a WeatherConfigProvider'
        )
    }
    return context
}

export function thresholdsMatch(
    a: WeatherThresholds,
    b: WeatherThresholds
): boolean {
    return JSON.stringify(a) === JSON.stringify(b)
}
