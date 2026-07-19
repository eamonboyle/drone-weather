import { View, Text } from 'react-native'
import { LocationSearchResult } from '@/services/locationSearchService'
import {
    SavedLocationsService,
    StoredLocation,
} from '@/services/savedLocationsService'
import { FlyabilityStatus } from '@/hooks/useLocationFlyability'
import { LocationCard } from './LocationCard'

interface LocationSectionProps {
    title: string
    locations: (StoredLocation | LocationSearchResult)[]
    favorites: StoredLocation[]
    selectingId: string | null
    isSelecting: boolean
    getFlyabilityStatus: (id: string) => FlyabilityStatus
    isActiveLocation: (result: LocationSearchResult) => boolean
    onSelect: (result: LocationSearchResult, selectionId: string) => void
    onToggleFavorite: (result: LocationSearchResult) => void
    onRemove?: (id: string) => void
    headerAction?: React.ReactNode
    emptyMessage?: string
    showFlyability?: boolean
}

export function LocationSection({
    title,
    locations,
    favorites,
    selectingId,
    isSelecting,
    getFlyabilityStatus,
    isActiveLocation,
    onSelect,
    onToggleFavorite,
    onRemove,
    headerAction,
    emptyMessage,
    showFlyability = true,
}: LocationSectionProps) {
    if (locations.length === 0 && !emptyMessage) {
        return null
    }

    return (
        <View className="px-4 pb-4">
            <View className="flex-row items-center justify-between mb-3">
                <Text
                    className="text-amber-500 text-xs uppercase tracking-wide"
                    style={{ fontFamily: 'Outfit-SemiBold' }}
                >
                    {title}
                    {locations.length > 0 ? ` (${locations.length})` : ''}
                </Text>
                {headerAction}
            </View>

            {locations.length === 0 && emptyMessage ? (
                <View
                    className="rounded-2xl p-6 border border-white/5 items-center"
                    style={{ backgroundColor: 'rgba(22, 26, 32, 0.4)' }}
                >
                    <Text
                        className="text-slate-500 text-center text-sm leading-5"
                        style={{ fontFamily: 'DMSans' }}
                    >
                        {emptyMessage}
                    </Text>
                </View>
            ) : (
                locations.map((location, index) => {
                    const selectionId =
                        'id' in location
                            ? location.id
                            : `search-${location.latitude}-${location.longitude}-${index}`

                    return (
                        <LocationCard
                            key={selectionId}
                            result={location}
                            selectionId={selectionId}
                            isFavorite={SavedLocationsService.isFavorite(
                                favorites,
                                location.latitude,
                                location.longitude
                            )}
                            isActive={isActiveLocation(location)}
                            isActiveSelection={selectingId === selectionId}
                            isSelecting={isSelecting}
                            flyabilityStatus={
                                showFlyability
                                    ? getFlyabilityStatus(selectionId)
                                    : undefined
                            }
                            onSelect={onSelect}
                            onToggleFavorite={onToggleFavorite}
                            onRemove={
                                onRemove ? () => onRemove(selectionId) : undefined
                            }
                        />
                    )
                })
            )}
        </View>
    )
}
