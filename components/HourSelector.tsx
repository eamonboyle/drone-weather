import React, { useRef, useEffect, useMemo, useState } from 'react'
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
    weatherData: HourlyWeatherData[]
}

function SafetyBar({ weatherData }: SafetyBarProps) {
    const { thresholds } = useWeatherConfig()

    const safetyData = weatherData.map((hourData) => {
        const conditions = DroneFlyabilityService.checkFlyingConditions(
            hourData,
            thresholds
        )

        return {
            timestamp: hourData.time,
            isSafe: conditions.isSuitable,
        }
    })

    return (
        <View
            className="h-1.5 flex-1 flex-row rounded-full overflow-hidden"
            accessibilityRole="progressbar"
            accessibilityLabel={`Hourly safety overview, ${safetyData.filter((h) => h.isSafe).length} of ${safetyData.length} hours flyable`}
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
    const hours = Array.from({ length: 24 }, (_, i) => i)
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

    const hourlyFlyability = useMemo(() => {
        if (!weatherData) return []

        return weatherData.hourlyData.map((hourData) => {
            const conditions = DroneFlyabilityService.checkFlyingConditions(
                hourData,
                thresholds
            )

            return {
                hour: getLocationHours(hourData.time, utcOffsetSeconds),
                timestamp: hourData.time,
                isSafe: conditions.isSuitable,
            }
        })
    }, [weatherData, thresholds, utcOffsetSeconds])

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

    const handleCurrentHourPress = () => {
        onHourChange(currentHour)
        void AccessibilityInfo.announceForAccessibility(
            `Selected current hour, ${currentHour}H`
        )
    }

    const getHourStyle = (hour: number) => {
        const hourData = hourlyFlyability.find((h) => h.hour === hour)
        if (selectedHour === hour) {
            return {
                container: 'bg-amber-500',
                text: 'text-background',
                status: 'selected' as const,
            }
        }
        if (hourData?.isSafe) {
            return {
                container: 'bg-transparent',
                text: 'text-emerald-400',
                status: 'safe' as const,
            }
        }
        return {
            container: 'bg-transparent',
            text: 'text-red-400',
            status: 'unsafe' as const,
        }
    }

    if (!weatherData) return null

    const now = new Date()
    const todayHours = getTodayHourlyData(weatherData.hourlyData, {
        utcOffsetSeconds,
    })

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
                <SafetyBar weatherData={todayHours} />
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
                    {hours.map((hour) => {
                        const style = getHourStyle(hour)
                        const hourWeatherData = weatherData.hourlyData.find(
                            (data) =>
                                getLocationHours(data.time, utcOffsetSeconds) ===
                                    hour &&
                                isSameLocationDay(
                                    data.time,
                                    now,
                                    utcOffsetSeconds
                                )
                        )
                        const uniqueKey = hourWeatherData
                            ? hourWeatherData.time.toString()
                            : `hour-${hour}`
                        const statusWord =
                            style.status === 'selected'
                                ? 'selected'
                                : style.status === 'safe'
                                  ? 'safe to fly'
                                  : 'not safe to fly'

                        return (
                            <Pressable
                                key={uniqueKey}
                                onPress={() => onHourChange(hour)}
                                accessibilityRole="button"
                                accessibilityState={{
                                    selected: selectedHour === hour,
                                }}
                                accessibilityLabel={`${hour}H, ${statusWord}`}
                                className="w-[60px] items-center py-2"
                                style={{ minHeight: 44 }}
                            >
                                <View
                                    className={`w-9 h-9 rounded-full items-center justify-center ${style.container}`}
                                >
                                    <Text
                                        className={`text-sm font-semibold ${style.text}`}
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
                                            style.status === 'selected'
                                                ? Theme.colors.accent
                                                : style.status === 'safe'
                                                  ? Theme.colors.safe
                                                  : Theme.colors.danger,
                                    }}
                                >
                                    {style.status === 'selected'
                                        ? 'Sel'
                                        : style.status === 'safe'
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
