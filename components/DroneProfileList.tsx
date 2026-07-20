import React from 'react'
import {
    View,
    Text,
    Image,
    Pressable,
    ScrollView,
    TextInput,
} from 'react-native'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import {
    DroneProfile,
    DRONE_PROFILES,
    sortProfilesByReleaseYear,
} from '@/types/droneProfiles'
import { Theme } from '@/constants/Theme'
import { selectionHaptic } from '@/utils/haptics'

interface DroneProfileListProps {
    selectedProfile: DroneProfile | null
    onSelectProfile: (profile: DroneProfile) => void
    /** Extra bottom padding for pinned CTAs over the list. */
    contentBottomInset?: number
}

export function DroneProfileList({
    selectedProfile,
    onSelectProfile,
    contentBottomInset = 0,
}: DroneProfileListProps) {
    const [searchQuery, setSearchQuery] = React.useState('')

    const sortedProfiles = React.useMemo(
        () => sortProfilesByReleaseYear(DRONE_PROFILES),
        []
    )

    const filteredProfiles = React.useMemo(() => {
        const query = searchQuery.trim().toLowerCase()
        const matches = query
            ? sortedProfiles.filter(
                  (profile) =>
                      profile.name.toLowerCase().includes(query) ||
                      profile.manufacturer.toLowerCase().includes(query) ||
                      profile.model.toLowerCase().includes(query)
              )
            : sortedProfiles

        if (!selectedProfile) return matches

        const selected = matches.find(
            (profile) => profile.id === selectedProfile.id
        )
        if (!selected) return matches

        return [
            selected,
            ...matches.filter((profile) => profile.id !== selected.id),
        ]
    }, [searchQuery, selectedProfile, sortedProfiles])

    return (
        <View className="flex-1">
            <View className="px-0 pt-1 pb-2">
                <TextInput
                    className="h-11 px-4 text-slate-100 rounded-xl"
                    style={{
                        backgroundColor: 'rgba(22, 26, 32, 0.8)',
                        fontFamily: 'DMSans',
                    }}
                    placeholder="Search by name or manufacturer..."
                    placeholderTextColor={Theme.colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                    accessibilityLabel="Search drone profiles"
                />
            </View>

            <ScrollView
                className="flex-1"
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: contentBottomInset }}
            >
                {filteredProfiles.length === 0 ? (
                    <Text
                        className="text-slate-500 text-center py-8"
                        style={{ fontFamily: 'DMSans' }}
                    >
                        No profiles match your search
                    </Text>
                ) : (
                    filteredProfiles.map((profile) => {
                        const isSelected = selectedProfile?.id === profile.id
                        return (
                            <Pressable
                                key={profile.id}
                                onPress={() => {
                                    selectionHaptic()
                                    onSelectProfile(profile)
                                }}
                                accessibilityRole="button"
                                accessibilityState={{ selected: isSelected }}
                                accessibilityLabel={`${profile.name}, ${profile.manufacturer}, ${profile.releaseYear}`}
                                className="rounded-xl p-4 mb-3 flex-row items-center"
                                style={{
                                    minHeight: Theme.touchTarget,
                                    backgroundColor: isSelected
                                        ? 'rgba(245, 158, 11, 0.15)'
                                        : 'rgba(22, 26, 32, 0.6)',
                                    borderWidth: 1,
                                    borderColor: isSelected
                                        ? 'rgba(245, 158, 11, 0.4)'
                                        : Theme.colors.border,
                                }}
                            >
                                {profile.imageUrl ? (
                                    <Image
                                        source={{ uri: profile.imageUrl }}
                                        className="w-16 h-16 rounded-lg mr-4"
                                    />
                                ) : null}
                                <View className="flex-1">
                                    <Text
                                        className="text-slate-100 text-base font-semibold"
                                        style={{
                                            fontFamily: 'Outfit-SemiBold',
                                        }}
                                    >
                                        {profile.name}
                                    </Text>
                                    <Text
                                        className="text-slate-500 text-sm"
                                        style={{ fontFamily: 'DMSans' }}
                                    >
                                        {profile.manufacturer} ·{' '}
                                        {profile.releaseYear}
                                    </Text>
                                    <View className="flex-row mt-2">
                                        <Text
                                            className="text-slate-500 text-xs"
                                            style={{ fontFamily: 'DMSans' }}
                                        >
                                            {profile.thresholds.windSpeed.max}{' '}
                                            {profile.thresholds.windSpeed.unit}{' '}
                                            max wind
                                        </Text>
                                        <Text
                                            className="text-slate-500 text-xs ml-4"
                                            style={{ fontFamily: 'DMSans' }}
                                        >
                                            {profile.thresholds.temperature.min}
                                            ° to{' '}
                                            {profile.thresholds.temperature.max}
                                            °C
                                        </Text>
                                    </View>
                                </View>
                                {isSelected ? (
                                    <MaterialCommunityIcons
                                        name="check-circle"
                                        size={22}
                                        color={Theme.colors.accent}
                                    />
                                ) : null}
                            </Pressable>
                        )
                    })
                )}
            </ScrollView>
        </View>
    )
}
