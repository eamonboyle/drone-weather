import {
    View,
    Text,
    Pressable,
    Alert,
    ScrollView,
    ActivityIndicator,
} from 'react-native'
import { useState, useEffect, useRef, useCallback } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import * as Location from 'expo-location'

import { LocationBar } from '@/components/LocationBar'
import { DroneProfileSelector } from '@/components/DroneProfileSelector'
import {
    WeatherThresholds,
    DEFAULT_WEATHER_THRESHOLDS,
} from '@/types/weatherConfig'
import { WeatherConfigService } from '@/services/weatherConfigService'
import { WeatherCacheService } from '@/services/weatherCacheService'
import {
    useWeatherConfig,
    thresholdsMatch,
} from '@/contexts/WeatherConfigContext'
import { useLocation } from '@/contexts/LocationContext'
import { SettingsSlider } from '@/components/SettingsSlider'
import { DroneProfile } from '@/types/droneProfiles'
import { convertThresholdsOnUnitChange } from '@/utils/unitConversion'
import { WEATHER_SOURCE_OPEN_METEO } from '@/types/weather'
import { Theme } from '@/constants/Theme'

export default function SettingsScreen() {
    const [draft, setDraft] = useState<WeatherThresholds>(
        DEFAULT_WEATHER_THRESHOLDS
    )
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [permissionStatus, setPermissionStatus] = useState<string>('unknown')
    const [cacheAgeLabel, setCacheAgeLabel] = useState<string>('No cache')
    const saveQueue = useRef(Promise.resolve())
    const draftRef = useRef(draft)
    const {
        selectedProfile,
        updateThresholds,
        setSelectedProfile,
        clearSelectedProfile,
        thresholds: contextThresholds,
    } = useWeatherConfig()
    const { locationName, location } = useLocation()

    const loadThresholds = useCallback(async () => {
        try {
            const loadedThresholds = await WeatherConfigService.getThresholds()
            setDraft(loadedThresholds)
        } catch (error) {
            console.error('Error loading thresholds:', error)
            Alert.alert('Error', 'Failed to load weather thresholds')
            setDraft(DEFAULT_WEATHER_THRESHOLDS)
        } finally {
            setIsLoading(false)
        }
    }, [])

    const refreshDataSection = useCallback(async () => {
        try {
            const permission = await Location.getForegroundPermissionsAsync()
            setPermissionStatus(permission.status)

            const status = await WeatherCacheService.getCacheStatus({
                latitude: location?.coords.latitude,
                longitude: location?.coords.longitude,
            })
            if (!status.hasCache || status.timestamp === null) {
                setCacheAgeLabel('No cached weather')
                return
            }
            if (status.isExpired) {
                setCacheAgeLabel('Cache expired')
                return
            }
            const ageMin = Math.round(
                (Date.now() - status.timestamp) / 60_000
            )
            setCacheAgeLabel(
                ageMin < 1
                    ? 'Fresh (just now)'
                    : `${ageMin} min old · ${status.entryCount} location(s)`
            )
        } catch {
            setCacheAgeLabel('Unable to read cache')
        }
    }, [location?.coords.latitude, location?.coords.longitude])

    useEffect(() => {
        void loadThresholds()
        void refreshDataSection()
    }, [loadThresholds, refreshDataSection])

    useEffect(() => {
        setDraft(contextThresholds)
    }, [contextThresholds])

    useEffect(() => {
        draftRef.current = draft
    }, [draft])

    const persistDraft = (next: WeatherThresholds) => {
        saveQueue.current = saveQueue.current
            .then(async () => {
                const { isValid, errors } =
                    await WeatherConfigService.validateThresholds(next)
                if (!isValid) {
                    console.warn('Threshold validation failed:', errors)
                    Alert.alert(
                        'Invalid settings',
                        errors.join('\n') || 'Check your threshold values.'
                    )
                    return
                }
                setIsSaving(true)
                await updateThresholds(next)
            })
            .catch((error) => {
                console.error('Error saving thresholds:', error)
            })
            .finally(() => {
                setIsSaving(false)
            })
    }

    const handleReset = async () => {
        try {
            const defaultThresholds =
                await WeatherConfigService.resetToDefaults()
            setDraft(defaultThresholds)
            await clearSelectedProfile()
            await updateThresholds(defaultThresholds)
            Alert.alert('Success', 'Weather thresholds reset to defaults')
        } catch (error) {
            console.error('Error resetting thresholds:', error)
            Alert.alert('Error', 'Failed to reset weather thresholds')
            setDraft(DEFAULT_WEATHER_THRESHOLDS)
        }
    }

    const handleDroneProfileSelect = async (profile: DroneProfile) => {
        try {
            setDraft(profile.thresholds)
            await setSelectedProfile(profile)
            Alert.alert('Success', `Applied ${profile.name} profile settings`)
        } catch (error) {
            console.error('Error applying drone profile:', error)
            Alert.alert('Error', 'Failed to apply drone profile settings')
        }
    }

    const normalizeDraft = (next: WeatherThresholds): WeatherThresholds => {
        if (next.temperature.min < next.temperature.max) return next
        return {
            ...next,
            temperature: {
                ...next.temperature,
                min: Math.min(
                    next.temperature.min,
                    next.temperature.max - 1
                ),
                max: Math.max(
                    next.temperature.max,
                    next.temperature.min + 1
                ),
            },
        }
    }

    /** Update UI during drag without writing storage. */
    const handleDraftValueChange = (
        category: keyof WeatherThresholds,
        field: string,
        value: number | string
    ) => {
        setDraft((prev) => {
            const next = normalizeDraft({
                ...prev,
                [category]: {
                    ...prev[category],
                    [field]: value,
                },
            })
            draftRef.current = next
            return next
        })
    }

    /** Validate + persist when the user finishes sliding. */
    const handleValueCommit = (
        category: keyof WeatherThresholds,
        field: string,
        value: number | string
    ) => {
        const base = draftRef.current
        const next = normalizeDraft({
            ...base,
            [category]: {
                ...base[category],
                [field]: value,
            },
        })
        draftRef.current = next
        setDraft(next)
        persistDraft(next)

        if (
            selectedProfile &&
            !thresholdsMatch(next, selectedProfile.thresholds)
        ) {
            void clearSelectedProfile()
        }
    }

    const handleUnitChange = (
        category: 'temperature' | 'windSpeed' | 'visibility',
        unit: string
    ) => {
        const next = convertThresholdsOnUnitChange(
            draftRef.current,
            category,
            unit
        )
        draftRef.current = next
        setDraft(next)
        persistDraft(next)

        if (
            selectedProfile &&
            !thresholdsMatch(next, selectedProfile.thresholds)
        ) {
            void clearSelectedProfile()
        }
    }

    const handleClearCache = () => {
        Alert.alert(
            'Clear weather cache',
            'Remove all cached weather data for every location?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: async () => {
                        await WeatherCacheService.clearCache()
                        await refreshDataSection()
                        Alert.alert('Cleared', 'Weather cache removed')
                    },
                },
            ]
        )
    }

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-background">
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator color={Theme.colors.accent} />
                    <Text
                        className="text-slate-400 text-lg mt-3"
                        style={{ fontFamily: 'DMSans' }}
                    >
                        Loading settings...
                    </Text>
                </View>
            </SafeAreaView>
        )
    }

    const appVersion =
        Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.0.0'

    return (
        <SafeAreaView className="flex-1 bg-background">
            <LocationBar locationName={locationName || 'Select Location'} />
            <ScrollView className="flex-1 px-4 pt-4">
                {isSaving && (
                    <Text
                        className="text-slate-500 text-xs mb-2"
                        style={{ fontFamily: 'DMSans' }}
                    >
                        Saving…
                    </Text>
                )}

                <DroneProfileSelector
                    selectedProfile={selectedProfile}
                    onSelectProfile={handleDroneProfileSelect}
                />

                <View className="mt-4 mb-2">
                    <Text
                        className="text-amber-500 text-sm mb-1"
                        style={{ fontFamily: 'Outfit-SemiBold' }}
                    >
                        Temperature
                    </Text>
                    <SettingsSlider
                        icon="thermometer"
                        label="Minimum Temperature"
                        value={draft.temperature.min}
                        onValueChange={(value) =>
                            handleDraftValueChange('temperature', 'min', value)
                        }
                        onSlidingComplete={(value) =>
                            handleValueCommit('temperature', 'min', value)
                        }
                        minimumValue={
                            draft.temperature.unit === 'fahrenheit' ? -4 : -20
                        }
                        maximumValue={draft.temperature.max - 1}
                        units={['celsius', 'fahrenheit']}
                        selectedUnit={draft.temperature.unit}
                        onUnitChange={(unit) =>
                            handleUnitChange('temperature', unit)
                        }
                        unit="°"
                    />
                    <SettingsSlider
                        icon="thermometer"
                        label="Maximum Temperature"
                        value={draft.temperature.max}
                        onValueChange={(value) =>
                            handleDraftValueChange('temperature', 'max', value)
                        }
                        onSlidingComplete={(value) =>
                            handleValueCommit('temperature', 'max', value)
                        }
                        minimumValue={draft.temperature.min + 1}
                        maximumValue={
                            draft.temperature.unit === 'fahrenheit' ? 122 : 50
                        }
                        unit="°"
                    />
                </View>

                <View className="mb-2">
                    <Text
                        className="text-amber-500 text-sm mb-1"
                        style={{ fontFamily: 'Outfit-SemiBold' }}
                    >
                        Wind Speed
                    </Text>
                    <SettingsSlider
                        icon="weather-windy"
                        label="Maximum Wind Speed"
                        value={draft.windSpeed.max}
                        onValueChange={(value) =>
                            handleDraftValueChange('windSpeed', 'max', value)
                        }
                        onSlidingComplete={(value) =>
                            handleValueCommit('windSpeed', 'max', value)
                        }
                        minimumValue={0}
                        maximumValue={100}
                        units={['kmh', 'mph']}
                        selectedUnit={draft.windSpeed.unit}
                        onUnitChange={(unit) =>
                            handleUnitChange('windSpeed', unit)
                        }
                    />
                    <SettingsSlider
                        icon="weather-windy-variant"
                        label="Maximum Wind Gust"
                        value={draft.windGust.max}
                        onValueChange={(value) =>
                            handleDraftValueChange('windGust', 'max', value)
                        }
                        onSlidingComplete={(value) =>
                            handleValueCommit('windGust', 'max', value)
                        }
                        minimumValue={0}
                        maximumValue={100}
                        unit={draft.windSpeed.unit}
                    />
                </View>

                <View className="mb-2">
                    <Text
                        className="text-amber-500 text-sm mb-1"
                        style={{ fontFamily: 'Outfit-SemiBold' }}
                    >
                        Visibility
                    </Text>
                    <SettingsSlider
                        icon="eye"
                        label="Minimum Visibility"
                        value={draft.visibility.min}
                        onValueChange={(value) =>
                            handleDraftValueChange('visibility', 'min', value)
                        }
                        onSlidingComplete={(value) =>
                            handleValueCommit('visibility', 'min', value)
                        }
                        minimumValue={0}
                        maximumValue={50}
                        step={1}
                        units={['kilometers', 'miles']}
                        selectedUnit={draft.visibility.unit}
                        onUnitChange={(unit) =>
                            handleUnitChange('visibility', unit)
                        }
                    />
                </View>

                <View className="mb-2">
                    <Text
                        className="text-amber-500 text-sm mb-1"
                        style={{ fontFamily: 'Outfit-SemiBold' }}
                    >
                        Weather
                    </Text>
                    <SettingsSlider
                        icon="weather-pouring"
                        label="Maximum Precipitation Probability"
                        value={draft.weather.maxPrecipitationProbability}
                        onValueChange={(value) =>
                            handleDraftValueChange(
                                'weather',
                                'maxPrecipitationProbability',
                                value
                            )
                        }
                        onSlidingComplete={(value) =>
                            handleValueCommit(
                                'weather',
                                'maxPrecipitationProbability',
                                value
                            )
                        }
                        minimumValue={0}
                        maximumValue={100}
                        unit="%"
                    />
                    <Text
                        className="text-slate-500 text-xs mt-1 mb-2"
                        style={{ fontFamily: 'DMSans' }}
                    >
                        Cloud cover is shown in forecasts for reference only and
                        does not affect flyability.
                    </Text>
                </View>

                <View className="mb-4 mt-2 p-4 rounded-xl bg-surfaceElevated border border-white/5">
                    <Text
                        className="text-amber-500 text-sm mb-3"
                        style={{ fontFamily: 'Outfit-SemiBold' }}
                    >
                        Data & Device
                    </Text>
                    <DataRow
                        label="Location permission"
                        value={permissionStatus}
                    />
                    <DataRow label="Weather cache" value={cacheAgeLabel} />
                    <DataRow
                        label="Weather provider"
                        value={WEATHER_SOURCE_OPEN_METEO}
                    />
                    <DataRow label="App version" value={appVersion} />
                    <Pressable
                        onPress={handleClearCache}
                        accessibilityRole="button"
                        accessibilityLabel="Clear weather cache"
                        className="mt-3 py-3 rounded-xl items-center"
                        style={{
                            backgroundColor: 'rgba(245, 158, 11, 0.15)',
                            minHeight: 44,
                        }}
                    >
                        <Text
                            className="text-amber-300 font-semibold"
                            style={{ fontFamily: 'Outfit-SemiBold' }}
                        >
                            Clear weather cache
                        </Text>
                    </Pressable>
                </View>

                <View className="flex-row justify-center mb-6 mt-2">
                    <Pressable
                        className="px-6 py-3.5 rounded-xl flex-row items-center justify-center"
                        style={{
                            backgroundColor: 'rgba(127, 29, 29, 0.6)',
                            borderWidth: 1,
                            borderColor: 'rgba(239, 68, 68, 0.3)',
                            minHeight: 44,
                        }}
                        onPress={handleReset}
                        accessibilityRole="button"
                        accessibilityLabel="Reset thresholds to defaults"
                    >
                        <MaterialCommunityIcons
                            name="refresh"
                            size={20}
                            color="#fca5a5"
                        />
                        <Text
                            className="text-red-200 text-base font-semibold ml-2"
                            style={{ fontFamily: 'Outfit-SemiBold' }}
                        >
                            Reset to Defaults
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

function DataRow({ label, value }: { label: string; value: string }) {
    return (
        <View className="flex-row justify-between py-2 border-b border-white/5">
            <Text
                className="text-slate-400 text-sm"
                style={{ fontFamily: 'DMSans' }}
            >
                {label}
            </Text>
            <Text
                className="text-slate-200 text-sm"
                style={{ fontFamily: 'DMSans' }}
            >
                {value}
            </Text>
        </View>
    )
}
