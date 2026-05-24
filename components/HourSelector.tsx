import React, { useRef, useEffect, useMemo } from 'react'
import { View, Text, ScrollView, Pressable, Dimensions } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { DroneFlyabilityService } from '@/services/droneFlyabilityService'
import { useWeatherConfig } from '@/contexts/WeatherConfigContext'
import { useWeatherData } from '@/contexts/WeatherDataContext'
import { HourlyWeatherData } from '@/types/weather'

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
            hour: new Date(hourData.time).getHours(),
            timestamp: hourData.time,
            isSafe: conditions.isSuitable,
        }
    })

    return (
        <View className="h-1.5 flex-1 flex-row rounded-full overflow-hidden">
            {safetyData.map(({ hour, timestamp, isSafe }) => (
                <View
                    key={timestamp.toString()}
                    className={`flex-1 ${
                        isSafe ? 'bg-green-500' : 'bg-red-500'
                    }`}
                />
            ))}
        </View>
    )
}

interface HourSelectorProps {
    selectedHour: number
    onHourChange: (hour: number) => void
    className?: string
}

export function HourSelector({
    selectedHour,
    onHourChange,
    className = '',
}: HourSelectorProps) {
    const hours = Array.from({ length: 24 }, (_, i) => i)
    const windowWidth = Dimensions.get('window').width
    const itemWidth = 60 // Width of each hour item
    const scrollViewRef = useRef<ScrollView>(null)
    const { thresholds } = useWeatherConfig()
    const { weatherData } = useWeatherData()

    const getCurrentHour = () => new Date().getHours()
    const currentHour = useMemo(() => getCurrentHour(), []) // Memoize current hour

    // Calculate safety data for all hours
    const hourlyFlyability = useMemo(() => {
        if (!weatherData) return []

        return weatherData.hourlyData.map((hourData) => {
            const conditions = DroneFlyabilityService.checkFlyingConditions(
                hourData,
                thresholds
            )

            return {
                hour: new Date(hourData.time).getHours(),
                timestamp: hourData.time,
                isSafe: conditions.isSuitable,
            }
        })
    }, [weatherData, thresholds])

    // Set initial hour when component mounts
    useEffect(() => {
        if (selectedHour === 0 && weatherData) {
            // Find the first available hour in today's data
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            const availableHour = weatherData.hourlyData.find(
                (data) =>
                    new Date(data.time).toDateString() ===
                        today.toDateString() &&
                    new Date(data.time).getHours() >= currentHour
            )

            if (availableHour) {
                onHourChange(new Date(availableHour.time).getHours())
            } else {
                onHourChange(currentHour)
            }
        }
    }, [selectedHour, weatherData, currentHour, onHourChange])

    // Handle scrolling whenever selectedHour changes
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
    }

    const getHourStyle = (hour: number) => {
        const hourData = hourlyFlyability.find((h) => h.hour === hour)
        if (selectedHour === hour) {
            return {
                container: 'bg-amber-500',
                text: 'text-background',
            }
        }
        if (hourData?.isSafe) {
            return {
                container: 'bg-transparent',
                text: 'text-emerald-400',
            }
        }
        return {
            container: 'bg-transparent',
            text: 'text-red-400',
        }
    }

    if (!weatherData) return null

    // Get the date for today to match with weather data
    const today = new Date()
    today.setHours(0, 0, 0, 0)

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
                    className="ml-4 flex-row items-center bg-amber-500 px-3 py-1.5 rounded-full"
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
            <View className="relative">
                <ScrollView
                    ref={scrollViewRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{
                        paddingHorizontal: windowWidth / 2 - itemWidth / 2,
                    }}
                >
                    {hours.map((hour) => {
                        const style = getHourStyle(hour)
                        // Find the matching weather data for this hour
                        const hourWeatherData = weatherData.hourlyData.find(
                            (data) =>
                                new Date(data.time).getHours() === hour &&
                                new Date(data.time).toDateString() ===
                                    today.toDateString()
                        )
                        const uniqueKey = hourWeatherData
                            ? hourWeatherData.time.toString()
                            : `hour-${hour}`

                        return (
                            <Pressable
                                key={uniqueKey}
                                onPress={() => onHourChange(hour)}
                                className="w-[60px] items-center py-2"
                            >
                                <View
                                    className={`w-9 h-9 rounded-full items-center justify-center ${style.container}`}
                                >
                                    <Text
                                        className={`text-sm font-semibold ${style.text}`}
                                        style={{ fontFamily: 'Outfit-SemiBold' }}
                                    >
                                        {hour}H
                                    </Text>
                                </View>
                            </Pressable>
                        )
                    })}
                </ScrollView>
            </View>
        </View>
    )
}
