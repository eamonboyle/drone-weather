import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ActivityIndicator,
    Modal,
    ScrollView,
    Switch,
    Platform,
} from 'react-native'
import {
    Camera,
    type CameraRef,
    GeoJSONSource,
    Layer,
    Map,
    UserLocation,
} from '@maplibre/maplibre-react-native'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocation } from '@/contexts/LocationContext'
import {
    guessCountryCode,
    isInUkBounds,
    MAP_CONFIG,
} from '@/constants/mapConfig'
import { Theme } from '@/constants/Theme'
import { selectionHaptic } from '@/utils/haptics'
import {
    categoryDisplayLabel,
    categoryFillColor,
} from '@/services/airspace/classifyAirspace'
import { getOpenAipPackForCountry } from '@/services/airspace/airspacePackService'
import { loadBundledUkRestrictions } from '@/services/airspace/ukAirspaceAsset'
import type {
    AirspaceFeatureCollection,
    AirspaceSource,
    SelectedAirspaceFeature,
} from '@/types/airspace'

interface MapCenter {
    latitude: number
    longitude: number
}

const EMPTY: AirspaceFeatureCollection = {
    type: 'FeatureCollection',
    features: [],
}

const FILL_COLOR_EXPR: unknown = [
    'match',
    ['get', 'category'],
    'restricted',
    '#ef4444',
    'controlled',
    '#3b82f6',
    '#f59e0b',
]

/** Always visible — hard no-go / airport surface zones. */
const PRIORITY_TYPE_FILTER: unknown = [
    'in',
    ['get', 'typeLabel'],
    [
        'literal',
        [
            'PROHIBITED',
            'OVERFLIGHT_RESTRICTION',
            'CTR',
            'ATZ',
            'FRZ',
            'RPZ',
            'UAS',
        ],
    ],
]

const DETAIL_TYPE_FILTER: unknown = ['!', PRIORITY_TYPE_FILTER]

/** Restricted / RMZ clutter only appears once zoomed in. */
const DETAIL_MIN_ZOOM = 9

function readBool(value: unknown): boolean | undefined {
    if (typeof value === 'boolean') return value
    if (value === 'true') return true
    if (value === 'false') return false
    return undefined
}

function pickSelectedAirspace(
    feature: {
        geometry?: GeoJSON.Geometry | null
        properties?: Record<string, unknown> | null
    },
    packs: AirspaceFeatureCollection[] = []
): SelectedAirspaceFeature | null {
    const props = feature.properties
    if (!props) return null

    const id = String(props.id ?? '')
    if (!id) return null

    let geometry = feature.geometry
    if (
        !geometry ||
        (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon')
    ) {
        const match = packs
            .flatMap((pack) => pack.features)
            .find((item) => item.properties.id === id)
        geometry = match?.geometry
    }
    if (
        !geometry ||
        (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon')
    ) {
        return null
    }

    return {
        id,
        name: String(props.name ?? 'Airspace'),
        typeLabel: String(props.typeLabel ?? ''),
        source: (props.source as AirspaceSource) ?? 'openaip',
        category:
            (props.category as SelectedAirspaceFeature['category']) ??
            'advisory',
        lowerLimit:
            typeof props.lowerLimit === 'string' ? props.lowerLimit : undefined,
        upperLimit:
            typeof props.upperLimit === 'string' ? props.upperLimit : undefined,
        country:
            typeof props.country === 'string' ? props.country : undefined,
        icaoClass:
            typeof props.icaoClass === 'string' ? props.icaoClass : undefined,
        byNotam: readBool(props.byNotam),
        onDemand: readBool(props.onDemand),
        onRequest: readBool(props.onRequest),
        geometry,
    }
}

export function DroneMapView() {
    const { location } = useLocation()
    const cameraRef = useRef<CameraRef>(null)
    const [mapReady, setMapReady] = useState(false)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [showUkLayer, setShowUkLayer] = useState(true)
    const [showOpenAipLayer, setShowOpenAipLayer] = useState(true)
    const [openAipPack, setOpenAipPack] =
        useState<AirspaceFeatureCollection>(EMPTY)
    const [isFetchingPack, setIsFetchingPack] = useState(false)
    const [selectedFeature, setSelectedFeature] =
        useState<SelectedAirspaceFeature | null>(null)
    const [packCountry, setPackCountry] = useState('gb')
    const [layersOpen, setLayersOpen] = useState(false)

    const ukPack = useMemo(() => loadBundledUkRestrictions(), [])
    const lastFlownRef = useRef<{ latitude: number; longitude: number } | null>(
        null
    )

    const [center, setCenter] = useState<MapCenter>(() => ({
        latitude:
            location?.coords.latitude ?? MAP_CONFIG.defaultCenter.latitude,
        longitude:
            location?.coords.longitude ?? MAP_CONFIG.defaultCenter.longitude,
    }))

    // Follow active location (search / GPS refresh). Skip tiny GPS jitter.
    useEffect(() => {
        if (!location) return
        const next = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
        }
        const prev = lastFlownRef.current
        const movedFar =
            !prev ||
            Math.abs(prev.latitude - next.latitude) > 0.001 ||
            Math.abs(prev.longitude - next.longitude) > 0.001
        if (!movedFar) return

        lastFlownRef.current = next
        setCenter(next)
        setSelectedFeature(null)

        if (!mapReady) return
        cameraRef.current?.flyTo({
            center: [next.longitude, next.latitude],
            zoom: MAP_CONFIG.defaultZoom,
            duration: 900,
        })
    }, [location, mapReady])

    // Camera only honors initialViewState on mount — fly once when the map
    // becomes ready if a location was already selected while loading.
    useEffect(() => {
        if (!mapReady || !lastFlownRef.current) return
        const { latitude, longitude } = lastFlownRef.current
        cameraRef.current?.flyTo({
            center: [longitude, latitude],
            zoom: MAP_CONFIG.defaultZoom,
            duration: 0,
        })
    }, [mapReady])

    const inUk = isInUkBounds(center.latitude, center.longitude)
    const ukSource = ukPack.metadata?.source ?? 'openaip'
    const effectiveDate =
        ukPack.metadata?.effectiveFrom ??
        openAipPack.metadata?.generatedAt?.slice(0, 10)
    const statusMeta = [
        effectiveDate,
        packCountry ? packCountry.toUpperCase() : null,
    ]
        .filter((part): part is string => Boolean(part))
        .join('  ·  ')

    const loadCountryPack = useCallback(
        async (lat: number, lng: number, options: { force?: boolean } = {}) => {
            const country = guessCountryCode(lat, lng)
            setPackCountry(country)
            setIsFetchingPack(true)
            setLoadError(null)
            try {
                const pack = await getOpenAipPackForCountry(country, options)
                setOpenAipPack(pack)
            } catch (error) {
                setLoadError(
                    error instanceof Error
                        ? error.message
                        : 'Failed to load airspace data'
                )
            } finally {
                setIsFetchingPack(false)
            }
        },
        []
    )

    useEffect(() => {
        void loadCountryPack(center.latitude, center.longitude)
    }, [center.latitude, center.longitude, loadCountryPack])

    useEffect(() => {
        setShowOpenAipLayer(!inUk)
        setShowUkLayer(inUk)
    }, [inUk])

    const handleRecenter = () => {
        if (!location) return
        selectionHaptic()
        const next = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
        }
        setCenter(next)
        cameraRef.current?.flyTo({
            center: [next.longitude, next.latitude],
            zoom: MAP_CONFIG.defaultZoom,
            duration: 800,
        })
    }

    const handleRefreshPack = () => {
        selectionHaptic()
        void loadCountryPack(center.latitude, center.longitude, {
            force: true,
        })
    }

    const selectedId = selectedFeature?.id ?? ''
    const selectedCollection = useMemo((): AirspaceFeatureCollection => {
        if (!selectedFeature) return EMPTY
        return {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    id: selectedFeature.id,
                    geometry: selectedFeature.geometry,
                    properties: {
                        id: selectedFeature.id,
                        name: selectedFeature.name,
                        source: selectedFeature.source,
                        category: selectedFeature.category,
                        typeLabel: selectedFeature.typeLabel,
                    },
                },
            ],
        }
    }, [selectedFeature])

    const fillOpacityExpr = useMemo((): unknown => {
        if (!selectedId) return 0.2
        return [
            'case',
            ['==', ['get', 'id'], selectedId],
            0.38,
            0.08,
        ]
    }, [selectedId])

    const openAipFillOpacityExpr = useMemo((): unknown => {
        const base = inUk ? 0.1 : 0.2
        if (!selectedId) return base
        return [
            'case',
            ['==', ['get', 'id'], selectedId],
            0.38,
            inUk ? 0.05 : 0.08,
        ]
    }, [selectedId, inUk])

    const ukVisible = showUkLayer && ukPack.features.length > 0
    const openAipVisible = showOpenAipLayer && openAipPack.features.length > 0
    const ukLabel = ukSource === 'nats' ? 'UK · NATS' : 'UK pack'
    const categoryColor = selectedFeature
        ? categoryFillColor(selectedFeature.category)
        : Theme.colors.accent
    const flagLabels = selectedFeature
        ? [
              selectedFeature.byNotam ? 'Active by NOTAM' : null,
              selectedFeature.onDemand ? 'On demand' : null,
              selectedFeature.onRequest ? 'On request' : null,
          ].filter((label): label is string => Boolean(label))
        : []

    return (
        <View style={styles.shell}>
            <View style={styles.mapContainer}>
                <Map
                    style={styles.map}
                    mapStyle={MAP_CONFIG.mapStyleUrl}
                    onDidFinishLoadingMap={() => setMapReady(true)}
                    onDidFailLoadingMap={() =>
                        setLoadError('Unable to load basemap tiles')
                    }
                    attribution={false}
                    logo={false}
                    accessibilityLabel="Airspace reference map"
                >
                    <Camera
                        ref={cameraRef}
                        initialViewState={{
                            center: [center.longitude, center.latitude],
                            zoom: MAP_CONFIG.defaultZoom,
                        }}
                    />
                    <UserLocation />

                    {ukVisible ? (
                        <GeoJSONSource
                            id="uk-airspace"
                            data={ukPack}
                            onPress={(event) => {
                                const feature =
                                    event.nativeEvent.features?.[0]
                                if (!feature) return
                                const selected = pickSelectedAirspace(
                                    {
                                        geometry: feature.geometry as
                                            | GeoJSON.Geometry
                                            | undefined,
                                        properties:
                                            feature.properties as Record<
                                                string,
                                                unknown
                                            > | null,
                                    },
                                    [ukPack, openAipPack]
                                )
                                if (!selected) return
                                selectionHaptic()
                                setSelectedFeature(selected)
                            }}
                        >
                            <Layer
                                type="fill"
                                id="uk-airspace-priority-fill"
                                filter={PRIORITY_TYPE_FILTER as never}
                                paint={{
                                    'fill-color': FILL_COLOR_EXPR as never,
                                    'fill-opacity': fillOpacityExpr as never,
                                }}
                            />
                            <Layer
                                type="line"
                                id="uk-airspace-priority-line"
                                filter={PRIORITY_TYPE_FILTER as never}
                                paint={{
                                    'line-color': FILL_COLOR_EXPR as never,
                                    'line-width': 1.5,
                                    'line-opacity': 0.85,
                                }}
                            />
                            <Layer
                                type="fill"
                                id="uk-airspace-detail-fill"
                                filter={DETAIL_TYPE_FILTER as never}
                                minzoom={DETAIL_MIN_ZOOM}
                                paint={{
                                    'fill-color': FILL_COLOR_EXPR as never,
                                    'fill-opacity': fillOpacityExpr as never,
                                }}
                            />
                            <Layer
                                type="line"
                                id="uk-airspace-detail-line"
                                filter={DETAIL_TYPE_FILTER as never}
                                minzoom={DETAIL_MIN_ZOOM}
                                paint={{
                                    'line-color': FILL_COLOR_EXPR as never,
                                    'line-width': 1.5,
                                    'line-opacity': 0.85,
                                }}
                            />
                        </GeoJSONSource>
                    ) : null}

                    {openAipVisible ? (
                        <GeoJSONSource
                            id="openaip-airspace"
                            data={openAipPack}
                            onPress={(event) => {
                                const feature =
                                    event.nativeEvent.features?.[0]
                                if (!feature) return
                                const selected = pickSelectedAirspace(
                                    {
                                        geometry: feature.geometry as
                                            | GeoJSON.Geometry
                                            | undefined,
                                        properties:
                                            feature.properties as Record<
                                                string,
                                                unknown
                                            > | null,
                                    },
                                    [ukPack, openAipPack]
                                )
                                if (!selected) return
                                selectionHaptic()
                                setSelectedFeature(selected)
                            }}
                        >
                            <Layer
                                type="fill"
                                id="openaip-airspace-priority-fill"
                                filter={PRIORITY_TYPE_FILTER as never}
                                paint={{
                                    'fill-color': FILL_COLOR_EXPR as never,
                                    'fill-opacity':
                                        openAipFillOpacityExpr as never,
                                }}
                            />
                            <Layer
                                type="line"
                                id="openaip-airspace-priority-line"
                                filter={PRIORITY_TYPE_FILTER as never}
                                paint={{
                                    'line-color': FILL_COLOR_EXPR as never,
                                    'line-width': 1.25,
                                    'line-opacity': 0.85,
                                }}
                            />
                            <Layer
                                type="fill"
                                id="openaip-airspace-detail-fill"
                                filter={DETAIL_TYPE_FILTER as never}
                                minzoom={DETAIL_MIN_ZOOM}
                                paint={{
                                    'fill-color': FILL_COLOR_EXPR as never,
                                    'fill-opacity':
                                        openAipFillOpacityExpr as never,
                                }}
                            />
                            <Layer
                                type="line"
                                id="openaip-airspace-detail-line"
                                filter={DETAIL_TYPE_FILTER as never}
                                minzoom={DETAIL_MIN_ZOOM}
                                paint={{
                                    'line-color': FILL_COLOR_EXPR as never,
                                    'line-width': 1,
                                    'line-opacity': 0.7,
                                }}
                            />
                        </GeoJSONSource>
                    ) : null}

                    {selectedFeature ? (
                        <GeoJSONSource
                            id="selected-airspace"
                            data={selectedCollection}
                        >
                            <Layer
                                type="fill"
                                id="selected-airspace-fill"
                                paint={{
                                    'fill-color': categoryColor,
                                    'fill-opacity': 0.22,
                                }}
                            />
                            <Layer
                                type="line"
                                id="selected-airspace-line"
                                paint={{
                                    'line-color': '#ffffff',
                                    'line-width': 3.5,
                                    'line-opacity': 0.95,
                                }}
                            />
                        </GeoJSONSource>
                    ) : null}
                </Map>

                {/* One quiet briefing strip — the map stays the hero */}
                <View style={styles.topChrome} pointerEvents="box-none">
                    <LinearGradient
                        colors={[
                            'rgba(8, 9, 12, 0.8)',
                            'rgba(8, 9, 12, 0.35)',
                            'rgba(8, 9, 12, 0)',
                        ]}
                        style={styles.topScrim}
                        pointerEvents="none"
                    />
                    <View style={styles.briefingBar}>
                        <View
                            style={styles.switchBank}
                            accessibilityRole="toolbar"
                        >
                            <SourceSwitch
                                label={ukLabel}
                                active={showUkLayer}
                                disabled={!inUk && ukPack.features.length === 0}
                                onPress={() => {
                                    selectionHaptic()
                                    setShowUkLayer((v) => !v)
                                }}
                            />
                            <SourceSwitch
                                label="OpenAIP"
                                active={showOpenAipLayer}
                                onPress={() => {
                                    selectionHaptic()
                                    setShowOpenAipLayer((v) => !v)
                                }}
                            />
                        </View>
                        <Pressable
                            onPress={() => {
                                selectionHaptic()
                                setLayersOpen(true)
                            }}
                            style={({ pressed }) => [
                                styles.layersButton,
                                pressed && styles.controlPressed,
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel="Airspace layers and legend"
                            hitSlop={6}
                        >
                            {isFetchingPack ? (
                                <ActivityIndicator
                                    size="small"
                                    color={Theme.colors.accent}
                                />
                            ) : (
                                <MaterialCommunityIcons
                                    name="layers-outline"
                                    size={20}
                                    color={Theme.colors.accent}
                                />
                            )}
                        </Pressable>
                    </View>

                    <View style={styles.statusLine} pointerEvents="none">
                        <Text style={styles.statusLabel}>Reference only</Text>
                        {statusMeta ? (
                            <Text style={styles.statusMeta} numberOfLines={1}>
                                {`  ·  ${statusMeta}`}
                            </Text>
                        ) : null}
                    </View>
                </View>

                <View style={styles.sideControls} pointerEvents="box-none">
                    <MapControl
                        icon="crosshairs-gps"
                        label="Recenter"
                        onPress={handleRecenter}
                    />
                </View>

                {(!mapReady || isFetchingPack) && (
                    <View
                        style={styles.loadingBadge}
                        pointerEvents="none"
                        accessibilityLabel="Map loading"
                    >
                        <ActivityIndicator
                            size="small"
                            color={Theme.colors.accent}
                        />
                        <Text style={styles.loadingBadgeText}>
                            {!mapReady ? 'Loading map…' : 'Updating…'}
                        </Text>
                    </View>
                )}

                {loadError && mapReady ? (
                    <View style={styles.errorBanner} accessibilityRole="alert">
                        <Text style={styles.errorBannerText}>{loadError}</Text>
                        <Pressable
                            onPress={handleRefreshPack}
                            accessibilityRole="button"
                            accessibilityLabel="Retry loading airspace data"
                        >
                            <Text style={styles.errorRetry}>Retry</Text>
                        </Pressable>
                    </View>
                ) : null}

                {selectedFeature ? (
                    <View
                        style={styles.featureSheet}
                        accessibilityRole="summary"
                    >
                        <View style={styles.sheetHandle} />
                        <View
                            style={[
                                styles.categoryBar,
                                { backgroundColor: categoryColor },
                            ]}
                        />
                        <View style={styles.featureSheetHeader}>
                            <View style={styles.featureTextBlock}>
                                <Text style={styles.featureTitle}>
                                    {selectedFeature.name}
                                </Text>
                                <Text style={styles.featureSubtitle}>
                                    {categoryDisplayLabel(
                                        selectedFeature.category
                                    )}
                                </Text>
                                <View style={styles.chipTags}>
                                    {selectedFeature.typeLabel ? (
                                        <View style={styles.tag}>
                                            <Text style={styles.tagText}>
                                                {selectedFeature.typeLabel}
                                            </Text>
                                        </View>
                                    ) : null}
                                    {selectedFeature.icaoClass ? (
                                        <View style={styles.tag}>
                                            <Text style={styles.tagText}>
                                                Class {selectedFeature.icaoClass}
                                            </Text>
                                        </View>
                                    ) : null}
                                    <View style={styles.tag}>
                                        <Text style={styles.tagText}>
                                            {selectedFeature.source === 'nats'
                                                ? 'NATS / UK AIP'
                                                : 'OpenAIP'}
                                        </Text>
                                    </View>
                                    {selectedFeature.country ? (
                                        <View style={styles.tag}>
                                            <Text style={styles.tagText}>
                                                {selectedFeature.country}
                                            </Text>
                                        </View>
                                    ) : null}
                                </View>
                            </View>
                            <Pressable
                                onPress={() => setSelectedFeature(null)}
                                style={({ pressed }) => [
                                    styles.closeButton,
                                    pressed && styles.controlPressed,
                                ]}
                                accessibilityRole="button"
                                accessibilityLabel="Close airspace details"
                                hitSlop={8}
                            >
                                <MaterialCommunityIcons
                                    name="close"
                                    size={18}
                                    color={Theme.colors.textSecondary}
                                />
                            </Pressable>
                        </View>

                        {(selectedFeature.lowerLimit ||
                            selectedFeature.upperLimit) && (
                            <View style={styles.detailRows}>
                                <DetailRow
                                    label="Floor"
                                    value={
                                        selectedFeature.lowerLimit ?? 'Surface'
                                    }
                                />
                                <DetailRow
                                    label="Ceiling"
                                    value={
                                        selectedFeature.upperLimit ?? 'Unknown'
                                    }
                                />
                            </View>
                        )}

                        {flagLabels.length > 0 ? (
                            <View style={styles.flagRow}>
                                {flagLabels.map((label) => (
                                    <View key={label} style={styles.flagChip}>
                                        <Text style={styles.flagChipText}>
                                            {label}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        ) : null}

                        <Text style={styles.featureDisclaimer}>
                            Reference only — not a substitute for official AIP /
                            NOTAM briefing.
                        </Text>
                    </View>
                ) : null}
            </View>

            <LayersSheet
                visible={layersOpen}
                onClose={() => setLayersOpen(false)}
                onRefresh={handleRefreshPack}
                ukLabel={ukLabel}
                showUkLayer={showUkLayer}
                showOpenAipLayer={showOpenAipLayer}
                onToggleUk={() => setShowUkLayer((v) => !v)}
                onToggleOpenAip={() => setShowOpenAipLayer((v) => !v)}
                ukDisabled={!inUk && ukPack.features.length === 0}
                effectiveDate={effectiveDate}
                packCountry={packCountry}
            />
        </View>
    )
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={styles.detailValue}>{value}</Text>
        </View>
    )
}

function SourceSwitch({
    label,
    active,
    onPress,
    disabled,
}: {
    label: string
    active: boolean
    onPress: () => void
    disabled?: boolean
}) {
    // The chip surface lives on this wrapper View — a flex:1 Pressable both
    // collapses to content width and drops its own background on iOS, so the
    // View owns sizing + fill and the Pressable only handles touch + layout.
    return (
        <View
            style={[
                styles.switchSlot,
                active && styles.switchSlotActive,
                disabled && styles.sourceSwitchDisabled,
            ]}
        >
            <Pressable
                onPress={onPress}
                disabled={disabled}
                style={({ pressed }) => [
                    styles.sourceSwitch,
                    pressed && !disabled && styles.controlPressed,
                ]}
                accessibilityRole="switch"
                accessibilityState={{ checked: active, disabled }}
                accessibilityLabel={`${label} airspace layer`}
            >
                <Text
                    style={[
                        styles.sourceSwitchLabel,
                        active && styles.sourceSwitchLabelActive,
                    ]}
                    numberOfLines={1}
                >
                    {label}
                </Text>
            </Pressable>
        </View>
    )
}

function MapControl({
    icon,
    label,
    onPress,
}: {
    icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']
    label: string
    onPress: () => void
}) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.mapControl,
                pressed && styles.controlPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={label}
        >
            <MaterialCommunityIcons
                name={icon}
                size={22}
                color={Theme.colors.accent}
            />
        </Pressable>
    )
}

function LayersSheet({
    visible,
    onClose,
    onRefresh,
    ukLabel,
    showUkLayer,
    showOpenAipLayer,
    onToggleUk,
    onToggleOpenAip,
    ukDisabled,
    effectiveDate,
    packCountry,
}: {
    visible: boolean
    onClose: () => void
    onRefresh: () => void
    ukLabel: string
    showUkLayer: boolean
    showOpenAipLayer: boolean
    onToggleUk: () => void
    onToggleOpenAip: () => void
    ukDisabled: boolean
    effectiveDate?: string
    packCountry: string
}) {
    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            presentationStyle={
                Platform.OS === 'ios' ? 'overFullScreen' : undefined
            }
            onRequestClose={onClose}
        >
            <Pressable style={styles.sheetScrim} onPress={onClose}>
                <Pressable
                    style={styles.layersSheet}
                    onPress={(e) => e.stopPropagation()}
                >
                    <View style={styles.sheetHandle} />
                    <View style={styles.layersSheetHeader}>
                        <View style={styles.layersTitleBlock}>
                            <Text style={styles.layersEyebrow}>Map</Text>
                            <Text style={styles.layersTitle}>Airspace</Text>
                        </View>
                        <Pressable
                            onPress={onClose}
                            style={({ pressed }) => [
                                styles.sheetClose,
                                pressed && styles.controlPressed,
                            ]}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel="Close layers"
                        >
                            <MaterialCommunityIcons
                                name="close"
                                size={20}
                                color={Theme.colors.textSecondary}
                            />
                        </Pressable>
                    </View>

                    <ScrollView
                        bounces
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.layersScrollContent}
                    >
                        <Text style={styles.layersBody}>
                            Zoomed out: prohibited zones and CTRs. Zoom in for
                            restricted and RMZ detail.
                        </Text>

                        <Text style={styles.sectionLabel}>Sources</Text>
                        <View style={styles.insetGroup}>
                            <LayerSwitchRow
                                label={ukLabel}
                                detail="Bundled UK restrictions"
                                value={showUkLayer}
                                disabled={ukDisabled}
                                onValueChange={onToggleUk}
                            />
                            <View style={styles.insetSeparator} />
                            <LayerSwitchRow
                                label="OpenAIP"
                                detail="Drone-relevant community airspace"
                                value={showOpenAipLayer}
                                onValueChange={onToggleOpenAip}
                            />
                            <View style={styles.insetSeparator} />
                            <Pressable
                                onPress={() => {
                                    selectionHaptic()
                                    onRefresh()
                                    onClose()
                                }}
                                style={({ pressed }) => [
                                    styles.insetActionRow,
                                    pressed && styles.controlPressed,
                                ]}
                                accessibilityRole="button"
                                accessibilityLabel="Refresh airspace data"
                            >
                                <View style={styles.insetActionContent}>
                                    <MaterialCommunityIcons
                                        name="cloud-download-outline"
                                        size={22}
                                        color={Theme.colors.accent}
                                        style={styles.insetActionIcon}
                                    />
                                    <View style={styles.layerRowText}>
                                        <Text style={styles.insetActionLabel}>
                                            Refresh data
                                        </Text>
                                        <Text style={styles.layerRowDetail}>
                                            Re-download this country’s OpenAIP
                                            pack
                                        </Text>
                                    </View>
                                    <MaterialCommunityIcons
                                        name="chevron-right"
                                        size={22}
                                        color={Theme.colors.textMuted}
                                        style={styles.insetActionChevron}
                                    />
                                </View>
                            </Pressable>
                        </View>

                        <Text style={styles.sectionLabel}>Colour key</Text>
                        <View style={styles.insetGroup}>
                            <View style={styles.legendGrid}>
                                <LegendSwatch
                                    color="#ef4444"
                                    label="Restricted"
                                />
                                <LegendSwatch
                                    color="#3b82f6"
                                    label="Controlled"
                                />
                                <LegendSwatch
                                    color="#f59e0b"
                                    label="Advisory"
                                />
                            </View>
                        </View>

                        <Text style={styles.sectionLabel}>About</Text>
                        <View style={styles.insetGroup}>
                            <View style={styles.aboutBlock}>
                                {effectiveDate ? (
                                    <Text style={styles.metaLine}>
                                        Updated {effectiveDate}
                                        {packCountry
                                            ? ` · ${packCountry.toUpperCase()}`
                                            : ''}
                                    </Text>
                                ) : null}
                                <Text style={styles.notice}>
                                    Reference only — not a no-fly authority
                                </Text>
                                <Text style={styles.attribution}>
                                    {MAP_CONFIG.natsAttribution}{' '}
                                    {MAP_CONFIG.openAipAttribution}
                                </Text>
                            </View>
                        </View>
                    </ScrollView>
                </Pressable>
            </Pressable>
        </Modal>
    )
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
    return (
        <View style={styles.legendSwatch}>
            <View style={[styles.legendTickWide, { backgroundColor: color }]} />
            <Text style={styles.legendLabel}>{label}</Text>
        </View>
    )
}

function LayerSwitchRow({
    label,
    detail,
    value,
    onValueChange,
    disabled,
}: {
    label: string
    detail: string
    value: boolean
    onValueChange: () => void
    disabled?: boolean
}) {
    return (
        <Pressable
            onPress={() => {
                if (disabled) return
                selectionHaptic()
                onValueChange()
            }}
            disabled={disabled}
            style={[
                styles.insetRow,
                disabled && styles.sourceSwitchDisabled,
            ]}
            accessibilityRole="switch"
            accessibilityState={{ checked: value, disabled }}
        >
            <View style={styles.layerRowText}>
                <Text style={styles.layerRowLabel}>{label}</Text>
                <Text style={styles.layerRowDetail}>{detail}</Text>
            </View>
            <Switch
                value={value}
                disabled={disabled}
                onValueChange={() => {
                    if (disabled) return
                    selectionHaptic()
                    onValueChange()
                }}
                trackColor={{
                    false: 'rgba(255, 255, 255, 0.12)',
                    true: 'rgba(245, 158, 11, 0.55)',
                }}
                thumbColor={
                    Platform.OS === 'android'
                        ? value
                            ? Theme.colors.accent
                            : Theme.colors.textMuted
                        : '#ffffff'
                }
                ios_backgroundColor="rgba(255, 255, 255, 0.12)"
            />
        </Pressable>
    )
}

const FROST = 'rgba(14, 16, 21, 0.9)'
const FROST_BORDER = 'rgba(255, 255, 255, 0.12)'
/** Recessed instrument panel — near-opaque so the amber chip tint stays true. */
const WELL = 'rgba(6, 7, 10, 0.92)'

const styles = StyleSheet.create({
    shell: {
        flex: 1,
    },
    mapContainer: {
        flex: 1,
        overflow: 'hidden',
        backgroundColor: Theme.colors.surface,
    },
    map: {
        ...StyleSheet.absoluteFill,
        backgroundColor: Theme.colors.surface,
    },
    topChrome: {
        position: 'absolute',
        top: 10,
        left: 14,
        right: 14,
    },
    topScrim: {
        position: 'absolute',
        top: -14,
        left: -14,
        right: -14,
        height: 140,
    },
    briefingBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 5,
        borderRadius: Theme.borderRadius.xl,
        backgroundColor: FROST,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: FROST_BORDER,
        // Bright top edge = light catching the material.
        borderTopColor: 'rgba(255, 255, 255, 0.2)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 14,
        elevation: 8,
    },
    switchBank: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: 4,
        padding: 4,
        borderRadius: Theme.borderRadius.lg,
        backgroundColor: WELL,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(0, 0, 0, 0.5)',
    },
    switchSlot: {
        flex: 1,
        minWidth: 0,
        borderRadius: Theme.borderRadius.md,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    switchSlotActive: {
        backgroundColor: Theme.colors.accent,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        shadowColor: Theme.colors.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
    },
    sourceSwitch: {
        flex: 1,
        minWidth: 0,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 9,
    },
    sourceSwitchDisabled: {
        opacity: 0.4,
    },
    sourceSwitchLabel: {
        color: Theme.colors.textSecondary,
        fontFamily: 'Outfit-SemiBold',
        fontSize: 12.5,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    sourceSwitchLabelActive: {
        color: Theme.colors.textInverse,
    },
    layersButton: {
        width: 44,
        height: 44,
        borderRadius: Theme.borderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: WELL,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(0, 0, 0, 0.4)',
    },
    statusLine: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        paddingLeft: 6,
    },
    statusLabel: {
        color: Theme.colors.accentMuted,
        fontFamily: 'Outfit-SemiBold',
        fontSize: 10.5,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
        textShadowColor: 'rgba(0, 0, 0, 0.9)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    statusMeta: {
        flexShrink: 1,
        color: Theme.colors.textSecondary,
        fontFamily: 'DMSans-Medium',
        fontSize: 10.5,
        letterSpacing: 0.6,
        textShadowColor: 'rgba(0, 0, 0, 0.9)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    sideControls: {
        position: 'absolute',
        right: 12,
        bottom: 20,
        gap: 10,
    },
    mapControl: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: FROST,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: FROST_BORDER,
    },
    controlPressed: {
        opacity: 0.72,
        transform: [{ scale: 0.96 }],
    },
    loadingBadge: {
        position: 'absolute',
        bottom: 20,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: Theme.borderRadius.full,
        backgroundColor: FROST,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: FROST_BORDER,
    },
    loadingBadgeText: {
        color: Theme.colors.textSecondary,
        fontFamily: 'DMSans',
        fontSize: 12,
    },
    errorBanner: {
        position: 'absolute',
        bottom: 20,
        left: 12,
        right: 72,
        backgroundColor: 'rgba(127, 29, 29, 0.94)',
        borderRadius: Theme.borderRadius.md,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    errorBannerText: {
        flex: 1,
        color: Theme.colors.text,
        fontFamily: 'DMSans',
        fontSize: 12,
    },
    errorRetry: {
        color: Theme.colors.accent,
        fontFamily: 'Outfit-SemiBold',
        fontSize: 13,
    },
    featureSheet: {
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: 16,
        backgroundColor: FROST,
        borderRadius: Theme.borderRadius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: FROST_BORDER,
        paddingHorizontal: 14,
        paddingTop: 8,
        paddingBottom: 14,
        gap: 10,
        overflow: 'hidden',
    },
    sheetHandle: {
        alignSelf: 'center',
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        marginBottom: 2,
    },
    categoryBar: {
        height: 3,
        borderRadius: 2,
        marginBottom: 2,
    },
    featureSheetHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    featureTextBlock: {
        flex: 1,
        gap: 4,
    },
    featureTitle: {
        color: Theme.colors.text,
        fontFamily: 'Outfit-SemiBold',
        fontSize: 17,
        letterSpacing: -0.2,
    },
    featureSubtitle: {
        color: Theme.colors.textSecondary,
        fontFamily: 'DMSans',
        fontSize: 13,
    },
    chipTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 4,
    },
    tag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: Theme.borderRadius.sm,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: FROST_BORDER,
    },
    tagText: {
        color: Theme.colors.textSecondary,
        fontFamily: 'DMSans-Medium',
        fontSize: 11,
    },
    detailRows: {
        gap: 6,
        paddingTop: 2,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    detailLabel: {
        color: Theme.colors.textMuted,
        fontFamily: 'DMSans',
        fontSize: 12,
    },
    detailValue: {
        flex: 1,
        textAlign: 'right',
        color: Theme.colors.text,
        fontFamily: 'DMSans-Medium',
        fontSize: 13,
    },
    flagRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    flagChip: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: Theme.borderRadius.sm,
        backgroundColor: 'rgba(245, 158, 11, 0.16)',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(245, 158, 11, 0.35)',
    },
    flagChipText: {
        color: Theme.colors.accent,
        fontFamily: 'DMSans-Medium',
        fontSize: 11,
    },
    featureDisclaimer: {
        color: Theme.colors.textMuted,
        fontFamily: 'DMSans',
        fontSize: 11,
        lineHeight: 15,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
    },
    sheetScrim: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    layersSheet: {
        backgroundColor: Theme.colors.background,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderColor: FROST_BORDER,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 40,
        maxHeight: '78%',
    },
    layersSheetHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    layersTitleBlock: {
        gap: 2,
    },
    layersEyebrow: {
        color: Theme.colors.textMuted,
        fontFamily: 'Outfit-SemiBold',
        fontSize: 11,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    layersTitle: {
        color: Theme.colors.text,
        fontFamily: 'Outfit-SemiBold',
        fontSize: 28,
        letterSpacing: -0.6,
        lineHeight: 32,
    },
    sheetClose: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        marginTop: 4,
    },
    layersScrollContent: {
        paddingBottom: 12,
        gap: 0,
    },
    layersBody: {
        color: Theme.colors.textSecondary,
        fontFamily: 'DMSans',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 18,
        paddingHorizontal: 4,
    },
    sectionLabel: {
        color: Theme.colors.textMuted,
        fontFamily: 'Outfit-SemiBold',
        fontSize: 12,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        marginBottom: 8,
        marginTop: 4,
        paddingHorizontal: 12,
    },
    insetGroup: {
        backgroundColor: Theme.colors.surfaceElevated,
        borderRadius: Theme.borderRadius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: Theme.colors.border,
        overflow: 'hidden',
        marginBottom: 20,
    },
    insetRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        minHeight: 64,
    },
    insetSeparator: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: Theme.colors.border,
        marginLeft: 16,
    },
    insetActionRow: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        minHeight: 64,
        justifyContent: 'center',
    },
    insetActionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        width: '100%',
    },
    insetActionIcon: {
        flexShrink: 0,
    },
    insetActionChevron: {
        flexShrink: 0,
        marginLeft: 4,
    },
    insetActionLabel: {
        color: Theme.colors.accent,
        fontFamily: 'Outfit-SemiBold',
        fontSize: 16,
        letterSpacing: -0.2,
    },
    legendGrid: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 14,
        gap: 8,
    },
    legendSwatch: {
        flex: 1,
        alignItems: 'center',
        gap: 8,
    },
    legendTickWide: {
        width: '100%',
        maxWidth: 56,
        height: 4,
        borderRadius: 2,
    },
    legendLabel: {
        color: Theme.colors.textSecondary,
        fontFamily: 'DMSans-Medium',
        fontSize: 12,
        textAlign: 'center',
    },
    aboutBlock: {
        paddingHorizontal: 14,
        paddingVertical: 14,
        gap: 8,
    },
    layerRowText: {
        flex: 1,
        gap: 2,
    },
    layerRowLabel: {
        color: Theme.colors.text,
        fontFamily: 'Outfit-SemiBold',
        fontSize: 15,
    },
    layerRowDetail: {
        color: Theme.colors.textMuted,
        fontFamily: 'DMSans',
        fontSize: 12,
    },
    metaLine: {
        color: Theme.colors.textMuted,
        fontFamily: 'DMSans',
        fontSize: 12,
    },
    notice: {
        color: Theme.colors.warning,
        fontFamily: 'Outfit-SemiBold',
        fontSize: 12,
        letterSpacing: 0.2,
    },
    attribution: {
        color: Theme.colors.textMuted,
        fontFamily: 'DMSans',
        fontSize: 11,
        lineHeight: 16,
    },
})
