import { View, Text } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Theme } from '@/constants/Theme'

interface DataFreshnessBannerProps {
    lastUpdatedLabel: string | null
    sourceLabel?: string | null
    isShowingCachedData?: boolean
    isOfflineOrStale?: boolean
}

/**
 * Compact meta row for Home/Forecast — age, source, and explicit cache/offline.
 */
export function DataFreshnessBanner({
    lastUpdatedLabel,
    sourceLabel,
    isShowingCachedData = false,
    isOfflineOrStale = false,
}: DataFreshnessBannerProps) {
    const parts = [lastUpdatedLabel, sourceLabel].filter(Boolean)
    const metaText = parts.join(' · ')

    if (!metaText && !isShowingCachedData && !isOfflineOrStale) return null

    return (
        <View
            className="flex-row flex-wrap items-center gap-2"
            accessibilityRole="summary"
            accessibilityLabel={[
                metaText,
                isShowingCachedData ? 'Showing cached data' : null,
                isOfflineOrStale ? 'Offline or refresh failed' : null,
            ]
                .filter(Boolean)
                .join('. ')}
        >
            {metaText ? (
                <Text
                    className="text-xs"
                    style={{
                        fontFamily: 'DMSans',
                        color: Theme.colors.textMuted,
                        flexShrink: 1,
                    }}
                >
                    {metaText}
                </Text>
            ) : null}
            {isShowingCachedData && (
                <View
                    className="flex-row items-center px-2 py-1 rounded-md"
                    style={{
                        backgroundColor: Theme.colors.warningMuted,
                        minHeight: 28,
                    }}
                >
                    <MaterialCommunityIcons
                        name="database-outline"
                        size={12}
                        color={Theme.colors.warning}
                    />
                    <Text
                        className="text-xs ml-1"
                        style={{
                            fontFamily: 'Outfit-SemiBold',
                            color: Theme.colors.warning,
                        }}
                    >
                        Cached
                    </Text>
                </View>
            )}
            {isOfflineOrStale && (
                <View
                    className="flex-row items-center px-2 py-1 rounded-md"
                    style={{
                        backgroundColor: Theme.colors.dangerMuted,
                        minHeight: 28,
                    }}
                >
                    <MaterialCommunityIcons
                        name="cloud-off-outline"
                        size={12}
                        color={Theme.colors.danger}
                    />
                    <Text
                        className="text-xs ml-1"
                        style={{
                            fontFamily: 'Outfit-SemiBold',
                            color: Theme.colors.danger,
                        }}
                    >
                        Offline
                    </Text>
                </View>
            )}
        </View>
    )
}
