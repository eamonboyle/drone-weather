import {
    View,
    Text,
    FlatList,
    ScrollView,
    useWindowDimensions,
    Pressable,
    LayoutAnimation,
    RefreshControl,
    AccessibilityInfo,
    PixelRatio,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { isBefore, startOfHour } from 'date-fns'
import { useWeatherConfig } from '@/contexts/WeatherConfigContext'
import { LocationBar } from '@/components/LocationBar'
import { WeatherDetailsModal } from '@/components/WeatherDetailsModal'
import { useLocation } from '@/contexts/LocationContext'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { DroneFlyabilityService } from '@/services/droneFlyabilityService'
import {
    HourlyWeatherData,
    WEATHER_SOURCE_OPEN_METEO,
} from '@/types/weather'
import { LinearGradient } from 'expo-linear-gradient'
import { useWeatherForLocation } from '@/hooks/useWeatherForLocation'
import {
    formatPercentDisplay,
    formatTemperatureDisplay,
    formatWindDisplay,
} from '@/utils/weatherDisplay'
import {
    buildForecastPlanningSummary,
    filterHoursByFlyability,
    formatDayLabel,
    formatWindowTimeRange,
    ForecastFilter,
} from '@/utils/forecastPlanning'
import {
    checkStatusToCellSafe,
    getCheckStatus,
} from '@/utils/flyabilityChecks'
import {
    formatDayKey,
    formatLocationTime,
    getLocationDayKey,
    isLocationTodayDayKey,
} from '@/utils/locationTime'
import { getWeatherUtcOffset } from '@/utils/weatherHourUtils'
import { Theme } from '@/constants/Theme'
import { SegmentChips } from '@/components/ui/SegmentChips'
import { DataFreshnessBanner } from '@/components/ui/DataFreshnessBanner'
import { EmptyState } from '@/components/ui/StatusBanner'

function maybeAnimate(reduceMotion: boolean) {
    if (reduceMotion) return
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
}

export default function ForecastTable() {
    const { locationName, errorMsg } = useLocation()
    const { thresholds } = useWeatherConfig()
    const {
        weatherData,
        isBootstrapping,
        error,
        refetch,
        lastUpdated,
        isShowingCachedData,
        isOfflineOrStale,
    } = useWeatherForLocation()
    const { width: screenWidth, fontScale } = useWindowDimensions()
    const condensed = fontScale > 1.15 || PixelRatio.getFontScale() > 1.15
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
    const [refreshing, setRefreshing] = useState(false)
    const [reduceMotion, setReduceMotion] = useState(false)
    const [expandedDay, setExpandedDay] = useState<string | null>(null)
    const [flyabilityFilter, setFlyabilityFilter] =
        useState<ForecastFilter>('all')
    const [selectedHour, setSelectedHour] = useState<HourlyWeatherData | null>(
        null
    )
    const [isModalVisible, setIsModalVisible] = useState(false)

    useEffect(() => {
        void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion)
        const sub = AccessibilityInfo.addEventListener(
            'reduceMotionChanged',
            setReduceMotion
        )
        return () => sub.remove()
    }, [])

    const handleHourPress = (hour: HourlyWeatherData) => {
        setSelectedHour(hour)
        setIsModalVisible(true)
    }

    const utcOffsetSeconds = getWeatherUtcOffset(weatherData)

    useEffect(() => {
        if (!weatherData) return
        setExpandedDay((prev) => {
            if (prev) return prev
            return getLocationDayKey(new Date(), utcOffsetSeconds)
        })
    }, [weatherData, utcOffsetSeconds])

    const filteredDays = useMemo(() => {
        if (!weatherData) return [] as [string, HourlyWeatherData[]][]

        const groupedByDay = weatherData.hourlyData.reduce(
            (acc, hour) => {
                if (isBefore(hour.time, startOfHour(new Date()))) return acc
                const date = getLocationDayKey(hour.time, utcOffsetSeconds)
                if (!acc[date]) acc[date] = []
                acc[date].push(hour)
                return acc
            },
            {} as Record<string, HourlyWeatherData[]>
        )

        return Object.entries(groupedByDay).filter(
            ([, hours]) => hours.length > 0
        )
    }, [weatherData, utcOffsetSeconds])

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

    const onRefresh = useCallback(async () => {
        setRefreshing(true)
        try {
            await refetch()
        } finally {
            setRefreshing(false)
        }
    }, [refetch])

    const formatWind = (s: number | null) =>
        formatWindDisplay(s, thresholds.windSpeed.unit).replace(
            /\s*(mph|km\/h)$/,
            ''
        )

    const formatTemp = (t: number | null) =>
        formatTemperatureDisplay(t, thresholds.temperature.unit).replace(
            /°[CF]$/,
            ''
        )

    if (isBootstrapping) {
        return (
            <SafeAreaView className="flex-1 bg-background">
                <LocationBar locationName={locationName} />
                <LoadingSpinner
                    text="Loading forecast data..."
                    color={Theme.colors.accent}
                />
            </SafeAreaView>
        )
    }

    if (!weatherData) {
        const message =
            error ?? errorMsg ?? 'No weather data available'
        return (
            <SafeAreaView className="flex-1 bg-background">
                <LocationBar locationName={locationName} />
                <EmptyState
                    icon="cloud-off-outline"
                    message={message}
                    actionLabel="Retry"
                    onAction={() => void refetch()}
                />
            </SafeAreaView>
        )
    }

    const ageLabel = (() => {
        const ts = lastUpdated ?? weatherData.meta?.fetchedAt
        if (!ts) return null
        const ageMin = Math.max(0, Math.round((Date.now() - ts) / 60_000))
        if (ageMin < 1) return 'Updated just now'
        return `Updated ${ageMin} min ago`
    })()

    const sourceLabel =
        weatherData.meta?.source ?? WEATHER_SOURCE_OPEN_METEO

    return (
        <SafeAreaView className="flex-1 bg-background">
            <LocationBar locationName={locationName} />

            <ForecastPlanningSummary
                summary={planningSummary}
                utcOffsetSeconds={utcOffsetSeconds}
            />

            <View className="flex-row items-center justify-between px-4 pb-1">
                <View className="flex-1 mr-2">
                    <DataFreshnessBanner
                        lastUpdatedLabel={ageLabel}
                        sourceLabel={sourceLabel}
                        isShowingCachedData={isShowingCachedData}
                        isOfflineOrStale={isOfflineOrStale}
                    />
                </View>
                <Pressable
                    onPress={() => void onRefresh()}
                    accessibilityRole="button"
                    accessibilityLabel="Refresh forecast"
                    hitSlop={8}
                    style={{
                        minHeight: Theme.touchTarget,
                        minWidth: Theme.touchTarget,
                        justifyContent: 'center',
                    }}
                >
                    <MaterialCommunityIcons
                        name="refresh"
                        size={20}
                        color={Theme.colors.accent}
                    />
                </Pressable>
            </View>

            {error && weatherData ? (
                <Text
                    className="px-4 pb-1 text-xs"
                    style={{
                        fontFamily: 'DMSans',
                        color: Theme.colors.danger,
                    }}
                    accessibilityRole="alert"
                >
                    {error} Showing last available data.
                </Text>
            ) : null}

            <View className="px-4 py-2">
                <SegmentChips
                    options={[
                        { id: 'all', label: 'All' },
                        { id: 'flyable', label: 'Flyable' },
                        { id: 'blocked', label: 'Blocked' },
                    ]}
                    value={flyabilityFilter}
                    onChange={(id) => {
                        maybeAnimate(reduceMotion)
                        setFlyabilityFilter(id)
                    }}
                    condensed={condensed}
                />
            </View>

            <View className="flex-row justify-end px-4 py-2">
                <SegmentChips
                    options={[
                        { id: 'cards', label: 'Cards' },
                        { id: 'table', label: 'Table' },
                    ]}
                    value={viewMode}
                    onChange={(mode) => {
                        maybeAnimate(reduceMotion)
                        setViewMode(mode)
                    }}
                    accessibilityLabelPrefix="View"
                    condensed={condensed}
                />
            </View>

            {displayDays.length === 0 ? (
                <EmptyState
                    icon="calendar-search"
                    message={
                        flyabilityFilter === 'flyable'
                            ? 'No flyable hours in the forecast'
                            : flyabilityFilter === 'blocked'
                              ? 'No blocked hours in the forecast'
                              : 'No forecast hours available'
                    }
                />
            ) : viewMode === 'cards' ? (
                <FlatList
                    data={displayDays}
                    keyExtractor={([date]) => date}
                    className="flex-1"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 32 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={Theme.colors.accent}
                            colors={[Theme.colors.accent]}
                        />
                    }
                    renderItem={({ item: [date, hours] }) => (
                        <DayCardStrip
                            date={date}
                            hours={hours}
                            thresholds={thresholds}
                            isExpanded={expandedDay === date}
                            onToggle={() => {
                                maybeAnimate(reduceMotion)
                                setExpandedDay((prev) =>
                                    prev === date ? null : date
                                )
                            }}
                            formatWind={formatWind}
                            formatTemp={formatTemp}
                            onHourPress={handleHourPress}
                            utcOffsetSeconds={utcOffsetSeconds}
                            condensed={condensed}
                        />
                    )}
                />
            ) : (
                <TableView
                    filteredDays={displayDays}
                    thresholds={thresholds}
                    screenWidth={screenWidth}
                    formatWind={formatWind}
                    formatTemp={formatTemp}
                    utcOffsetSeconds={utcOffsetSeconds}
                    onHourPress={handleHourPress}
                    condensed={condensed}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                />
            )}

            <WeatherDetailsModal
                isVisible={isModalVisible}
                onClose={() => setIsModalVisible(false)}
                hourData={selectedHour}
                utcOffsetSeconds={utcOffsetSeconds}
            />
        </SafeAreaView>
    )
}

interface ForecastPlanningSummaryProps {
    summary: ReturnType<typeof buildForecastPlanningSummary>
    utcOffsetSeconds: number
}

function ForecastPlanningSummary({
    summary,
    utcOffsetSeconds,
}: ForecastPlanningSummaryProps) {
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
        const dayKey = getLocationDayKey(
            nextWindow.startTime,
            utcOffsetSeconds
        )
        windowText = `Next window: ${formatDayLabel(dayKey, utcOffsetSeconds)} · ${formatWindowTimeRange(nextWindow.startTime, nextWindow.endTime, utcOffsetSeconds)} (${nextWindow.durationHours} hr${nextWindow.durationHours === 1 ? '' : 's'})`
    }

    const bestDayText =
        bestDay && bestDay.safeCount > 0
            ? `Best day: ${formatDayLabel(bestDay.date, utcOffsetSeconds)} · ${bestDay.safeCount}/${bestDay.totalHours} flyable`
            : 'No flyable hours in upcoming forecast'

    return (
        <View
            className="mx-4 mt-2 mb-1 p-4 rounded-xl"
            style={{
                backgroundColor: Theme.colors.surfaceElevated,
                borderWidth: 1,
                borderColor: Theme.colors.border,
                opacity: 0.9,
            }}
            accessibilityRole="summary"
        >
            <View className="flex-row items-start">
                <MaterialCommunityIcons
                    name="calendar-clock"
                    size={22}
                    color={Theme.colors.accent}
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

interface DayCardStripProps {
    date: string
    hours: HourlyWeatherData[]
    thresholds: ReturnType<typeof useWeatherConfig>['thresholds']
    isExpanded: boolean
    onToggle: () => void
    formatWind: (s: number | null) => string
    formatTemp: (t: number | null) => string
    onHourPress: (hour: HourlyWeatherData) => void
    utcOffsetSeconds: number
    condensed: boolean
}

function DayCardStrip({
    date,
    hours,
    thresholds,
    isExpanded,
    onToggle,
    formatWind,
    formatTemp,
    onHourPress,
    utcOffsetSeconds,
    condensed,
}: DayCardStripProps) {
    const isToday = isLocationTodayDayKey(date, utcOffsetSeconds)
    const safeCount = hours.filter((h) =>
        DroneFlyabilityService.checkFlyingConditions(h, thresholds).isSuitable
    ).length
    const timeFontSize = condensed ? 12 : 15
    const tempFontSize = condensed ? 16 : 18

    return (
        <View
            className="mb-3 mx-4 rounded-2xl overflow-hidden"
            style={{
                backgroundColor: Theme.colors.surfaceElevated,
                borderWidth: 1,
                borderColor: isToday
                    ? 'rgba(245, 158, 11, 0.25)'
                    : Theme.colors.border,
                opacity: 0.95,
            }}
        >
            <Pressable
                onPress={onToggle}
                accessibilityRole="button"
                accessibilityState={{ expanded: isExpanded }}
                accessibilityLabel={`${formatDayKey(date, 'full')}, ${safeCount} of ${hours.length} flyable hours, ${isExpanded ? 'expanded' : 'collapsed'}`}
                className="flex-row items-center justify-between px-4 py-3"
                style={{
                    minHeight: Theme.touchTarget,
                    backgroundColor: isToday
                        ? Theme.colors.accentDim
                        : Theme.colors.surface,
                    borderBottomWidth: isExpanded ? 1 : 0,
                    borderBottomColor: Theme.colors.border,
                }}
            >
                <View className="flex-1">
                    <Text
                        className="text-slate-100 font-semibold"
                        style={{ fontFamily: 'Outfit-SemiBold' }}
                    >
                        {formatDayKey(date, 'weekday')}
                    </Text>
                    <Text
                        className="text-slate-500 text-xs mt-0.5"
                        style={{ fontFamily: 'DMSans' }}
                    >
                        {formatDayKey(date, 'monthDay')} · {safeCount}/
                        {hours.length} flyable
                    </Text>
                </View>
                <View className="flex-row items-center gap-2">
                    <View
                        className="px-2.5 py-1 rounded-full"
                        style={{
                            backgroundColor:
                                safeCount > 0
                                    ? Theme.colors.safeMuted
                                    : Theme.colors.dangerMuted,
                        }}
                        accessibilityLabel={
                            safeCount > 0 ? 'Safe day' : 'Unsafe day'
                        }
                    >
                        <Text
                            className="text-xs font-medium"
                            style={{
                                fontFamily: 'Outfit-SemiBold',
                                color:
                                    safeCount > 0
                                        ? Theme.colors.safe
                                        : Theme.colors.danger,
                            }}
                        >
                            {safeCount > 0 ? 'Safe' : 'Unsafe'}
                        </Text>
                    </View>
                    <MaterialCommunityIcons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={Theme.colors.accent}
                    />
                </View>
            </Pressable>

            {!isExpanded ? (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="py-3 px-3"
                    contentContainerStyle={{ paddingRight: 16 }}
                >
                    {hours.map((hour, i) => {
                        const cond =
                            DroneFlyabilityService.checkFlyingConditions(
                                hour,
                                thresholds
                            )
                        const colors = cond.isSuitable
                            ? (['#065f46', '#047857'] as const)
                            : (['#991b1b', '#b91c1c'] as const)
                        const timeLabel = formatLocationTime(
                            hour.time,
                            utcOffsetSeconds
                        )
                        return (
                            <Pressable
                                key={i}
                                onPress={() => onHourPress(hour)}
                                accessibilityRole="button"
                                accessibilityLabel={`Hour ${timeLabel}, ${cond.isSuitable ? 'safe' : 'unsafe'}`}
                                style={{ minHeight: Theme.touchTarget }}
                            >
                                <LinearGradient
                                    colors={colors}
                                    className="rounded-lg px-3 py-2 mr-2"
                                    style={{
                                        minWidth: condensed ? 52 : 56,
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
                                        {timeLabel}
                                    </Text>
                                    <Text
                                        className="text-white font-bold text-sm"
                                        style={{
                                            fontFamily: 'Outfit-SemiBold',
                                        }}
                                    >
                                        {formatTemp(hour.temperature2m)}°
                                    </Text>
                                    <Text
                                        className="text-white/80 text-[10px] mt-0.5"
                                        style={{ fontFamily: 'DMSans' }}
                                    >
                                        {cond.isSuitable ? 'Safe' : 'Unsafe'}
                                    </Text>
                                </LinearGradient>
                            </Pressable>
                        )
                    })}
                </ScrollView>
            ) : (
                <View className="py-1">
                    {hours.map((hour, i) => {
                        const cond =
                            DroneFlyabilityService.checkFlyingConditions(
                                hour,
                                thresholds
                            )
                        const borderColor = cond.isSuitable
                            ? Theme.colors.safe
                            : Theme.colors.danger
                        const timeLabel = formatLocationTime(
                            hour.time,
                            utcOffsetSeconds
                        )
                        return (
                            <Pressable
                                key={i}
                                onPress={() => onHourPress(hour)}
                                accessibilityRole="button"
                                accessibilityLabel={`Hour ${timeLabel}, ${cond.isSuitable ? 'safe to fly' : 'not safe to fly'}`}
                                className="flex-row items-center px-4 py-3.5"
                                style={{
                                    minHeight: Theme.touchTarget,
                                    backgroundColor:
                                        i % 2 === 1
                                            ? 'rgba(255, 255, 255, 0.02)'
                                            : 'transparent',
                                    borderLeftWidth: 4,
                                    borderLeftColor: borderColor,
                                }}
                            >
                                <Text
                                    className="text-slate-400 w-14"
                                    style={{
                                        fontFamily: 'DMSans',
                                        fontSize: timeFontSize,
                                    }}
                                >
                                    {timeLabel}
                                </Text>
                                <Text
                                    className="text-slate-100 flex-1 text-center"
                                    style={{
                                        fontFamily: 'Outfit-SemiBold',
                                        fontSize: tempFontSize,
                                    }}
                                >
                                    {formatTemp(hour.temperature2m)}°
                                </Text>
                                <Text
                                    className="text-xs mr-2 w-12 text-right"
                                    style={{
                                        fontFamily: 'Outfit-SemiBold',
                                        color: cond.isSuitable
                                            ? Theme.colors.safe
                                            : Theme.colors.danger,
                                    }}
                                >
                                    {cond.isSuitable ? 'Safe' : 'Unsafe'}
                                </Text>
                                <View className="flex-row items-center w-24 justify-end">
                                    <MaterialCommunityIcons
                                        name="weather-windy"
                                        size={14}
                                        color={Theme.colors.textMuted}
                                    />
                                    <Text
                                        className="text-slate-400 ml-1"
                                        style={{
                                            fontFamily: 'DMSans',
                                            fontSize: condensed ? 12 : 14,
                                        }}
                                    >
                                        {formatWind(hour.windSpeed10m)} /{' '}
                                        {formatWind(hour.windGusts10m)}
                                    </Text>
                                </View>
                            </Pressable>
                        )
                    })}
                </View>
            )}
        </View>
    )
}

function TableView({
    filteredDays,
    thresholds,
    screenWidth,
    formatWind,
    formatTemp,
    onHourPress,
    utcOffsetSeconds,
    condensed,
    refreshing,
    onRefresh,
}: {
    filteredDays: [string, HourlyWeatherData[]][]
    thresholds: ReturnType<typeof useWeatherConfig>['thresholds']
    screenWidth: number
    formatWind: (s: number | null) => string
    formatTemp: (t: number | null) => string
    onHourPress: (hour: HourlyWeatherData) => void
    utcOffsetSeconds: number
    condensed: boolean
    refreshing: boolean
    onRefresh: () => void
}) {
    const timeWidth = condensed ? 64 : 80
    const cellWidth = (screenWidth - timeWidth) / 5

    type TableRow =
        | { kind: 'day'; date: string; safeCount: number; total: number }
        | { kind: 'hour'; hour: HourlyWeatherData; date: string }

    const rows = useMemo(() => {
        const result: TableRow[] = []
        for (const [date, hours] of filteredDays) {
            const safeCount = hours.filter((h) =>
                DroneFlyabilityService.checkFlyingConditions(h, thresholds)
                    .isSuitable
            ).length
            result.push({
                kind: 'day',
                date,
                safeCount,
                total: hours.length,
            })
            for (const hour of hours) {
                result.push({ kind: 'hour', hour, date })
            }
        }
        return result
    }, [filteredDays, thresholds])

    const TableCell = ({
        value,
        isSafe = true,
        icon,
        width = 60,
        statusLabel,
    }: {
        value?: string | number
        isSafe?: boolean | 'warning' | 'neutral'
        icon?: keyof typeof MaterialCommunityIcons.glyphMap
        width?: number
        statusLabel?: string
    }) => {
        const bg =
            isSafe === 'neutral'
                ? Theme.colors.weatherNeutralSurface
                : isSafe === 'warning'
                  ? 'rgba(120, 53, 15, 0.5)'
                  : isSafe
                    ? 'rgba(6, 95, 70, 0.5)'
                    : 'rgba(127, 29, 29, 0.5)'
        const a11yLabel = statusLabel
            ? `${value ?? ''}, ${statusLabel}`
            : String(value ?? '')
        return (
            <View
                className="p-2 justify-center items-center border-r border-b border-white/5"
                style={{
                    width,
                    backgroundColor: bg,
                    minHeight: Theme.touchTarget,
                }}
                accessibilityLabel={a11yLabel}
            >
                {icon ? (
                    <MaterialCommunityIcons
                        name={icon}
                        size={18}
                        color={Theme.colors.text}
                    />
                ) : (
                    <Text
                        className="text-slate-100 text-center text-sm"
                        style={{
                            fontFamily: 'DMSans',
                            fontSize: condensed ? 11 : 14,
                        }}
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
            style={{
                width,
                backgroundColor: Theme.colors.surfaceElevated,
            }}
        >
            <MaterialCommunityIcons
                name={icon}
                size={18}
                color={Theme.colors.accent}
            />
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
                    <TableHeader
                        label="Time"
                        icon="clock-outline"
                        width={timeWidth}
                    />
                    <TableHeader
                        label="Temp"
                        icon="thermometer"
                        width={cellWidth}
                    />
                    <TableHeader
                        label="Wind"
                        icon="weather-windy"
                        width={cellWidth}
                    />
                    <TableHeader
                        label="Gusts"
                        icon="weather-windy-variant"
                        width={cellWidth}
                    />
                    <TableHeader
                        label="Cloud"
                        icon="weather-cloudy"
                        width={cellWidth}
                    />
                    <TableHeader
                        label="Rain"
                        icon="weather-pouring"
                        width={cellWidth}
                    />
                </View>
            </View>
            <FlatList
                data={rows}
                keyExtractor={(row, index) =>
                    row.kind === 'day'
                        ? `day-${row.date}`
                        : `hour-${row.date}-${index}`
                }
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Theme.colors.accent}
                        colors={[Theme.colors.accent]}
                    />
                }
                renderItem={({ item: row }) => {
                    if (row.kind === 'day') {
                        return (
                            <View
                                className="flex-row items-center justify-between border-t border-b border-white/5 py-3 px-4"
                                style={{
                                    width: screenWidth,
                                    backgroundColor: Theme.colors.surface,
                                    minHeight: Theme.touchTarget,
                                }}
                                accessibilityRole="header"
                                accessibilityLabel={`${formatDayKey(row.date, 'full')}, ${row.safeCount} of ${row.total} flyable`}
                            >
                                <Text
                                    className="text-slate-100 font-semibold"
                                    style={{ fontFamily: 'Outfit-SemiBold' }}
                                >
                                    {formatDayKey(row.date, 'full')}
                                </Text>
                                <View
                                    className="px-2.5 py-1 rounded-full"
                                    style={{
                                        backgroundColor:
                                            row.safeCount > 0
                                                ? Theme.colors.safeMuted
                                                : Theme.colors.dangerMuted,
                                    }}
                                >
                                    <Text
                                        className="text-xs font-medium"
                                        style={{
                                            fontFamily: 'Outfit-SemiBold',
                                            color:
                                                row.safeCount > 0
                                                    ? Theme.colors.safe
                                                    : Theme.colors.danger,
                                        }}
                                    >
                                        {row.safeCount > 0 ? 'Safe' : 'Unsafe'}
                                    </Text>
                                </View>
                            </View>
                        )
                    }

                    const { hour } = row
                    const cond = DroneFlyabilityService.checkFlyingConditions(
                        hour,
                        thresholds
                    )
                    const tempStatus = getCheckStatus(cond, 'temperature')
                    const windStatus = getCheckStatus(cond, 'windSpeed')
                    const gustStatus = getCheckStatus(cond, 'windGust')
                    const precipStatus = getCheckStatus(cond, 'precipitation')
                    return (
                        <Pressable
                            className="flex-row"
                            onPress={() => onHourPress(hour)}
                            accessibilityRole="button"
                            accessibilityLabel={`Hour ${formatLocationTime(hour.time, utcOffsetSeconds)}, ${cond.isSuitable ? 'safe to fly' : 'not safe to fly'}`}
                        >
                            <TableCell
                                value={formatLocationTime(
                                    hour.time,
                                    utcOffsetSeconds
                                )}
                                width={timeWidth}
                                statusLabel={
                                    cond.isSuitable ? 'safe' : 'unsafe'
                                }
                            />
                            <TableCell
                                value={formatTemp(hour.temperature2m)}
                                isSafe={checkStatusToCellSafe(tempStatus)}
                                statusLabel={tempStatus}
                                width={cellWidth}
                            />
                            <TableCell
                                value={formatWind(hour.windSpeed10m)}
                                isSafe={checkStatusToCellSafe(windStatus)}
                                statusLabel={windStatus}
                                width={cellWidth}
                            />
                            <TableCell
                                value={formatWind(hour.windGusts10m)}
                                isSafe={checkStatusToCellSafe(gustStatus)}
                                statusLabel={gustStatus}
                                width={cellWidth}
                            />
                            <TableCell
                                value={formatPercentDisplay(hour.cloudCover)}
                                isSafe="neutral"
                                statusLabel="informational"
                                width={cellWidth}
                            />
                            <TableCell
                                value={formatPercentDisplay(
                                    hour.precipitationProbability
                                )}
                                isSafe={checkStatusToCellSafe(precipStatus)}
                                statusLabel={precipStatus}
                                width={cellWidth}
                            />
                        </Pressable>
                    )
                }}
            />
        </>
    )
}
