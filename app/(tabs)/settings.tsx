import {
    StyleSheet,
    Image,
    Platform,
    View,
    TextInput,
    Alert,
    Text,
    Pressable,
} from 'react-native'
import { useState, useEffect } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView } from 'react-native-gesture-handler'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { Collapsible } from '@/components/Collapsible'
import { ExternalLink } from '@/components/ExternalLink'
import ParallaxScrollView from '@/components/ParallaxScrollView'
import { ThemedText } from '@/components/ThemedText'
import { ThemedView } from '@/components/ThemedView'
import { IconSymbol } from '@/components/ui/IconSymbol'
import { LocationBar } from '@/components/LocationBar'
import { DroneProfileSelector } from '@/components/DroneProfileSelector'
import {
    WeatherThresholds,
    DEFAULT_WEATHER_THRESHOLDS,
} from '@/types/weatherConfig'
import { WeatherConfigService } from '@/services/weatherConfigService'
import { useWeatherConfig } from '@/contexts/WeatherConfigContext'
import { useLocation } from '@/contexts/LocationContext'
import { SettingsSlider } from '@/components/SettingsSlider'
import { DroneProfile } from '@/types/droneProfiles'

interface SettingItemProps {
    icon: keyof typeof MaterialCommunityIcons.glyphMap
    label: string
    value: string
    onChangeText: (value: string) => void
    unit: string
    sublabel?: string
}

function SettingItem({
    icon,
    label,
    value,
    onChangeText,
    unit,
    sublabel,
}: SettingItemProps) {
    return (
        <View
            className="rounded-xl p-4 mb-3"
            style={{
                backgroundColor: 'rgba(22, 26, 32, 0.6)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.06)',
            }}
        >
            <View className="flex-row items-center mb-2">
                <MaterialCommunityIcons
                    name={icon}
                    size={22}
                    color="#f59e0b"
                />
                <Text
                    className="text-slate-100 text-base font-semibold ml-2"
                    style={{ fontFamily: 'Outfit-SemiBold' }}
                >
                    {label}
                </Text>
            </View>
            {sublabel && (
                <Text
                    className="text-slate-500 text-sm mb-2 ml-9"
                    style={{ fontFamily: 'DMSans' }}
                >
                    {sublabel}
                </Text>
            )}
            <View className="flex-row items-center ml-9">
                <TextInput
                    className="flex-1 text-slate-100 p-2.5 rounded-l-lg text-center text-base"
                    style={{
                        backgroundColor: 'rgba(30, 41, 59, 0.6)',
                        fontFamily: 'DMSans',
                    }}
                    value={value}
                    onChangeText={onChangeText}
                    keyboardType="numeric"
                />
                <View
                    className="px-3 py-2.5 rounded-r-lg"
                    style={{ backgroundColor: 'rgba(51, 65, 85, 0.6)' }}
                >
                    <Text
                        className="text-slate-400 text-base"
                        style={{ fontFamily: 'DMSans' }}
                    >
                        {unit}
                    </Text>
                </View>
            </View>
        </View>
    )
}

export default function SettingsScreen() {
    const [thresholds, setThresholds] = useState<WeatherThresholds>(
        DEFAULT_WEATHER_THRESHOLDS
    )
    const [selectedDroneProfile, setSelectedDroneProfile] =
        useState<DroneProfile | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const { refreshThresholds, updateThresholds } = useWeatherConfig()
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
            setSelectedDroneProfile(null)
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
            setSelectedDroneProfile(profile)
            setThresholds(profile.thresholds)
            await updateThresholds(profile.thresholds)
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
                    selectedProfile={selectedDroneProfile}
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
                        icon="weather-cloudy"
                        label="Maximum Cloud Cover"
                        value={thresholds.weather.maxCloudCover}
                        onValueChange={(value) =>
                            handleValueChange('weather', 'maxCloudCover', value)
                        }
                        minimumValue={0}
                        maximumValue={100}
                        unit="%"
                    />
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

const styles = StyleSheet.create({
    headerImage: {
        color: '#808080',
        bottom: -90,
        left: -35,
        position: 'absolute',
    },
    titleContainer: {
        flexDirection: 'row',
        gap: 8,
    },
})
