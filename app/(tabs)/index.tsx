import {
    View,
    Text,
    ActivityIndicator,
    Animated,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    AccessibilityInfo,
} from 'react-native'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useBottomTabBarHeight } from 'expo-router/js-tabs'
import { LocationBar } from '@/components/LocationBar'
import { WeatherGrid } from '@/components/WeatherGrid'
import { HourSelector } from '@/components/HourSelector'
import { useLocation } from '@/contexts/LocationContext'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useFocusAwareFreshnessLabel } from '@/hooks/useFocusAwareFreshnessLabel'
import { useWeatherForLocation } from '@/hooks/useWeatherForLocation'
import { useWeatherConfig } from '@/contexts/WeatherConfigContext'
import { WeatherService } from '@/services/weatherService'
import { DroneFlyabilityService } from '@/services/droneFlyabilityService'
import { NextFlyWindow } from '@/components/NextFlyWindow'
import {
    getNowClockHour,
    getWeatherUtcOffset,
} from '@/utils/weatherHourUtils'
import { Theme } from '@/constants/Theme'
import { WEATHER_SOURCE_OPEN_METEO } from '@/types/weather'
import { DataFreshnessBanner } from '@/components/ui/DataFreshnessBanner'
import { EmptyState, StatusBanner } from '@/components/ui/StatusBanner'

export default function Home() {
    const tabBarHeight = useBottomTabBarHeight()
    const { locationName, errorMsg, isLocating } = useLocation()
    const {
        weatherData,
        isBootstrapping,
        isLoading,
        error,
        refetch,
        lastUpdated,
        isShowingCachedData,
        isOfflineOrStale,
    } = useWeatherForLocation()
    const { thresholds, selectedProfile } = useWeatherConfig()
    const [selectedHour, setSelectedHour] = useState(() => getNowClockHour())
    const [hasInitializedHour, setHasInitializedHour] = useState(false)
    const [refreshing, setRefreshing] = useState(false)
    const [reduceMotion, setReduceMotion] = useState(false)

    const [fadeAnim] = useState(() => new Animated.Value(0))
    const [translateY] = useState(() => new Animated.Value(20))

    useEffect(() => {
        void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion)
        const sub = AccessibilityInfo.addEventListener(
            'reduceMotionChanged',
            setReduceMotion
        )
        return () => sub.remove()
    }, [])

    useEffect(() => {
        if (isBootstrapping) return

        if (reduceMotion) {
            fadeAnim.setValue(1)
            translateY.setValue(0)
            return
        }

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            }),
        ]).start()
    }, [isBootstrapping, fadeAnim, translateY, reduceMotion])

    const flightConditions = useMemo(() => {
        if (!weatherData) {
            return {
                isSuitable: false,
                checks: [],
                reasons: [],
                windSpeedDetails: [],
                windGustDetails: [],
            }
        }
        return WeatherService.evaluateFlyability(
            weatherData,
            selectedHour,
            thresholds
        )
    }, [weatherData, selectedHour, thresholds])

    const safeFlyingWindow = useMemo(() => {
        if (!weatherData) return { type: 'none' as const }
        return DroneFlyabilityService.findNextSafeFlyingWindow(
            weatherData.hourlyData,
            thresholds
        )
    }, [weatherData, thresholds])

    const onRefresh = useCallback(async () => {
        setRefreshing(true)
        try {
            await refetch()
        } finally {
            setRefreshing(false)
        }
    }, [refetch])

    const lastUpdatedLabel = useFocusAwareFreshnessLabel(
        lastUpdated ?? weatherData?.meta?.fetchedAt ?? null
    )

    const sourceLabel =
        weatherData?.meta?.source ?? WEATHER_SOURCE_OPEN_METEO

    const renderLoadingState = () => (
        <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color={Theme.colors.accent} />
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
            <EmptyState
                message={message}
                actionLabel="Retry"
                onAction={() => void refetch()}
            />
        )
    }

    const renderMetaRow = () => (
        <View className="flex-row items-center justify-between mb-3 px-1">
            <View className="flex-1 mr-2">
                <DataFreshnessBanner
                    lastUpdatedLabel={lastUpdatedLabel}
                    sourceLabel={sourceLabel}
                    isShowingCachedData={isShowingCachedData}
                    isOfflineOrStale={isOfflineOrStale}
                />
            </View>
            <Pressable
                onPress={() => void onRefresh()}
                accessibilityRole="button"
                accessibilityLabel="Refresh weather"
                hitSlop={8}
                style={{
                    minHeight: Theme.touchTarget,
                    minWidth: Theme.touchTarget,
                    justifyContent: 'center',
                }}
            >
                <MaterialCommunityIcons
                    name="refresh"
                    size={22}
                    color={
                        isLoading
                            ? Theme.colors.textMuted
                            : Theme.colors.accent
                    }
                />
            </Pressable>
        </View>
    )

    const renderProfileChip = () => {
        if (!selectedProfile) return null
        return (
            <View
                className="flex-row items-center self-center mb-3 px-3 py-1.5 rounded-full"
                style={{
                    backgroundColor: Theme.colors.accentDim,
                    borderWidth: 1,
                    borderColor: 'rgba(245, 158, 11, 0.25)',
                }}
                accessibilityLabel={`Active drone profile: ${selectedProfile.name}`}
            >
                <MaterialCommunityIcons
                    name="quadcopter"
                    size={14}
                    color={Theme.colors.accent}
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

    const showError = !isBootstrapping && (error || errorMsg) && !weatherData

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <LocationBar locationName={locationName} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                {isBootstrapping ? (
                    renderLoadingState()
                ) : showError ? (
                    renderErrorState()
                ) : weatherData ? (
                    <View style={{ flex: 1 }}>
                        <ScrollView
                            className="flex-1 px-4 pt-4"
                            contentContainerStyle={{
                                paddingBottom: Theme.spacing.lg,
                            }}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={onRefresh}
                                    tintColor={Theme.colors.accent}
                                    colors={[Theme.colors.accent]}
                                />
                            }
                        >
                            <Animated.View
                                style={{
                                    opacity: fadeAnim,
                                    transform: [{ translateY }],
                                }}
                            >
                                {renderMetaRow()}
                                {error && isOfflineOrStale ? (
                                    <Text
                                        className="text-xs mb-2"
                                        style={{
                                            fontFamily: 'DMSans',
                                            color: Theme.colors.danger,
                                        }}
                                        accessibilityRole="alert"
                                    >
                                        {error} Showing last available data.
                                    </Text>
                                ) : null}
                                <StatusBanner
                                    isSafe={flightConditions.isSuitable}
                                    reasons={flightConditions.reasons}
                                />
                                {renderProfileChip()}
                                <NextFlyWindow
                                    window={safeFlyingWindow}
                                    onSelectWindow={setSelectedHour}
                                    utcOffsetSeconds={getWeatherUtcOffset(
                                        weatherData
                                    )}
                                />
                                <WeatherGrid
                                    weatherData={weatherData}
                                    selectedClockHour={selectedHour}
                                />
                            </Animated.View>
                        </ScrollView>

                        <View
                            style={{
                                borderTopWidth: 1,
                                borderTopColor: Theme.colors.border,
                                backgroundColor: Theme.colors.background,
                                // Measured tab bar height keeps padding honest if
                                // chrome insets change; selector stays in layout flow.
                                paddingBottom: Math.max(
                                    Theme.spacing.sm,
                                    tabBarHeight > 0 ? 0 : Theme.spacing.sm
                                ),
                            }}
                        >
                            <HourSelector
                                selectedHour={selectedHour}
                                onHourChange={setSelectedHour}
                                hasInitialized={hasInitializedHour}
                                onInitialized={() =>
                                    setHasInitializedHour(true)
                                }
                                className="pt-2"
                            />
                        </View>
                    </View>
                ) : (
                    renderErrorState()
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}
