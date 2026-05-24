import {
    View,
    Text,
    Pressable,
    Alert,
    ScrollView,
} from 'react-native'
import { useState, useEffect } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { LocationBar } from '@/components/LocationBar'
import { DroneProfileSelector } from '@/components/DroneProfileSelector'
import {
    WeatherThresholds,
    DEFAULT_WEATHER_THRESHOLDS,
} from '@/types/weatherConfig'
import { WeatherConfigService } from '@/services/weatherConfigService'
import {
    useWeatherConfig,
    thresholdsMatch,
} from '@/contexts/WeatherConfigContext'
import { useLocation } from '@/contexts/LocationContext'
import { SettingsSlider } from '@/components/SettingsSlider'
import { DroneProfile } from '@/types/droneProfiles'

export default function SettingsScreen() {
    const [thresholds, setThresholds] = useState<WeatherThresholds>(
        DEFAULT_WEATHER_THRESHOLDS
    )
    const [isLoading, setIsLoading] = useState(true)
    const {
        selectedProfile,
        updateThresholds,
        setSelectedProfile,
        clearSelectedProfile,
    } = useWeatherConfig()
    const { locationName } = useLocation()

    useEffect(() => {
        loadThresholds()
    }, [])

    const loadThresholds = async () => {
        try {
            const loadedThresholds = await WeatherConfigService.getThresholds()
            setThresholds(loadedThresholds)
        } catch (error) {
            console.error('Error loading thresholds:', error)
            Alert.alert('Error', 'Failed to load weather thresholds')
            setThresholds(DEFAULT_WEATHER_THRESHOLDS)
        } finally {
            setIsLoading(false)
        }
    }

    const handleReset = async () => {
        try {
            const defaultThresholds =
                await WeatherConfigService.resetToDefaults()
            setThresholds(defaultThresholds)
            await clearSelectedProfile()
            await updateThresholds(defaultThresholds)
            Alert.alert('Success', 'Weather thresholds reset to defaults')
        } catch (error) {
            console.error('Error resetting thresholds:', error)
            Alert.alert('Error', 'Failed to reset weather thresholds')
            setThresholds(DEFAULT_WEATHER_THRESHOLDS)
        }
    }

    const handleDroneProfileSelect = async (profile: DroneProfile) => {
        try {
            setThresholds(profile.thresholds)
            await setSelectedProfile(profile)
            Alert.alert('Success', `Applied ${profile.name} profile settings`)
        } catch (error) {
            console.error('Error applying drone profile:', error)
            Alert.alert('Error', 'Failed to apply drone profile settings')
        }
    }

    const handleValueChange = (
        category: keyof WeatherThresholds,
        field: string,
        value: number | string
    ) => {
        const newThresholds = {
            ...thresholds,
            [category]: {
                ...thresholds[category],
                [field]: value,
            },
        }
        setThresholds(newThresholds)
        updateThresholds(newThresholds)

        if (
            selectedProfile &&
            !thresholdsMatch(newThresholds, selectedProfile.thresholds)
        ) {
            clearSelectedProfile()
        }
    }

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-background">
                <View className="flex-1 justify-center items-center">
                    <Text
                        className="text-slate-400 text-lg"
                        style={{ fontFamily: 'DMSans' }}
                    >
                        Loading settings...
                    </Text>
                </View>
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView className="flex-1 bg-background">
            <LocationBar locationName={locationName || 'Select Location'} />
            <ScrollView className="flex-1 px-4 pt-4">
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
                        value={thresholds.temperature.min}
                        onValueChange={(value) =>
                            handleValueChange('temperature', 'min', value)
                        }
                        minimumValue={0}
                        maximumValue={100}
                        units={['celsius', 'fahrenheit']}
                        selectedUnit={thresholds.temperature.unit}
                        onUnitChange={(unit) =>
                            handleValueChange('temperature', 'unit', unit)
                        }
                        unit="°"
                    />
                    <SettingsSlider
                        icon="thermometer"
                        label="Maximum Temperature"
                        value={thresholds.temperature.max}
                        onValueChange={(value) =>
                            handleValueChange('temperature', 'max', value)
                        }
                        minimumValue={0}
                        maximumValue={100}
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
                        value={thresholds.windSpeed.max}
                        onValueChange={(value) =>
                            handleValueChange('windSpeed', 'max', value)
                        }
                        minimumValue={0}
                        maximumValue={100}
                        units={['kmh', 'mph']}
                        selectedUnit={thresholds.windSpeed.unit}
                        onUnitChange={(unit) =>
                            handleValueChange('windSpeed', 'unit', unit)
                        }
                    />
                    <SettingsSlider
                        icon="weather-windy-variant"
                        label="Maximum Wind Gust"
                        value={thresholds.windGust.max}
                        onValueChange={(value) =>
                            handleValueChange('windGust', 'max', value)
                        }
                        minimumValue={0}
                        maximumValue={100}
                        unit={thresholds.windSpeed.unit}
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
                        value={thresholds.visibility.min}
                        onValueChange={(value) =>
                            handleValueChange('visibility', 'min', value)
                        }
                        minimumValue={0}
                        maximumValue={50}
                        step={5}
                        units={['kilometers', 'miles']}
                        selectedUnit={thresholds.visibility.unit}
                        onUnitChange={(unit) =>
                            handleValueChange('visibility', 'unit', unit)
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
                        value={thresholds.weather.maxPrecipitationProbability}
                        onValueChange={(value) =>
                            handleValueChange(
                                'weather',
                                'maxPrecipitationProbability',
                                value
                            )
                        }
                        minimumValue={0}
                        maximumValue={100}
                        unit="%"
                    />
                </View>

                <View className="flex-row justify-center mb-6 mt-4">
                    <Pressable
                        className="px-6 py-3.5 rounded-xl flex-row items-center justify-center"
                        style={{
                            backgroundColor: 'rgba(127, 29, 29, 0.6)',
                            borderWidth: 1,
                            borderColor: 'rgba(239, 68, 68, 0.3)',
                        }}
                        onPress={handleReset}
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
