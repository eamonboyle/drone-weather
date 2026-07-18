import React, { memo } from 'react'
import { View, Text, Pressable, ActivityIndicator } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { LocationSearchResult } from '@/services/locationSearchService'
import { FlyabilityStatus } from '@/hooks/useLocationFlyability'
import { FlyabilityChip } from './FlyabilityChip'

interface LocationCardProps {
    result: LocationSearchResult
    selectionId: string
    isFavorite: boolean
    isActive: boolean
    isActiveSelection: boolean
    isSelecting: boolean
    flyabilityStatus?: FlyabilityStatus
    onSelect: (result: LocationSearchResult, selectionId: string) => void
    onToggleFavorite: (result: LocationSearchResult) => void
    onRemove?: () => void
}

function getPrimaryLabel(result: LocationSearchResult): string {
    if (result.city) return result.city
    const parts = result.formatted.split(',')
    return parts[0]?.trim() || result.formatted
}

function getSecondaryLabel(result: LocationSearchResult): string | null {
    if (result.city && result.country) return result.country
    const parts = result.formatted.split(',').map((part) => part.trim())
    if (parts.length > 1) return parts.slice(1).join(', ')
    return result.country ?? null
}

export const LocationCard = memo(function LocationCard({
    result,
    selectionId,
    isFavorite,
    isActive,
    isActiveSelection,
    isSelecting,
    flyabilityStatus,
    onSelect,
    onToggleFavorite,
    onRemove,
}: LocationCardProps) {
    const primary = getPrimaryLabel(result)
    const secondary = getSecondaryLabel(result)

    const handlePress = () => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        onSelect(result, selectionId)
    }

    const handleToggleFavorite = () => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        onToggleFavorite(result)
    }

    return (
        <Pressable
            onPress={handlePress}
            disabled={isSelecting}
            accessibilityRole="button"
            accessibilityState={{
                selected: isActive,
                disabled: isSelecting,
            }}
            accessibilityLabel={`${primary}${secondary ? `, ${secondary}` : ''}${isActive ? ', active location' : ''}${isFavorite ? ', favorite' : ''}`}
            className="mb-3 rounded-2xl border border-white/5 active:bg-white/5 overflow-hidden"
            style={{
                backgroundColor: 'rgba(22, 26, 32, 0.6)',
                opacity: isSelecting && !isActiveSelection ? 0.5 : 1,
                minHeight: 44,
            }}
        >
            <View className="flex-row items-center p-4">
                <View
                    className="w-10 h-10 rounded-full items-center justify-center mr-3"
                    style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)' }}
                >
                    <MaterialCommunityIcons
                        name="map-marker"
                        size={20}
                        color="#f59e0b"
                    />
                </View>

                <View className="flex-1 pr-2">
                    <View className="flex-row items-center gap-2 flex-wrap">
                        <Text
                            className="text-slate-100 text-base"
                            style={{ fontFamily: 'Outfit-SemiBold' }}
                            numberOfLines={1}
                        >
                            {primary}
                        </Text>
                        {isActive && (
                            <View
                                className="px-2 py-0.5 rounded-full"
                                style={{
                                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                }}
                            >
                                <Text
                                    className="text-xs"
                                    style={{
                                        fontFamily: 'DMSans-Medium',
                                        color: '#f59e0b',
                                    }}
                                >
                                    Active
                                </Text>
                            </View>
                        )}
                    </View>
                    {secondary ? (
                        <Text
                            className="text-slate-500 text-sm mt-0.5"
                            style={{ fontFamily: 'DMSans' }}
                            numberOfLines={2}
                        >
                            {secondary}
                        </Text>
                    ) : null}
                    {flyabilityStatus !== undefined ? (
                        <View className="mt-2">
                            <FlyabilityChip status={flyabilityStatus} />
                        </View>
                    ) : null}
                </View>

                <View className="flex-row items-center gap-1">
                    {isActiveSelection ? (
                        <ActivityIndicator size="small" color="#f59e0b" />
                    ) : (
                        <>
                            <Pressable
                                onPress={(event) => {
                                    event.stopPropagation()
                                    handleToggleFavorite()
                                }}
                                accessibilityRole="button"
                                accessibilityLabel={
                                    isFavorite
                                        ? `Remove ${primary} from favorites`
                                        : `Add ${primary} to favorites`
                                }
                                accessibilityState={{ selected: isFavorite }}
                                className="p-2"
                                hitSlop={4}
                                style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }}
                            >
                                <MaterialCommunityIcons
                                    name={isFavorite ? 'star' : 'star-outline'}
                                    size={22}
                                    color="#f59e0b"
                                />
                            </Pressable>
                            {onRemove ? (
                                <Pressable
                                    onPress={(event) => {
                                        event.stopPropagation()
                                        onRemove()
                                    }}
                                    className="p-2"
                                    hitSlop={4}
                                >
                                    <MaterialCommunityIcons
                                        name="close"
                                        size={18}
                                        color="#64748b"
                                    />
                                </Pressable>
                            ) : null}
                        </>
                    )}
                </View>
            </View>
        </Pressable>
    )
})
