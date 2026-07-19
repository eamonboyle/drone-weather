import React, { memo, useRef, useEffect, useMemo, useState, useCallback } from 'react'
import {
    View,
    Text,
    ScrollView,
    Pressable,
    useWindowDimensions,
    AccessibilityInfo,
} from 'react-native'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { DroneFlyabilityService } from '@/services/droneFlyabilityService'
import { useWeatherConfig } from '@/contexts/WeatherConfigContext'
import { useWeatherData } from '@/contexts/WeatherDataContext'
import { HourlyWeatherData } from '@/types/weather'
import {
    getNowClockHour,
    getTodayHourlyData,
    getWeatherUtcOffset,
} from '@/utils/weatherHourUtils'
import {
    getLocationHours,
    isSameLocationDay,
} from '@/utils/locationTime'
import { Theme } from '@/constants/Theme'

interface SafetyBarProps {
    safetyData: { timestamp: Date; isSafe: boolean }[]
}

const SafetyBar = memo(function SafetyBar({ safetyData }: SafetyBarProps) {
    const flyableCount = safetyData.filter((h) => h.isSafe).length

    return (
        <View
            className="h-1.5 flex-1 flex-row rounded-full overflow-hidden"
            accessibilityRole="progressbar"
            accessibilityLabel={`Hourly safety overview, ${flyableCount} of ${safetyData.length} hours flyable`}
        >
            {safetyData.map(({ timestamp, isSafe }) => (
                <View
                    key={timestamp.toString()}
                    className="flex-1"
                    style={{
                        backgroundColor: isSafe
                            ? Theme.colors.safe
                            : Theme.colors.danger,
                    }}
                />
            ))}
        </View>
    )
})

interface HourChipModel {
    hour: number
    key: string
    isSafe: boolean
}

interface HourSelectorProps {
    selectedHour: number
    onHourChange: (hour: number) => void
    className?: string
    hasInitialized?: boolean
    onInitialized?: () => void
}

export function HourSelector({
    selectedHour,
    onHourChange,
    className = '',
    hasInitialized = false,
    onInitialized,
}: HourSelectorProps) {
    const { width: windowWidth } = useWindowDimensions()
    const itemWidth = 60
    const scrollViewRef = useRef<ScrollView>(null)
    const { thresholds } = useWeatherConfig()
    const { weatherData } = useWeatherData()
    const [currentHour, setCurrentHour] = useState(() =>
        getNowClockHour(weatherData)
    )

    const utcOffsetSeconds = getWeatherUtcOffset(weatherData)

    // Refresh "Now" when the location-local hour rolls over
    useEffect(() => {
        setCurrentHour(getNowClockHour(weatherData))
        const id = setInterval(() => {
            setCurrentHour(getNowClockHour(weatherData))
        }, 30_000)
        return () => clearInterval(id)
    }, [weatherData])

    const todayHours = useMemo(() => {
        if (!weatherData) return [] as HourlyWeatherData[]
        return getTodayHourlyData(weatherData.hourlyData, {
            utcOffsetSeconds,
        })
    }, [weatherData, utcOffsetSeconds])

    const hourChips = useMemo((): HourChipModel[] => {
        const byHour = new Map<number, HourlyWeatherData>()
        for (const hourData of todayHours) {
            byHour.set(
                getLocationHours(hourData.time, utcOffsetSeconds),
                hourData
            )
        }

        return Array.from({ length: 24 }, (_, hour) => {
            const hourWeatherData = byHour.get(hour)
            const isSafe = hourWeatherData
                ? DroneFlyabilityService.checkFlyingConditions(
                      hourWeatherData,
                      thresholds
                  ).isSuitable
                : false
            return {
                hour,
                key: hourWeatherData
                    ? hourWeatherData.time.toString()
                    : `hour-${hour}`,
                isSafe,
            }
        })
    }, [todayHours, thresholds, utcOffsetSeconds])

    const safetyData = useMemo(
        () =>
            todayHours.map((hourData) => ({
                timestamp: hourData.time,
                isSafe: DroneFlyabilityService.checkFlyingConditions(
                    hourData,
                    thresholds
                ).isSuitable,
            })),
        [todayHours, thresholds]
    )

    // Initialize once to current/upcoming location hour — midnight (0) is valid
    useEffect(() => {
        if (hasInitialized || !weatherData) return

        const now = new Date()
        const availableHour = weatherData.hourlyData.find(
            (data) =>
                isSameLocationDay(data.time, now, utcOffsetSeconds) &&
                getLocationHours(data.time, utcOffsetSeconds) >= currentHour
        )

        if (availableHour) {
            onHourChange(getLocationHours(availableHour.time, utcOffsetSeconds))
        } else {
            onHourChange(currentHour)
        }
        onInitialized?.()
    }, [
        hasInitialized,
        weatherData,
        currentHour,
        onHourChange,
        onInitialized,
        utcOffsetSeconds,
    ])

    useEffect(() => {
        if (scrollViewRef.current) {
            scrollViewRef.current.scrollTo({
                x: selectedHour * itemWidth,
                animated: true,
            })
        }
    }, [selectedHour])

    const handleCurrentHourPress = useCallback(() => {
        onHourChange(currentHour)
        void AccessibilityInfo.announceForAccessibility(
            `Selected current hour, ${currentHour}H`
        )
    }, [currentHour, onHourChange])

    if (!weatherData) return null

    return (
        <View className={`px-4 ${className}`}>
            <View className="flex-row items-center justify-between mb-2">
                <Text
                    className="text-slate-500 text-xs"
                    style={{ fontFamily: 'DMSans' }}
                >
                    Select hour for conditions
                </Text>
                <Pressable
                    onPress={handleCurrentHourPress}
                    accessibilityRole="button"
                    accessibilityLabel={`Jump to current hour, ${currentHour}H`}
                    className="ml-4 flex-row items-center bg-amber-500 px-3 py-1.5 rounded-full"
                    style={{ minHeight: 44, minWidth: 44 }}
                >
                    <MaterialCommunityIcons
                        name="clock"
                        size={14}
                        color="#08090c"
                    />
                    <Text
                        className="text-background text-sm font-semibold ml-1.5"
                        style={{ fontFamily: 'Outfit-SemiBold' }}
                    >
                        Now
                    </Text>
                </Pressable>
            </View>
            <View className="mb-3">
                <SafetyBar safetyData={safetyData} />
            </View>
            <View className="relative">
                <ScrollView
                    ref={scrollViewRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{
                        paddingHorizontal: windowWidth / 2 - itemWidth / 2,
                    }}
                    accessibilityRole="adjustable"
                    accessibilityLabel="Hour selector"
                >
                    {hourChips.map(({ hour, key, isSafe }) => {
                        const isSelected = selectedHour === hour
                        const status = isSelected
                            ? 'selected'
                            : isSafe
                              ? 'safe'
                              : 'unsafe'
                        const statusWord =
                            status === 'selected'
                                ? 'selected'
                                : status === 'safe'
                                  ? 'safe to fly'
                                  : 'not safe to fly'
                        const containerClass = isSelected
                            ? 'bg-amber-500'
                            : 'bg-transparent'
                        const textClass = isSelected
                            ? 'text-background'
                            : isSafe
                              ? 'text-emerald-400'
                              : 'text-red-400'

                        return (
                            <Pressable
                                key={key}
                                onPress={() => onHourChange(hour)}
                                accessibilityRole="button"
                                accessibilityState={{
                                    selected: isSelected,
                                }}
                                accessibilityLabel={`${hour}H, ${statusWord}`}
                                className="w-[60px] items-center py-2"
                                style={{ minHeight: 44 }}
                            >
                                <View
                                    className={`w-9 h-9 rounded-full items-center justify-center ${containerClass}`}
                                >
                                    <Text
                                        className={`text-sm font-semibold ${textClass}`}
                                        style={{
                                            fontFamily: 'Outfit-SemiBold',
                                        }}
                                    >
                                        {hour}H
                                    </Text>
                                </View>
                                <Text
                                    className="text-[10px] mt-1"
                                    style={{
                                        fontFamily: 'DMSans',
                                        color:
                                            status === 'selected'
                                                ? Theme.colors.accent
                                                : status === 'safe'
                                                  ? Theme.colors.safe
                                                  : Theme.colors.danger,
                                    }}
                                >
                                    {status === 'selected'
                                        ? 'Sel'
                                        : status === 'safe'
                                          ? 'Safe'
                                          : 'Unsafe'}
                                </Text>
                            </Pressable>
                        )
                    })}
                </ScrollView>
            </View>
        </View>
    )
}
