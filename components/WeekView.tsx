import React, { useState, useRef, useEffect } from 'react'
import {
    View,
    ScrollView,
    Text,
    Pressable,
    LayoutAnimation,
    Platform,
    UIManager,
} from 'react-native'
import { format, isBefore, startOfHour } from 'date-fns'
import { WeatherData, HourlyWeatherData } from '@/types/weather'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useWeatherConfig } from '@/contexts/WeatherConfigContext'
import { WeatherDetailsModal } from './WeatherDetailsModal'
import { DroneFlyabilityService } from '@/services/droneFlyabilityService'

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true)
}

interface WeekViewProps {
    weatherData: WeatherData
    onHourSelect: (hour: number) => void
}

interface DayData {
    date: Date
    hours: HourlyWeatherData[]
}

export function WeekView({ weatherData, onHourSelect }: WeekViewProps) {
    const [selectedHour, setSelectedHour] = useState<HourlyWeatherData | null>(
        null
    )
    const [isModalVisible, setIsModalVisible] = useState(false)
    const [expandedDayIndex, setExpandedDayIndex] = useState<number | null>(0)

    const groupedData = React.useMemo(() => {
        const days: DayData[] = []
        const currentHour = startOfHour(new Date())
        const currentDate = format(currentHour, 'yyyy-MM-dd')

        let currentDayHours: HourlyWeatherData[] = []
        let futureDays: DayData[] = []

        weatherData.hourlyData.forEach((hour) => {
            const hourDate = format(hour.time, 'yyyy-MM-dd')

            if (hourDate === currentDate) {
                if (!isBefore(hour.time, currentHour)) {
                    currentDayHours.push(hour)
                }
            } else if (hourDate > currentDate) {
                const lastDay = futureDays[futureDays.length - 1]
                if (
                    lastDay &&
                    format(lastDay.date, 'yyyy-MM-dd') === hourDate
                ) {
                    lastDay.hours.push(hour)
                } else {
                    futureDays.push({
                        date: hour.time,
                        hours: [hour],
                    })
                }
            }
        })

        if (currentDayHours.length > 0) {
            days.push({
                date: currentDayHours[0].time,
                hours: currentDayHours,
            })
        }
        days.push(...futureDays)
        return days
    }, [weatherData])

    const handleDayPress = (index: number) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
        setExpandedDayIndex((prev) => (prev === index ? null : index))
    }

    const handleHourPress = (hour: HourlyWeatherData, index: number) => {
        setSelectedHour(hour)
        setIsModalVisible(true)
        onHourSelect(index)
    }

    return (
        <>
            <ScrollView
                className="flex-1 bg-background"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 32 }}
            >
                {groupedData.map((day, dayIndex) => {
                    const isExpanded = expandedDayIndex === dayIndex
                    const isToday = dayIndex === 0

                    return (
                        <DaySection
                            key={dayIndex}
                            day={day}
                            dayIndex={dayIndex}
                            isToday={isToday}
                            isExpanded={isExpanded}
                            onDayPress={() => handleDayPress(dayIndex)}
                            onHourPress={handleHourPress}
                        />
                    )
                })}
            </ScrollView>

            <WeatherDetailsModal
                isVisible={isModalVisible}
                onClose={() => setIsModalVisible(false)}
                hourData={selectedHour}
            />
        </>
    )
}

interface DaySectionProps {
    day: DayData
    dayIndex: number
    isToday: boolean
    isExpanded: boolean
    onDayPress: () => void
    onHourPress: (hour: HourlyWeatherData, index: number) => void
}

function DaySection({
    day,
    dayIndex,
    isToday,
    isExpanded,
    onDayPress,
    onHourPress,
}: DaySectionProps) {
    const { thresholds } = useWeatherConfig()

    const safeCount = day.hours.filter((h) =>
        DroneFlyabilityService.checkFlyingConditions(h, thresholds).isSuitable
    ).length

    return (
        <View
            className="mb-4 mx-4 rounded-2xl overflow-hidden"
            style={{
                backgroundColor: 'rgba(22, 26, 32, 0.5)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.06)',
                marginLeft: isToday ? 16 : 28,
                marginRight: isToday ? 16 : 12,
            }}
        >
            {/* Day header */}
            <Pressable
                onPress={onDayPress}
                className="flex-row items-center justify-between px-5 py-4"
                style={{
                    backgroundColor: isToday
                        ? 'rgba(245, 158, 11, 0.12)'
                        : 'rgba(15, 17, 21, 0.9)',
                    borderBottomWidth: isExpanded ? 1 : 0,
                    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
                }}
            >
                <View className="flex-1">
                    <Text
                        className="text-slate-100 text-lg font-bold"
                        style={{ fontFamily: 'Outfit-SemiBold' }}
                    >
                        {format(day.date, 'EEEE')}
                    </Text>
                    <Text
                        className="text-slate-500 text-sm mt-0.5"
                        style={{ fontFamily: 'DMSans' }}
                    >
                        {format(day.date, 'MMM d')} · {safeCount}/{day.hours.length} flyable
                    </Text>
                </View>
                <View className="flex-row items-center gap-2">
                    <View
                        className="px-2.5 py-1 rounded-full"
                        style={{
                            backgroundColor: safeCount > 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        }}
                    >
                        <Text
                            className="text-xs font-medium"
                            style={{
                                fontFamily: 'Outfit-SemiBold',
                                color: safeCount > 0 ? '#10b981' : '#ef4444',
                            }}
                        >
                            {safeCount > 0 ? 'GO' : 'NO'}
                        </Text>
                    </View>
                    <MaterialCommunityIcons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={22}
                        color="#f59e0b"
                    />
                </View>
            </Pressable>

            {/* Expandable: vertical list - one row per hour, easy to scan */}
            {isExpanded && (
                <View className="py-1">
                    {day.hours.map((hour, hourIndex) => (
                        <HourRow
                            key={hourIndex}
                            hourData={hour}
                            onPress={() =>
                                onHourPress(hour, dayIndex * 24 + hourIndex)
                            }
                            isAlternate={hourIndex % 2 === 1}
                        />
                    ))}
                </View>
            )}
        </View>
    )
}

interface HourRowProps {
    hourData: HourlyWeatherData
    onPress: () => void
    isAlternate: boolean
}

function HourRow({ hourData, onPress, isAlternate }: HourRowProps) {
    const { thresholds } = useWeatherConfig()
    const conditions = DroneFlyabilityService.checkFlyingConditions(
        hourData,
        thresholds
    )

    const temperature =
        thresholds.temperature.unit === 'fahrenheit'
            ? ((hourData.temperature2m * 9) / 5 + 32).toFixed(0) + '°'
            : hourData.temperature2m.toFixed(0) + '°'

    const windSpeed =
        thresholds.windSpeed.unit === 'mph'
            ? hourData.windSpeed10m * 0.621371
            : hourData.windSpeed10m

    const windDisplay =
        thresholds.windSpeed.unit === 'mph'
            ? `${windSpeed.toFixed(0)} mph`
            : `${windSpeed.toFixed(0)} km/h`

    const borderColor = conditions.isSuitable ? '#10b981' : '#ef4444'

    return (
        <Pressable
            onPress={onPress}
            className="flex-row items-center px-5 py-3.5"
            style={{
                backgroundColor: isAlternate
                    ? 'rgba(255, 255, 255, 0.02)'
                    : 'transparent',
                borderLeftWidth: 4,
                borderLeftColor: borderColor,
            }}
        >
            <Text
                className="text-slate-400 w-14"
                style={{ fontFamily: 'DMSans', fontSize: 15 }}
            >
                {format(hourData.time, 'HH:mm')}
            </Text>
            <Text
                className="text-slate-100 flex-1 text-center"
                style={{ fontFamily: 'Outfit-SemiBold', fontSize: 18 }}
            >
                {temperature}
            </Text>
            <View className="flex-row items-center w-20 justify-end">
                <MaterialCommunityIcons
                    name="weather-windy"
                    size={14}
                    color="#64748b"
                />
                <Text
                    className="text-slate-400 ml-1"
                    style={{ fontFamily: 'DMSans', fontSize: 14 }}
                >
                    {windDisplay}
                </Text>
            </View>
        </Pressable>
    )
}
