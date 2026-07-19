import {
    View,
    Text,
    FlatList,
    useWindowDimensions,
    Pressable,
    RefreshControl,
    Platform,
    PixelRatio,
    ListRenderItem,
    StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useWeatherConfig } from '@/contexts/WeatherConfigContext'
import { LocationBar } from '@/components/LocationBar'
import { WeatherDetailsModal } from '@/components/WeatherDetailsModal'
import { useLocation } from '@/contexts/LocationContext'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { memo, useState, useMemo, useCallback } from 'react'
import {
    HourlyWeatherData,
    WEATHER_SOURCE_OPEN_METEO,
} from '@/types/weather'
import { LinearGradient } from 'expo-linear-gradient'
import { useWeatherForLocation } from '@/hooks/useWeatherForLocation'
import { useFocusAwareFreshnessLabel } from '@/hooks/useFocusAwareFreshnessLabel'
import {
    formatDayLabel,
    formatWindowTimeRange,
    ForecastFilter,
} from '@/utils/forecastPlanning'
import {
    buildForecastViewModel,
    filterForecastDays,
    ForecastDayViewModel,
    ForecastHourViewModel,
    ForecastViewModel,
} from '@/utils/forecastViewModel'
import {
    formatDayKey,
    getLocationDayKey,
    isLocationTodayDayKey,
} from '@/utils/locationTime'
import { Theme } from '@/constants/Theme'
import { SegmentChips } from '@/components/ui/SegmentChips'
import { DataFreshnessBanner } from '@/components/ui/DataFreshnessBanner'
import { EmptyState } from '@/components/ui/StatusBanner'

const ANDROID_CLIP = Platform.OS === 'android'
const IS_IOS = Platform.OS === 'ios'

/** Tighter on Android (with clipping); slightly larger windows on iOS to reduce scroll mount bursts. */
const CARDS_LIST_WINDOW = {
    initialNumToRender: IS_IOS ? 4 : 2,
    maxToRenderPerBatch: IS_IOS ? 3 : 2,
    windowSize: IS_IOS ? 7 : 3,
} as const
const HOUR_STRIP_WINDOW = {
    initialNumToRender: IS_IOS ? 8 : 6,
    maxToRenderPerBatch: IS_IOS ? 6 : 4,
    windowSize: IS_IOS ? 5 : 3,
} as const
const TABLE_LIST_WINDOW = {
    initialNumToRender: IS_IOS ? 10 : 6,
    maxToRenderPerBatch: IS_IOS ? 6 : 4,
    windowSize: IS_IOS ? 7 : 5,
} as const

const forecastPaneStyles = StyleSheet.create({
    visible: { flex: 1 },
    hidden: { display: 'none' },
})

type ForecastViewMode = 'cards' | 'table'

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
    const [viewMode, setViewMode] = useState<ForecastViewMode>('cards')
    // Mount each mode once, then keep it (display:none) so switches avoid remount.
    const [mountedModes, setMountedModes] = useState<
        Record<ForecastViewMode, boolean>
    >({ cards: true, table: false })
    const [refreshing, setRefreshing] = useState(false)
    // undefined = default to today once view model is ready; null = user collapsed all
    const [expandedDay, setExpandedDay] = useState<string | null | undefined>(
        undefined
    )
    const [flyabilityFilter, setFlyabilityFilter] =
        useState<ForecastFilter>('all')
    const [selectedHour, setSelectedHour] = useState<HourlyWeatherData | null>(
        null
    )
    const [isModalVisible, setIsModalVisible] = useState(false)

    const handleHourPress = useCallback((hour: HourlyWeatherData) => {
        setSelectedHour(hour)
        setIsModalVisible(true)
    }, [])

    const closeModal = useCallback(() => {
        setIsModalVisible(false)
    }, [])

    const viewModel = useMemo((): ForecastViewModel | null => {
        if (!weatherData) return null
        return buildForecastViewModel(weatherData, thresholds)
    }, [weatherData, thresholds])

    const utcOffsetSeconds = viewModel?.utcOffsetSeconds ?? 0
    const defaultExpandedDay = viewModel
        ? getLocationDayKey(new Date(), utcOffsetSeconds)
        : null
    const activeExpandedDay =
        expandedDay === undefined ? defaultExpandedDay : expandedDay

    const displayDays = useMemo(
        () =>
            viewModel
                ? filterForecastDays(viewModel.days, flyabilityFilter)
                : [],
        [viewModel, flyabilityFilter]
    )

    const onRefresh = useCallback(async () => {
        setRefreshing(true)
        try {
            await refetch()
        } finally {
            setRefreshing(false)
        }
    }, [refetch])

    const handleFilterChange = useCallback((id: ForecastFilter) => {
        setFlyabilityFilter(id)
    }, [])

    const handleViewModeChange = useCallback((mode: ForecastViewMode) => {
        setViewMode(mode)
        setMountedModes((prev) =>
            prev[mode] ? prev : { ...prev, [mode]: true }
        )
    }, [])

    const toggleDay = useCallback(
        (date: string) => {
            setExpandedDay((prev) => {
                const current =
                    prev === undefined ? defaultExpandedDay : prev
                return current === date ? null : date
            })
        },
        [defaultExpandedDay]
    )

    const dayKeyExtractor = useCallback(
        (item: ForecastDayViewModel) => item.date,
        []
    )

    const renderDayCard = useCallback<ListRenderItem<ForecastDayViewModel>>(
        ({ item }) => (
            <DayCardStrip
                day={item}
                isExpanded={activeExpandedDay === item.date}
                onToggle={toggleDay}
                onHourPress={handleHourPress}
                utcOffsetSeconds={utcOffsetSeconds}
                condensed={condensed}
            />
        ),
        [
            activeExpandedDay,
            toggleDay,
            handleHourPress,
            utcOffsetSeconds,
            condensed,
        ]
    )

    const freshnessTimestamp =
        lastUpdated ?? weatherData?.meta?.fetchedAt ?? null
    const ageLabel = useFocusAwareFreshnessLabel(freshnessTimestamp)

    if (isBootstrapping) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <LocationBar locationName={locationName} />
                <LoadingSpinner
                    text="Loading forecast data..."
                    color={Theme.colors.accent}
                />
            </SafeAreaView>
        )
    }

    if (!weatherData || !viewModel) {
        const message = error ?? errorMsg ?? 'No weather data available'
        return (
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
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

    const sourceLabel =
        weatherData.meta?.source ?? WEATHER_SOURCE_OPEN_METEO

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <LocationBar locationName={locationName} />

            <ForecastPlanningSummary
                summary={viewModel.planningSummary}
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
                    onChange={handleFilterChange}
                    condensed={condensed}
                    expand
                />
            </View>

            <View className="flex-row justify-end px-4 py-2">
                <SegmentChips
                    options={[
                        { id: 'cards', label: 'Cards' },
                        { id: 'table', label: 'Table' },
                    ]}
                    value={viewMode}
                    onChange={handleViewModeChange}
                    accessibilityLabelPrefix="View"
                    condensed={condensed}
                />
            </View>

            {/* Keep panes mounted across empty filters so Cards ↔ Table and
                filter restores do not remount heavy lists. */}
            <View className="flex-1">
                {mountedModes.cards ? (
                    <View
                        style={
                            viewMode === 'cards'
                                ? forecastPaneStyles.visible
                                : forecastPaneStyles.hidden
                        }
                        pointerEvents={
                            viewMode === 'cards' && displayDays.length > 0
                                ? 'auto'
                                : 'none'
                        }
                        accessibilityElementsHidden={
                            viewMode !== 'cards' || displayDays.length === 0
                        }
                        importantForAccessibility={
                            viewMode === 'cards' && displayDays.length > 0
                                ? 'yes'
                                : 'no-hide-descendants'
                        }
                    >
                        <FlatList
                            data={displayDays}
                            keyExtractor={dayKeyExtractor}
                            className="flex-1"
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 32 }}
                            initialNumToRender={
                                CARDS_LIST_WINDOW.initialNumToRender
                            }
                            maxToRenderPerBatch={
                                CARDS_LIST_WINDOW.maxToRenderPerBatch
                            }
                            windowSize={CARDS_LIST_WINDOW.windowSize}
                            removeClippedSubviews={ANDROID_CLIP}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={onRefresh}
                                    tintColor={Theme.colors.accent}
                                    colors={[Theme.colors.accent]}
                                />
                            }
                            renderItem={renderDayCard}
                        />
                    </View>
                ) : null}
                {mountedModes.table ? (
                    <View
                        style={
                            viewMode === 'table'
                                ? forecastPaneStyles.visible
                                : forecastPaneStyles.hidden
                        }
                        pointerEvents={
                            viewMode === 'table' && displayDays.length > 0
                                ? 'auto'
                                : 'none'
                        }
                        accessibilityElementsHidden={
                            viewMode !== 'table' || displayDays.length === 0
                        }
                        importantForAccessibility={
                            viewMode === 'table' && displayDays.length > 0
                                ? 'yes'
                                : 'no-hide-descendants'
                        }
                    >
                        <TableView
                            days={displayDays}
                            screenWidth={screenWidth}
                            utcOffsetSeconds={utcOffsetSeconds}
                            onHourPress={handleHourPress}
                            condensed={condensed}
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                        />
                    </View>
                ) : null}
                {displayDays.length === 0 ? (
                    <View
                        style={StyleSheet.absoluteFill}
                        pointerEvents="box-none"
                        accessibilityElementsHidden={false}
                    >
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
                    </View>
                ) : null}
            </View>

            <WeatherDetailsModal
                isVisible={isModalVisible}
                onClose={closeModal}
                hourData={selectedHour}
                utcOffsetSeconds={utcOffsetSeconds}
            />
        </SafeAreaView>
    )
}

interface ForecastPlanningSummaryProps {
    summary: ForecastViewModel['planningSummary']
    utcOffsetSeconds: number
}

const ForecastPlanningSummary = memo(function ForecastPlanningSummary({
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
})

interface DayCardStripProps {
    day: ForecastDayViewModel
    isExpanded: boolean
    onToggle: (date: string) => void
    onHourPress: (hour: HourlyWeatherData) => void
    utcOffsetSeconds: number
    condensed: boolean
}

const HourChip = memo(function HourChip({
    hourVm,
    onHourPress,
    condensed,
}: {
    hourVm: ForecastHourViewModel
    onHourPress: (hour: HourlyWeatherData) => void
    condensed: boolean
}) {
    const colors = hourVm.isSuitable
        ? (['#065f46', '#047857'] as const)
        : (['#991b1b', '#b91c1c'] as const)

    return (
        <Pressable
            onPress={() => onHourPress(hourVm.hour)}
            accessibilityRole="button"
            accessibilityLabel={`Hour ${hourVm.timeLabel}, ${hourVm.isSuitable ? 'safe' : 'unsafe'}`}
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
                    {hourVm.timeLabel}
                </Text>
                <Text
                    className="text-white font-bold text-sm"
                    style={{ fontFamily: 'Outfit-SemiBold' }}
                >
                    {hourVm.tempDisplay}°
                </Text>
                <Text
                    className="text-white/80 text-[10px] mt-0.5"
                    style={{ fontFamily: 'DMSans' }}
                >
                    {hourVm.isSuitable ? 'Safe' : 'Unsafe'}
                </Text>
            </LinearGradient>
        </Pressable>
    )
})

const ExpandedHourRow = memo(function ExpandedHourRow({
    hourVm,
    index,
    onHourPress,
    condensed,
}: {
    hourVm: ForecastHourViewModel
    index: number
    onHourPress: (hour: HourlyWeatherData) => void
    condensed: boolean
}) {
    const timeFontSize = condensed ? 12 : 15
    const tempFontSize = condensed ? 16 : 18
    const borderColor = hourVm.isSuitable
        ? Theme.colors.safe
        : Theme.colors.danger

    return (
        <Pressable
            onPress={() => onHourPress(hourVm.hour)}
            accessibilityRole="button"
            accessibilityLabel={`Hour ${hourVm.timeLabel}, ${hourVm.isSuitable ? 'safe to fly' : 'not safe to fly'}`}
            className="flex-row items-center px-4 py-3.5"
            style={{
                minHeight: Theme.touchTarget,
                backgroundColor:
                    index % 2 === 1
                        ? 'rgba(255, 255, 255, 0.02)'
                        : 'transparent',
                borderLeftWidth: 4,
                borderLeftColor: borderColor,
            }}
        >
            <Text
                className="text-slate-400 w-14"
                style={{ fontFamily: 'DMSans', fontSize: timeFontSize }}
            >
                {hourVm.timeLabel}
            </Text>
            <Text
                className="text-slate-100 flex-1 text-center"
                style={{
                    fontFamily: 'Outfit-SemiBold',
                    fontSize: tempFontSize,
                }}
            >
                {hourVm.tempDisplay}°
            </Text>
            <Text
                className="text-xs mr-2 w-12 text-right"
                style={{
                    fontFamily: 'Outfit-SemiBold',
                    color: hourVm.isSuitable
                        ? Theme.colors.safe
                        : Theme.colors.danger,
                }}
            >
                {hourVm.isSuitable ? 'Safe' : 'Unsafe'}
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
                    {hourVm.windDisplay} / {hourVm.gustDisplay}
                </Text>
            </View>
        </Pressable>
    )
})

const DayCardStrip = memo(function DayCardStrip({
    day,
    isExpanded,
    onToggle,
    onHourPress,
    utcOffsetSeconds,
    condensed,
}: DayCardStripProps) {
    const { date, hours, safeCount, totalHours } = day
    const isToday = isLocationTodayDayKey(date, utcOffsetSeconds)

    const handleToggle = useCallback(() => {
        onToggle(date)
    }, [onToggle, date])

    const hourKeyExtractor = useCallback(
        (item: ForecastHourViewModel) => String(item.key),
        []
    )

    const renderHourChip = useCallback<ListRenderItem<ForecastHourViewModel>>(
        ({ item }) => (
            <HourChip
                hourVm={item}
                onHourPress={onHourPress}
                condensed={condensed}
            />
        ),
        [onHourPress, condensed]
    )

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
                onPress={handleToggle}
                accessibilityRole="button"
                accessibilityState={{ expanded: isExpanded }}
                accessibilityLabel={`${formatDayKey(date, 'full')}, ${safeCount} of ${totalHours} flyable hours, ${isExpanded ? 'expanded' : 'collapsed'}`}
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
                        {totalHours} flyable
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
                <FlatList
                    horizontal
                    data={hours}
                    keyExtractor={hourKeyExtractor}
                    renderItem={renderHourChip}
                    showsHorizontalScrollIndicator={false}
                    className="py-3 px-3"
                    contentContainerStyle={{ paddingRight: 16 }}
                    initialNumToRender={HOUR_STRIP_WINDOW.initialNumToRender}
                    maxToRenderPerBatch={HOUR_STRIP_WINDOW.maxToRenderPerBatch}
                    windowSize={HOUR_STRIP_WINDOW.windowSize}
                    removeClippedSubviews={ANDROID_CLIP}
                />
            ) : (
                <View className="py-1">
                    {hours.map((hourVm, i) => (
                        <ExpandedHourRow
                            key={hourVm.key}
                            hourVm={hourVm}
                            index={i}
                            onHourPress={onHourPress}
                            condensed={condensed}
                        />
                    ))}
                </View>
            )}
        </View>
    )
})

type TableRow =
    | {
          kind: 'day'
          date: string
          safeCount: number
          total: number
          key: string
      }
    | {
          kind: 'hour'
          hourVm: ForecastHourViewModel
          date: string
          key: string
      }

function TableHeader({
    label,
    icon,
    width,
}: {
    label: string
    icon: keyof typeof MaterialCommunityIcons.glyphMap
    width: number
}) {
    return (
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
}

const TableCell = memo(function TableCell({
    value,
    isSafe = true,
    icon,
    width = 60,
    statusLabel,
    condensed,
}: {
    value?: string | number
    isSafe?: boolean | 'warning' | 'neutral'
    icon?: keyof typeof MaterialCommunityIcons.glyphMap
    width?: number
    statusLabel?: string
    condensed: boolean
}) {
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
})

const TableHourRow = memo(function TableHourRow({
    hourVm,
    timeWidth,
    cellWidth,
    onHourPress,
    condensed,
}: {
    hourVm: ForecastHourViewModel
    timeWidth: number
    cellWidth: number
    onHourPress: (hour: HourlyWeatherData) => void
    condensed: boolean
}) {
    return (
        <Pressable
            className="flex-row"
            onPress={() => onHourPress(hourVm.hour)}
            accessibilityRole="button"
            accessibilityLabel={`Hour ${hourVm.timeLabel}, ${hourVm.isSuitable ? 'safe to fly' : 'not safe to fly'}`}
        >
            <TableCell
                value={hourVm.timeLabel}
                width={timeWidth}
                statusLabel={hourVm.isSuitable ? 'safe' : 'unsafe'}
                condensed={condensed}
            />
            <TableCell
                value={hourVm.tempDisplay}
                isSafe={hourVm.tempCellSafe}
                statusLabel={hourVm.tempStatus}
                width={cellWidth}
                condensed={condensed}
            />
            <TableCell
                value={hourVm.windDisplay}
                isSafe={hourVm.windCellSafe}
                statusLabel={hourVm.windStatus}
                width={cellWidth}
                condensed={condensed}
            />
            <TableCell
                value={hourVm.gustDisplay}
                isSafe={hourVm.gustCellSafe}
                statusLabel={hourVm.gustStatus}
                width={cellWidth}
                condensed={condensed}
            />
            <TableCell
                value={hourVm.cloudDisplay}
                isSafe="neutral"
                statusLabel="informational"
                width={cellWidth}
                condensed={condensed}
            />
            <TableCell
                value={hourVm.precipDisplay}
                isSafe={hourVm.precipCellSafe}
                statusLabel={hourVm.precipStatus}
                width={cellWidth}
                condensed={condensed}
            />
        </Pressable>
    )
})

const TableView = memo(function TableView({
    days,
    screenWidth,
    onHourPress,
    condensed,
    refreshing,
    onRefresh,
}: {
    days: ForecastDayViewModel[]
    screenWidth: number
    utcOffsetSeconds: number
    onHourPress: (hour: HourlyWeatherData) => void
    condensed: boolean
    refreshing: boolean
    onRefresh: () => void
}) {
    const timeWidth = condensed ? 64 : 80
    const cellWidth = (screenWidth - timeWidth) / 5

    const rows = useMemo(() => {
        const result: TableRow[] = []
        for (const day of days) {
            result.push({
                kind: 'day',
                date: day.date,
                safeCount: day.safeCount,
                total: day.totalHours,
                key: `day-${day.date}`,
            })
            for (const hourVm of day.hours) {
                result.push({
                    kind: 'hour',
                    hourVm,
                    date: day.date,
                    key: `hour-${hourVm.key}`,
                })
            }
        }
        return result
    }, [days])

    const keyExtractor = useCallback((row: TableRow) => row.key, [])

    const renderItem = useCallback<ListRenderItem<TableRow>>(
        ({ item: row }) => {
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

            return (
                <TableHourRow
                    hourVm={row.hourVm}
                    timeWidth={timeWidth}
                    cellWidth={cellWidth}
                    onHourPress={onHourPress}
                    condensed={condensed}
                />
            )
        },
        [screenWidth, timeWidth, cellWidth, onHourPress, condensed]
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
                keyExtractor={keyExtractor}
                initialNumToRender={TABLE_LIST_WINDOW.initialNumToRender}
                maxToRenderPerBatch={TABLE_LIST_WINDOW.maxToRenderPerBatch}
                windowSize={TABLE_LIST_WINDOW.windowSize}
                removeClippedSubviews={ANDROID_CLIP}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Theme.colors.accent}
                        colors={[Theme.colors.accent]}
                    />
                }
                renderItem={renderItem}
            />
        </>
    )
})
