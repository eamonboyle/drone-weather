import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ActivityIndicator,
    Linking,
    Platform,
} from 'react-native'
import { WebView, WebViewNavigation } from 'react-native-webview'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useLocation } from '@/contexts/LocationContext'
import {
    buildEmbedMapUrl,
    buildExternalMapUrl,
    isAllowedMapNavigationUrl,
    MAP_CONFIG,
} from '@/constants/mapConfig'
import { Theme } from '@/constants/Theme'

type MapLoadState = 'loading' | 'ready' | 'error' | 'timeout'

interface MapCenter {
    latitude: number
    longitude: number
}

/**
 * Chrome-like UA helps Google Maps serve a working embed in Android WebView.
 * Default WebView UAs are often blocked or given a degraded shell that never
 * finishes loading.
 */
const MAP_USER_AGENT =
    Platform.OS === 'android'
        ? 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36'
        : undefined

export function DroneMapView() {
    const { location } = useLocation()
    const [loadState, setLoadState] = useState<MapLoadState>('loading')
    const [reloadKey, setReloadKey] = useState(0)
    const hasMarkedReady = useRef(false)
    const loadFailedRef = useRef(false)
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const webViewRef = useRef<WebView>(null)

    // Pin center so GPS ticker updates don't reload the WebView forever
    const [center, setCenter] = useState<MapCenter>(() => ({
        latitude:
            location?.coords.latitude ?? MAP_CONFIG.defaultCenter.latitude,
        longitude:
            location?.coords.longitude ?? MAP_CONFIG.defaultCenter.longitude,
    }))

    // Adopt first real fix once, without chasing every location update
    useEffect(() => {
        if (!location) return
        setCenter((prev) => {
            const isDefault =
                prev.latitude === MAP_CONFIG.defaultCenter.latitude &&
                prev.longitude === MAP_CONFIG.defaultCenter.longitude
            if (!isDefault) return prev
            return {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            }
        })
    }, [location])

    const mapUrl = useMemo(
        () => buildEmbedMapUrl(center.latitude, center.longitude),
        [center.latitude, center.longitude]
    )

    const clearLoadTimeout = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
        }
    }, [])

    const markReady = useCallback(() => {
        if (hasMarkedReady.current || loadFailedRef.current) return
        hasMarkedReady.current = true
        clearLoadTimeout()
        setLoadState('ready')
    }, [clearLoadTimeout])

    const beginLoad = useCallback(() => {
        hasMarkedReady.current = false
        loadFailedRef.current = false
        setLoadState('loading')
        clearLoadTimeout()
        timeoutRef.current = setTimeout(() => {
            if (!hasMarkedReady.current) {
                loadFailedRef.current = true
                setLoadState('timeout')
            }
        }, MAP_CONFIG.loadTimeoutMs)
    }, [clearLoadTimeout])

    useEffect(() => {
        beginLoad()
        return clearLoadTimeout
    }, [mapUrl, reloadKey, beginLoad, clearLoadTimeout])

    // Tear down Google Maps document before native WebView destroy.
    useEffect(() => {
        return () => {
            clearLoadTimeout()
            const webView = webViewRef.current
            if (!webView) return
            try {
                webView.stopLoading()
                webView.injectJavaScript(
                    'try{window.location.replace("about:blank")}catch(e){}'
                )
            } catch {
                // Best-effort; unmount still proceeds.
            }
        }
    }, [clearLoadTimeout])

    const handleRetry = () => {
        setReloadKey((k) => k + 1)
    }

    const handleRecenter = () => {
        if (location) {
            setCenter({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            })
        }
        setReloadKey((k) => k + 1)
    }

    const handleOpenExternal = () => {
        void Linking.openURL(
            buildExternalMapUrl(center.latitude, center.longitude)
        )
    }

    const handleNavigationChange = (navState: WebViewNavigation) => {
        // My Maps often lands on /maps/d/embed or viewer without a clean onLoadEnd
        if (
            navState.loading === false &&
            typeof navState.url === 'string' &&
            isAllowedMapNavigationUrl(navState.url) &&
            navState.url.includes('/maps')
        ) {
            markReady()
        }
    }

    return (
        <View style={styles.shell}>
            <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>UK airspace reference</Text>
                <Text style={styles.infoBody}>
                    This map shows a published UK AIP / My Maps layer for
                    situational awareness only. It is not part of weather
                    flyability and may be incomplete or outdated.
                </Text>
                <View style={styles.legendRow}>
                    <LegendDot color="#ef4444" label="Restricted / danger" />
                    <LegendDot color="#3b82f6" label="Controlled airspace" />
                    <LegendDot color="#f59e0b" label="Other advisory" />
                </View>
                <Text style={styles.notice}>
                    Reference only · Not a no-fly authority
                </Text>
            </View>

            <View style={styles.mapContainer}>
                {loadState === 'loading' || loadState === 'ready' ? (
                    <WebView
                        ref={webViewRef}
                        key={`${reloadKey}-${center.latitude.toFixed(4)}-${center.longitude.toFixed(4)}`}
                        source={{ uri: mapUrl }}
                        style={styles.map}
                        javaScriptEnabled
                        domStorageEnabled
                        cacheEnabled={false}
                        thirdPartyCookiesEnabled
                        sharedCookiesEnabled
                        setSupportMultipleWindows={false}
                        // Broad HTTPS whitelist; isAllowedMapNavigationUrl enforces Google hosts (incl. .co.uk)
                        originWhitelist={['https://*', 'about:blank']}
                        mixedContentMode="never"
                        allowsInlineMediaPlayback
                        mediaPlaybackRequiresUserAction={false}
                        startInLoadingState={false}
                        userAgent={MAP_USER_AGENT}
                        onShouldStartLoadWithRequest={(request) =>
                            isAllowedMapNavigationUrl(request.url)
                        }
                        onLoadProgress={({ nativeEvent }) => {
                            if (nativeEvent.progress >= 0.85) {
                                markReady()
                            }
                        }}
                        onLoadEnd={markReady}
                        onNavigationStateChange={handleNavigationChange}
                        onError={() => {
                            clearLoadTimeout()
                            loadFailedRef.current = true
                            setLoadState('error')
                        }}
                        // Ignore subresource HTTP errors — Maps fires many of them
                        onHttpError={() => undefined}
                        accessibilityLabel="Airspace reference map"
                    />
                ) : null}

                {loadState === 'loading' && (
                    <View
                        style={styles.loadingBadge}
                        pointerEvents="none"
                        accessibilityLabel="Map loading"
                    >
                        <ActivityIndicator
                            size="small"
                            color={Theme.colors.accent}
                        />
                        <Text style={styles.loadingBadgeText}>Loading map…</Text>
                    </View>
                )}

                {(loadState === 'error' || loadState === 'timeout') && (
                    <View style={styles.overlay} accessibilityRole="alert">
                        <MaterialCommunityIcons
                            name="map-marker-off"
                            size={40}
                            color={Theme.colors.accent}
                        />
                        <Text style={styles.overlayText}>
                            {loadState === 'timeout'
                                ? 'Map took too long to load. Check your connection.'
                                : 'Unable to load the airspace map in-app.'}
                        </Text>
                        <Pressable
                            onPress={handleRetry}
                            style={styles.primaryButton}
                            accessibilityRole="button"
                            accessibilityLabel="Retry loading map"
                        >
                            <Text style={styles.primaryButtonText}>Retry</Text>
                        </Pressable>
                        <Pressable
                            onPress={handleOpenExternal}
                            style={styles.secondaryButton}
                            accessibilityRole="button"
                            accessibilityLabel="Open map in external browser"
                        >
                            <Text style={styles.secondaryButtonText}>
                                Open in browser
                            </Text>
                        </Pressable>
                    </View>
                )}
            </View>

            <View style={styles.toolbar}>
                <Pressable
                    onPress={handleRecenter}
                    style={styles.toolbarButton}
                    accessibilityRole="button"
                    accessibilityLabel="Recenter map on current location"
                >
                    <MaterialCommunityIcons
                        name="crosshairs-gps"
                        size={20}
                        color={Theme.colors.accent}
                    />
                    <Text style={styles.toolbarLabel}>Recenter</Text>
                </Pressable>
                <Pressable
                    onPress={handleOpenExternal}
                    style={styles.toolbarButton}
                    accessibilityRole="button"
                    accessibilityLabel="Open map externally"
                >
                    <MaterialCommunityIcons
                        name="open-in-new"
                        size={20}
                        color={Theme.colors.accent}
                    />
                    <Text style={styles.toolbarLabel}>External</Text>
                </Pressable>
            </View>
        </View>
    )
}

function LegendDot({ color, label }: { color: string; label: string }) {
    return (
        <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={styles.legendLabel}>{label}</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    shell: {
        flex: 1,
        gap: 12,
    },
    infoCard: {
        backgroundColor: Theme.colors.surfaceElevated,
        borderRadius: Theme.borderRadius.lg,
        padding: 14,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    infoTitle: {
        color: Theme.colors.text,
        fontFamily: 'Outfit-SemiBold',
        fontSize: 16,
        marginBottom: 6,
    },
    infoBody: {
        color: Theme.colors.textSecondary,
        fontFamily: 'DMSans',
        fontSize: 13,
        lineHeight: 18,
    },
    legendRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 10,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendLabel: {
        color: Theme.colors.textMuted,
        fontFamily: 'DMSans',
        fontSize: 11,
    },
    notice: {
        marginTop: 10,
        color: Theme.colors.warning,
        fontFamily: 'Outfit-SemiBold',
        fontSize: 11,
        letterSpacing: 0.3,
    },
    mapContainer: {
        flex: 1,
        overflow: 'hidden',
        borderRadius: Theme.borderRadius.lg,
        backgroundColor: Theme.colors.surface,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        minHeight: 280,
    },
    map: {
        flex: 1,
        backgroundColor: Theme.colors.surface,
    },
    loadingBadge: {
        position: 'absolute',
        top: 12,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: Theme.borderRadius.full,
        backgroundColor: 'rgba(8, 9, 12, 0.85)',
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    loadingBadgeText: {
        color: Theme.colors.textSecondary,
        fontFamily: 'DMSans',
        fontSize: 12,
    },
    overlay: {
        ...StyleSheet.absoluteFill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(8, 9, 12, 0.92)',
        padding: 24,
        gap: 12,
    },
    overlayText: {
        color: Theme.colors.textSecondary,
        fontFamily: 'DMSans',
        textAlign: 'center',
        fontSize: 14,
    },
    primaryButton: {
        backgroundColor: Theme.colors.accent,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: Theme.borderRadius.md,
        minHeight: 44,
        justifyContent: 'center',
    },
    primaryButtonText: {
        color: Theme.colors.textInverse,
        fontFamily: 'Outfit-SemiBold',
    },
    secondaryButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        minHeight: 44,
        justifyContent: 'center',
    },
    secondaryButtonText: {
        color: Theme.colors.accent,
        fontFamily: 'DMSans',
    },
    toolbar: {
        flexDirection: 'row',
        gap: 12,
    },
    toolbarButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: Theme.colors.surfaceElevated,
        borderRadius: Theme.borderRadius.md,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        minHeight: 44,
    },
    toolbarLabel: {
        color: Theme.colors.text,
        fontFamily: 'DMSans',
        fontSize: 13,
    },
})
