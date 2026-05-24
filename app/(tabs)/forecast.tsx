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
import { LocationBar } from '@/components/LocationBar'
import { useLocation } from '@/contexts/LocationContext'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { useState, useMemo } from 'react'
import { DroneFlyabilityService } from '@/services/droneFlyabilityService'
import { HourlyWeatherData } from '@/types/weather'
import { LinearGradient } from 'expo-linear-gradient'
import { useWeatherForLocation } from '@/hooks/useWeatherForLocation'
import { formatWindSpeedMph } from '@/utils/windDisplay'
import {
    buildForecastPlanningSummary,
    filterHoursByFlyability,
    formatDayLabel,
    formatWindowTimeRange,
    ForecastFilter,
} from '@/utils/forecastPlanning'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true)
}

export default function ForecastTable() {
    const { locationName } = useLocation()
    const { thresholds } = useWeatherConfig()
    const { weatherData, isBootstrapping, error, refetch } =
        useWeatherForLocation()
    const { width: screenWidth } = useWindowDimensions()
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
    const [expandedDay, setExpandedDay] = useState<string | null>(null)
    const [flyabilityFilter, setFlyabilityFilter] =
        useState<ForecastFilter>('all')

    const filteredDays = useMemo(() => {
        if (!weatherData) return [] as [string, HourlyWeatherData[]][]

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

        return Object.entries(groupedByDay).filter(
            ([, hours]) => hours.length > 0
        )
    }, [weatherData])

    const planningSummary = useMemo(
        () =>
            weatherData
                ? buildForecastPlanningSummary(
                      weatherData.hourlyData,
                      filteredDays,
                      thresholds
                  )
                : {
                      nextWindow: { type: 'none' as const },
                      bestDay: null,
                  },
        [weatherData, filteredDays, thresholds]
    )

    const displayDays = useMemo(
        () =>
            filteredDays
                .map(
                    ([date, hours]) =>
                        [
                            date,
                            filterHoursByFlyability(
                                hours,
                                thresholds,
                                flyabilityFilter
                            ),
                        ] as [string, HourlyWeatherData[]]
                )
                .filter(([, hours]) => hours.length > 0),
        [filteredDays, thresholds, flyabilityFilter]
    )

    if (isBootstrapping) {
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
                <View className="flex-1 justify-center items-center px-6">
                    <MaterialCommunityIcons
                        name="cloud-off-outline"
                        size={48}
                        color="#64748b"
                    />
                    <Text
                        className="text-slate-400 text-lg text-center mt-4"
                        style={{ fontFamily: 'DMSans' }}
                    >
                        {error ?? 'No weather data available'}
                    </Text>
                    <Pressable
                        onPress={() => refetch()}
                        className="mt-4 px-6 py-3 rounded-xl bg-amber-500"
                    >
                        <Text
                            className="text-background font-semibold"
                            style={{ fontFamily: 'Outfit-SemiBold' }}
                        >
                            Load Weather
                        </Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        )
    }

    const formatWind = (s: number) =>
        formatWindSpeedMph(s, thresholds.windSpeed.unit, 0).replace(
            /\s*(mph|km\/h)$/,
            ''
        )

    const formatTemp = (t: number) =>
        thresholds.temperature.unit === 'fahrenheit'
            ? ((t * 9) / 5 + 32).toFixed(0)
            : t.toFixed(0)

    return (
        <SafeAreaView className="flex-1 bg-background">
            <LocationBar locationName={locationName} />

            <ForecastPlanningSummary summary={planningSummary} />

            <View className="flex-row px-4 py-2 gap-2">
                {(
                    [
                        { id: 'all', label: 'All' },
                        { id: 'flyable', label: 'Flyable' },
                        { id: 'blocked', label: 'Blocked' },
                    ] as const
                ).map(({ id, label }) => (
                    <Pressable
                        key={id}
                        onPress={() => {
                            LayoutAnimation.configureNext(
                                LayoutAnimation.Presets.easeInEaseOut
                            )
                            setFlyabilityFilter(id)
                        }}
                        className="px-4 py-2 rounded-lg"
                        style={{
                            backgroundColor:
                                flyabilityFilter === id
                                    ? 'rgba(245, 158, 11, 0.2)'
                                    : 'rgba(22, 26, 32, 0.6)',
                            borderWidth: 1,
                            borderColor:
                                flyabilityFilter === id
                                    ? 'rgba(245, 158, 11, 0.4)'
                                    : 'rgba(255,255,255,0.06)',
                        }}
                    >
                        <Text
                            className="text-sm font-semibold"
                            style={{
                                fontFamily: 'Outfit-SemiBold',
                                color:
                                    flyabilityFilter === id
                                        ? '#f59e0b'
                                        : '#64748b',
                            }}
                        >
                            {label}
                        </Text>
                    </Pressable>
                ))}
            </View>

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

            {displayDays.length === 0 ? (
                <View className="flex-1 justify-center items-center px-6">
                    <MaterialCommunityIcons
                        name="calendar-search"
                        size={48}
                        color="#64748b"
                    />
                    <Text
                        className="text-slate-400 text-lg text-center mt-4"
                        style={{ fontFamily: 'DMSans' }}
                    >
                        {flyabilityFilter === 'flyable'
                            ? 'No flyable hours in the forecast'
                            : flyabilityFilter === 'blocked'
                              ? 'No blocked hours in the forecast'
                              : 'No forecast hours available'}
                    </Text>
                </View>
            ) : viewMode === 'cards' ? (
                <ScrollView
                    className="flex-1"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 32 }}
                >
                    {displayDays.map(([date, hours], dayIndex) => (
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
                    filteredDays={displayDays}
                    thresholds={thresholds}
                    screenWidth={screenWidth}
                    formatWind={formatWind}
                    formatTemp={formatTemp}
                />
            )}
        </SafeAreaView>
    )
}

interface ForecastPlanningSummaryProps {
    summary: ReturnType<typeof buildForecastPlanningSummary>
}

function ForecastPlanningSummary({ summary }: ForecastPlanningSummaryProps) {
    const { nextWindow, bestDay } = summary

    let windowText = 'No safe flying window in the next 48 hours'
    if (nextWindow.type === 'now' && nextWindow.durationHours) {
        windowText = `Good to fly now · ${nextWindow.durationHours} hr${nextWindow.durationHours === 1 ? '' : 's'} ahead`
    } else if (
        nextWindow.type === 'upcoming' &&
        nextWindow.startTime &&
        nextWindow.endTime &&
        nextWindow.durationHours
    ) {
        windowText = `Next window: ${formatDayLabel(format(nextWindow.startTime, 'yyyy-MM-dd'))} · ${formatWindowTimeRange(nextWindow.startTime, nextWindow.endTime)} (${nextWindow.durationHours} hr${nextWindow.durationHours === 1 ? '' : 's'})`
    }

    const bestDayText =
        bestDay && bestDay.safeCount > 0
            ? `Best day: ${formatDayLabel(bestDay.date)} · ${bestDay.safeCount}/${bestDay.totalHours} flyable`
            : 'No flyable hours in upcoming forecast'

    return (
        <View
            className="mx-4 mt-2 mb-1 p-4 rounded-xl"
            style={{
                backgroundColor: 'rgba(22, 26, 32, 0.6)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.06)',
            }}
        >
            <View className="flex-row items-start">
                <MaterialCommunityIcons
                    name="calendar-clock"
                    size={22}
                    color="#f59e0b"
                />
                <View className="ml-3 flex-1">
                    <Text
                        className="text-slate-100 text-sm font-semibold"
                        style={{ fontFamily: 'Outfit-SemiBold' }}
                    >
                        {windowText}
                    </Text>
                    <Text
                        className="text-slate-500 text-sm mt-1"
                        style={{ fontFamily: 'DMSans' }}
                    >
                        {bestDayText}
                    </Text>
                </View>
            </View>
        </View>
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
        isSafe?: boolean | 'warning' | 'neutral'
        icon?: keyof typeof MaterialCommunityIcons.glyphMap
        width?: number
    }) => {
        const bg =
            isSafe === 'neutral'
                ? 'rgba(22, 26, 32, 0.6)'
                : isSafe === 'warning'
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
                                        isSafe="neutral"
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
