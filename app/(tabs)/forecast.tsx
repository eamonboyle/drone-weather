import {
    View,
    Text,
    ScrollView,
    useWindowDimensions,
    Pressable,
    LayoutAnimation,
    Platform,
    UIManager,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { format, isBefore, startOfHour } from 'date-fns'
import { useWeatherConfig } from '@/contexts/WeatherConfigContext'
import { useWeatherData } from '@/contexts/WeatherDataContext'
import { LocationBar } from '@/components/LocationBar'
import { useLocation } from '@/contexts/LocationContext'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { useEffect, useState } from 'react'
import { DroneFlyabilityService } from '@/services/droneFlyabilityService'
import { HourlyWeatherData } from '@/types/weather'
import { LinearGradient } from 'expo-linear-gradient'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true)
}

export default function ForecastTable() {
    const { locationName } = useLocation()
    const { thresholds } = useWeatherConfig()
    const { weatherData } = useWeatherData()
    const { width: screenWidth } = useWindowDimensions()
    const [isLoading, setIsLoading] = useState(true)
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
    const [expandedDay, setExpandedDay] = useState<string | null>(null)

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 500)
        return () => clearTimeout(timer)
    }, [])

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-background">
                <LocationBar locationName={locationName} />
                <LoadingSpinner text="Loading forecast data..." color="#f59e0b" />
            </SafeAreaView>
        )
    }

    if (!weatherData) {
        return (
            <SafeAreaView className="flex-1 bg-background">
                <LocationBar locationName={locationName} />
                <View className="flex-1 justify-center items-center">
                    <Text
                        className="text-slate-400 text-lg"
                        style={{ fontFamily: 'DMSans' }}
                    >
                        No weather data available
                    </Text>
                </View>
            </SafeAreaView>
        )
    }

    const groupedByDay = weatherData.hourlyData.reduce(
        (acc, hour) => {
            if (isBefore(hour.time, startOfHour(new Date()))) return acc
            const date = format(hour.time, 'yyyy-MM-dd')
            if (!acc[date]) acc[date] = []
            acc[date].push(hour)
            return acc
        },
        {} as Record<string, HourlyWeatherData[]>
    )

    const filteredDays = Object.entries(groupedByDay).filter(
        ([, hours]) => hours.length > 0
    )

    const formatWind = (s: number) =>
        thresholds.windSpeed.unit === 'mph'
            ? (s * 0.621371).toFixed(0)
            : s.toFixed(0)

    const formatTemp = (t: number) =>
        thresholds.temperature.unit === 'fahrenheit'
            ? ((t * 9) / 5 + 32).toFixed(0)
            : t.toFixed(0)

    return (
        <SafeAreaView className="flex-1 bg-background">
            <LocationBar locationName={locationName} />

            {/* View toggle */}
            <View className="flex-row justify-end px-4 py-2 gap-2">
                <Pressable
                    onPress={() => {
                        LayoutAnimation.configureNext(
                            LayoutAnimation.Presets.easeInEaseOut
                        )
                        setViewMode('cards')
                    }}
                    className="px-4 py-2 rounded-lg"
                    style={{
                        backgroundColor:
                            viewMode === 'cards'
                                ? 'rgba(245, 158, 11, 0.2)'
                                : 'rgba(22, 26, 32, 0.6)',
                        borderWidth: 1,
                        borderColor:
                            viewMode === 'cards'
                                ? 'rgba(245, 158, 11, 0.4)'
                                : 'rgba(255,255,255,0.06)',
                    }}
                >
                    <Text
                        className="text-sm font-semibold"
                        style={{
                            fontFamily: 'Outfit-SemiBold',
                            color: viewMode === 'cards' ? '#f59e0b' : '#64748b',
                        }}
                    >
                        Cards
                    </Text>
                </Pressable>
                <Pressable
                    onPress={() => {
                        LayoutAnimation.configureNext(
                            LayoutAnimation.Presets.easeInEaseOut
                        )
                        setViewMode('table')
                    }}
                    className="px-4 py-2 rounded-lg"
                    style={{
                        backgroundColor:
                            viewMode === 'table'
                                ? 'rgba(245, 158, 11, 0.2)'
                                : 'rgba(22, 26, 32, 0.6)',
                        borderWidth: 1,
                        borderColor:
                            viewMode === 'table'
                                ? 'rgba(245, 158, 11, 0.4)'
                                : 'rgba(255,255,255,0.06)',
                    }}
                >
                    <Text
                        className="text-sm font-semibold"
                        style={{
                            fontFamily: 'Outfit-SemiBold',
                            color: viewMode === 'table' ? '#f59e0b' : '#64748b',
                        }}
                    >
                        Table
                    </Text>
                </Pressable>
            </View>

            {viewMode === 'cards' ? (
                <ScrollView
                    className="flex-1"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 32 }}
                >
                    {filteredDays.map(([date, hours], dayIndex) => (
                        <DayCardStrip
                            key={date}
                            date={date}
                            hours={hours}
                            thresholds={thresholds}
                            screenWidth={screenWidth}
                            isExpanded={expandedDay === date}
                            onToggle={() => {
                                LayoutAnimation.configureNext(
                                    LayoutAnimation.Presets.easeInEaseOut
                                )
                                setExpandedDay((prev) =>
                                    prev === date ? null : date
                                )
                            }}
                            formatWind={formatWind}
                            formatTemp={formatTemp}
                            offsetLeft={dayIndex % 2 === 1}
                        />
                    ))}
                </ScrollView>
            ) : (
                <TableView
                    filteredDays={filteredDays}
                    thresholds={thresholds}
                    screenWidth={screenWidth}
                    formatWind={formatWind}
                    formatTemp={formatTemp}
                />
            )}
        </SafeAreaView>
    )
}

// Card-based timeline layout
interface DayCardStripProps {
    date: string
    hours: HourlyWeatherData[]
    thresholds: ReturnType<typeof useWeatherConfig>['thresholds']
    screenWidth: number
    isExpanded: boolean
    onToggle: () => void
    formatWind: (s: number) => string
    formatTemp: (t: number) => string
    offsetLeft: boolean
}

function DayCardStrip({
    date,
    hours,
    thresholds,
    screenWidth,
    isExpanded,
    onToggle,
    formatWind,
    formatTemp,
    offsetLeft,
}: DayCardStripProps) {
    const safeCount = hours.filter((h) =>
        DroneFlyabilityService.checkFlyingConditions(h, thresholds).isSuitable
    ).length

    return (
        <View
            className="mb-4 rounded-2xl overflow-hidden mx-4"
            style={{
                backgroundColor: 'rgba(22, 26, 32, 0.5)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.06)',
                marginLeft: offsetLeft ? 28 : 16,
                marginRight: offsetLeft ? 16 : 28,
            }}
        >
            <Pressable
                onPress={onToggle}
                className="flex-row items-center justify-between px-4 py-3"
                style={{
                    backgroundColor: 'rgba(15, 17, 21, 0.9)',
                    borderBottomWidth: isExpanded ? 1 : 0,
                    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
                }}
            >
                <View>
                    <Text
                        className="text-slate-100 font-semibold"
                        style={{ fontFamily: 'Outfit-SemiBold' }}
                    >
                        {format(new Date(date), 'EEEE')}
                    </Text>
                    <Text
                        className="text-slate-500 text-xs mt-0.5"
                        style={{ fontFamily: 'DMSans' }}
                    >
                        {format(new Date(date), 'MMM d')} · {safeCount}/
                        {hours.length} flyable
                    </Text>
                </View>
                <MaterialCommunityIcons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#f59e0b"
                />
            </Pressable>

            {!isExpanded ? (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="py-3 px-3"
                    contentContainerStyle={{ paddingRight: 16 }}
                >
                    {hours.map((hour, i) => {
                        const cond = DroneFlyabilityService.checkFlyingConditions(
                            hour,
                            thresholds
                        )
                        const colors = cond.isSuitable
                            ? (['#065f46', '#047857'] as const)
                            : (['#991b1b', '#b91c1c'] as const)
                        return (
                            <LinearGradient
                                key={i}
                                colors={colors}
                                className="rounded-lg px-3 py-2 mr-2"
                                style={{
                                    minWidth: 56,
                                    borderWidth: 1,
                                    borderColor: 'rgba(255,255,255,0.08)',
                                }}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Text
                                    className="text-white/90 text-xs"
                                    style={{ fontFamily: 'DMSans' }}
                                >
                                    {format(hour.time, 'HH:mm')}
                                </Text>
                                <Text
                                    className="text-white font-bold text-sm"
                                    style={{ fontFamily: 'Outfit-SemiBold' }}
                                >
                                    {formatTemp(hour.temperature2m)}°
                                </Text>
                            </LinearGradient>
                        )
                    })}
                </ScrollView>
            ) : (
                <View className="py-1">
                    {hours.map((hour, i) => {
                        const cond = DroneFlyabilityService.checkFlyingConditions(
                            hour,
                            thresholds
                        )
                        const borderColor = cond.isSuitable ? '#10b981' : '#ef4444'
                        return (
                            <View
                                key={i}
                                className="flex-row items-center px-4 py-3.5"
                                style={{
                                    backgroundColor: i % 2 === 1 ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                                    borderLeftWidth: 4,
                                    borderLeftColor: borderColor,
                                }}
                            >
                                <Text
                                    className="text-slate-400 w-14"
                                    style={{ fontFamily: 'DMSans', fontSize: 15 }}
                                >
                                    {format(hour.time, 'HH:mm')}
                                </Text>
                                <Text
                                    className="text-slate-100 flex-1 text-center"
                                    style={{ fontFamily: 'Outfit-SemiBold', fontSize: 18 }}
                                >
                                    {formatTemp(hour.temperature2m)}°
                                </Text>
                                <View className="flex-row items-center w-24 justify-end">
                                    <MaterialCommunityIcons
                                        name="weather-windy"
                                        size={14}
                                        color="#64748b"
                                    />
                                    <Text
                                        className="text-slate-400 ml-1"
                                        style={{ fontFamily: 'DMSans', fontSize: 14 }}
                                    >
                                        {formatWind(hour.windSpeed10m)} / {formatWind(hour.windGusts10m)}
                                    </Text>
                                </View>
                            </View>
                        )
                    })}
                </View>
            )}
        </View>
    )
}

// Original table view
function TableView({
    filteredDays,
    thresholds,
    screenWidth,
    formatWind,
    formatTemp,
}: {
    filteredDays: [string, HourlyWeatherData[]][]
    thresholds: ReturnType<typeof useWeatherConfig>['thresholds']
    screenWidth: number
    formatWind: (s: number) => string
    formatTemp: (t: number) => string
}) {
    const timeWidth = 80
    const cellWidth = (screenWidth - timeWidth) / 5

    const TableCell = ({
        value,
        isSafe = true,
        icon,
        width = 60,
    }: {
        value?: string | number
        isSafe?: boolean | 'warning'
        icon?: keyof typeof MaterialCommunityIcons.glyphMap
        width?: number
    }) => {
        const bg =
            isSafe === 'warning'
                ? 'rgba(120, 53, 15, 0.5)'
                : isSafe
                  ? 'rgba(6, 95, 70, 0.5)'
                  : 'rgba(127, 29, 29, 0.5)'
        return (
            <View
                className="p-2 justify-center items-center border-r border-b border-white/5"
                style={{ width, backgroundColor: bg }}
            >
                {icon ? (
                    <MaterialCommunityIcons
                        name={icon}
                        size={18}
                        color="#f8fafc"
                    />
                ) : (
                    <Text
                        className="text-slate-100 text-center text-sm"
                        style={{ fontFamily: 'DMSans' }}
                    >
                        {value}
                    </Text>
                )}
            </View>
        )
    }

    const TableHeader = ({
        label,
        icon,
        width,
    }: {
        label: string
        icon: keyof typeof MaterialCommunityIcons.glyphMap
        width: number
    }) => (
        <View
            className="p-2 justify-center items-center border-r border-b border-white/5"
            style={{ width, backgroundColor: 'rgba(22, 26, 32, 0.9)' }}
        >
            <MaterialCommunityIcons name={icon} size={18} color="#f59e0b" />
            <Text
                className="text-slate-400 text-xs text-center mt-1"
                style={{ fontFamily: 'DMSans' }}
            >
                {label}
            </Text>
        </View>
    )

    return (
        <>
            <View className="z-10 bg-background">
                <View className="flex-row">
                    <TableHeader label="Time" icon="clock-outline" width={timeWidth} />
                    <TableHeader label="Temp" icon="thermometer" width={cellWidth} />
                    <TableHeader label="Wind" icon="weather-windy" width={cellWidth} />
                    <TableHeader label="Gusts" icon="weather-windy-variant" width={cellWidth} />
                    <TableHeader label="Cloud" icon="weather-cloudy" width={cellWidth} />
                    <TableHeader label="Rain" icon="weather-pouring" width={cellWidth} />
                </View>
            </View>
            <ScrollView>
                {filteredDays.map(([date, hours]) => (
                    <View key={date}>
                        <View
                            className="flex-row border-t border-b border-white/5 py-3 px-4"
                            style={{
                                width: screenWidth,
                                backgroundColor: 'rgba(15, 17, 21, 0.98)',
                            }}
                        >
                            <Text
                                className="text-slate-100 font-semibold"
                                style={{ fontFamily: 'Outfit-SemiBold' }}
                            >
                                {format(new Date(date), 'EEEE, MMMM d')}
                            </Text>
                        </View>
                        {hours.map((hour, i) => {
                            const cond = DroneFlyabilityService.checkFlyingConditions(
                                hour,
                                thresholds
                            )
                            return (
                                <View key={i} className="flex-row">
                                    <TableCell value={format(hour.time, 'HH:mm')} width={timeWidth} />
                                    <TableCell
                                        value={formatTemp(hour.temperature2m)}
                                        isSafe={
                                            !cond.reasons.some((r) =>
                                                r.includes('Temperature')
                                            )
                                        }
                                        width={cellWidth}
                                    />
                                    <TableCell
                                        value={formatWind(hour.windSpeed10m)}
                                        isSafe={
                                            !cond.reasons.some((r) =>
                                                r.includes('Wind speed')
                                            )
                                        }
                                        width={cellWidth}
                                    />
                                    <TableCell
                                        value={formatWind(hour.windGusts10m)}
                                        isSafe={
                                            !cond.reasons.some((r) =>
                                                r.includes('Wind speed')
                                            )
                                        }
                                        width={cellWidth}
                                    />
                                    <TableCell
                                        value={`${hour.cloudCover}%`}
                                        isSafe={
                                            hour.cloudCover >=
                                            thresholds.weather.maxCloudCover
                                                ? 'warning'
                                                : true
                                        }
                                        width={cellWidth}
                                    />
                                    <TableCell
                                        value={`${hour.precipitationProbability}%`}
                                        isSafe={
                                            !cond.reasons.some((r) =>
                                                r.includes('precipitation')
                                            )
                                        }
                                        width={cellWidth}
                                    />
                                </View>
                            )
                        })}
                    </View>
                ))}
            </ScrollView>
        </>
    )
}
