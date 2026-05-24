import {
    View,
    Text,
    ActivityIndicator,
    Animated,
    KeyboardAvoidingView,
    Platform,
    Pressable,
} from 'react-native'
import { useEffect, useState, useRef, useMemo } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { DroneFlightConditions } from '@/types/weather'
import { WeatherService } from '@/services/weatherService'
import { LocationBar } from '@/components/LocationBar'
import { WeatherGrid } from '@/components/WeatherGrid'
import { HourSelector } from '@/components/HourSelector'
import { useLocation } from '@/contexts/LocationContext'
import { LinearGradient } from 'expo-linear-gradient'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useWeatherForLocation } from '@/hooks/useWeatherForLocation'
import { useWeatherConfig } from '@/contexts/WeatherConfigContext'
import { DroneFlyabilityService } from '@/services/droneFlyabilityService'
import { NextFlyWindow } from '@/components/NextFlyWindow'

export default function Home() {
    const { locationName, errorMsg, isLocating } = useLocation()
    const { weatherData, isBootstrapping, error, refetch } =
        useWeatherForLocation()
    const { thresholds, selectedProfile } = useWeatherConfig()
    const [selectedHour, setSelectedHour] = useState(0)
    const [flightConditions, setFlightConditions] =
        useState<DroneFlightConditions>({
            isSuitable: false,
            reasons: [],
        })

    const fadeAnim = useRef(new Animated.Value(0)).current
    const translateY = useRef(new Animated.Value(20)).current
    const scaleAnim = useRef(new Animated.Value(0.9)).current

    useEffect(() => {
        if (isBootstrapping) return

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
        ]).start()
    }, [isBootstrapping, fadeAnim, scaleAnim, translateY])

    useEffect(() => {
        if (weatherData) {
            const updateFlightConditions = async () => {
                const conditions = await WeatherService.isDroneFlyable(
                    weatherData,
                    selectedHour
                )
                setFlightConditions(conditions)
            }
            updateFlightConditions()
        }
    }, [weatherData, selectedHour])

    const safeFlyingWindow = useMemo(() => {
        if (!weatherData) return { type: 'none' as const }
        return DroneFlyabilityService.findNextSafeFlyingWindow(
            weatherData.hourlyData,
            thresholds
        )
    }, [weatherData, thresholds])

    const renderLoadingState = () => (
        <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#f59e0b" />
            <Text
                className="text-slate-300 text-lg mt-4"
                style={{ fontFamily: 'DMSans-Medium' }}
            >
                {isLocating
                    ? 'Finding your location...'
                    : 'Loading weather data...'}
            </Text>
        </View>
    )

    const renderErrorState = () => {
        const message = error ?? errorMsg ?? 'Unable to load weather data'
        return (
            <View className="flex-1 justify-center items-center px-6">
                <MaterialCommunityIcons
                    name="cloud-alert"
                    size={48}
                    color="#f59e0b"
                />
                <Text
                    className="text-slate-300 text-base text-center mt-4"
                    style={{ fontFamily: 'DMSans' }}
                >
                    {message}
                </Text>
                <Pressable
                    onPress={() => refetch()}
                    className="mt-4 px-6 py-3 rounded-xl bg-amber-500"
                >
                    <Text
                        className="text-background font-semibold"
                        style={{ fontFamily: 'Outfit-SemiBold' }}
                    >
                        Retry
                    </Text>
                </Pressable>
            </View>
        )
    }

    const renderFlightStatus = () => {
        const gradientColors = flightConditions.isSuitable
            ? (['#065f46', '#047857'] as const)
            : (['#7f1d1d', '#991b1b'] as const)

        return (
            <View className="mb-6">
                <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="p-5 rounded-2xl overflow-hidden"
                    style={{
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.08)',
                    }}
                >
                    <View className="flex-row items-center justify-center">
                        <MaterialCommunityIcons
                            name={
                                flightConditions.isSuitable
                                    ? 'airplane'
                                    : 'airplane-off'
                            }
                            size={28}
                            color="white"
                            style={{ opacity: 0.95 }}
                        />
                        <Text
                            className="text-xl text-white font-bold ml-3"
                            style={{ fontFamily: 'Outfit-SemiBold' }}
                        >
                            {flightConditions.isSuitable
                                ? 'Safe to Fly'
                                : 'Not Safe to Fly'}
                        </Text>
                    </View>
                    {flightConditions.reasons.length > 0 && (
                        <View
                            className="rounded-xl p-4 mt-3"
                            style={{ backgroundColor: 'rgba(0, 0, 0, 0.25)' }}
                        >
                            {flightConditions.reasons.map((reason, index) => (
                                <View
                                    key={index}
                                    className="flex-row items-center mb-2 last:mb-0"
                                >
                                    <MaterialCommunityIcons
                                        name="alert-circle"
                                        size={16}
                                        color="rgba(255, 255, 255, 0.9)"
                                    />
                                    <Text
                                        className="text-white/90 ml-2 flex-1 text-sm"
                                        style={{ fontFamily: 'DMSans' }}
                                    >
                                        {reason}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </LinearGradient>
            </View>
        )
    }

    const renderProfileChip = () => {
        if (!selectedProfile) return null
        return (
            <View
                className="flex-row items-center self-center mb-3 px-3 py-1.5 rounded-full"
                style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.12)',
                    borderWidth: 1,
                    borderColor: 'rgba(245, 158, 11, 0.25)',
                }}
            >
                <MaterialCommunityIcons
                    name="quadcopter"
                    size={14}
                    color="#f59e0b"
                />
                <Text
                    className="text-amber-400 text-xs ml-1.5"
                    style={{ fontFamily: 'DMSans' }}
                >
                    {selectedProfile.name}
                </Text>
            </View>
        )
    }

    const showError =
        !isBootstrapping && (error || errorMsg) && !weatherData

    return (
        <SafeAreaView className="flex-1 bg-background">
            <LocationBar locationName={locationName} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <View className="flex-1 px-4 pt-4">
                    {isBootstrapping ? (
                        renderLoadingState()
                    ) : showError ? (
                        renderErrorState()
                    ) : weatherData ? (
                        <Animated.View
                            style={{
                                flex: 1,
                                opacity: fadeAnim,
                                transform: [{ translateY }],
                            }}
                        >
                            {renderFlightStatus()}
                            {renderProfileChip()}
                            <NextFlyWindow
                                window={safeFlyingWindow}
                                onSelectWindow={setSelectedHour}
                            />
                            <WeatherGrid
                                weatherData={weatherData}
                                selectedClockHour={selectedHour}
                            />
                        </Animated.View>
                    ) : (
                        renderErrorState()
                    )}
                </View>
            </KeyboardAvoidingView>

            {!showError && weatherData && (
                <View className="absolute bottom-0 left-0 right-0 bg-background">
                    <Animated.View
                        style={{
                            opacity: fadeAnim,
                            transform: [{ translateY }],
                        }}
                    >
                        <HourSelector
                            selectedHour={selectedHour}
                            onHourChange={setSelectedHour}
                            className="mb-4"
                        />
                    </Animated.View>
                </View>
            )}
        </SafeAreaView>
    )
}
