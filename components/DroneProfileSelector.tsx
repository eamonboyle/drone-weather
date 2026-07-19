import React from 'react'
import {
    View,
    Text,
    Image,
    Pressable,
    Modal,
    ScrollView,
    TextInput,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import {
    DroneProfile,
    DRONE_PROFILES,
    sortProfilesByReleaseYear,
} from '@/types/droneProfiles'

interface DroneProfileSelectorProps {
    selectedProfile: DroneProfile | null
    onSelectProfile: (profile: DroneProfile) => void
}

export function DroneProfileSelector({
    selectedProfile,
    onSelectProfile,
}: DroneProfileSelectorProps) {
    const [isModalVisible, setIsModalVisible] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState('')

    const sortedProfiles = React.useMemo(
        () => sortProfilesByReleaseYear(DRONE_PROFILES),
        []
    )

    const filteredProfiles = React.useMemo(() => {
        const query = searchQuery.trim().toLowerCase()
        if (!query) return sortedProfiles
        return sortedProfiles.filter(
            (profile) =>
                profile.name.toLowerCase().includes(query) ||
                profile.manufacturer.toLowerCase().includes(query) ||
                profile.model.toLowerCase().includes(query)
        )
    }, [searchQuery, sortedProfiles])

    const handleClose = () => {
        setIsModalVisible(false)
        setSearchQuery('')
    }

    return (
        <View className="mb-6">
            <Text
                className="text-amber-500 text-sm mb-2"
                style={{ fontFamily: 'Outfit-SemiBold' }}
            >
                Drone Profile
            </Text>

            <Pressable
                onPress={() => setIsModalVisible(true)}
                accessibilityRole="button"
                accessibilityLabel={
                    selectedProfile
                        ? `Drone profile ${selectedProfile.name}. Tap to change.`
                        : 'Select a drone profile'
                }
                className="rounded-xl p-4 flex-row items-center justify-between"
                style={{
                    backgroundColor: 'rgba(22, 26, 32, 0.6)',
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.06)',
                    minHeight: 44,
                }}
            >
                {selectedProfile ? (
                    <View className="flex-row items-center flex-1">
                        {selectedProfile.imageUrl && (
                            <Image
                                source={{ uri: selectedProfile.imageUrl }}
                                className="w-12 h-12 rounded-lg mr-3"
                            />
                        )}
                        <View className="flex-1">
                            <Text
                                className="text-slate-100 text-base font-semibold"
                                style={{ fontFamily: 'Outfit-SemiBold' }}
                            >
                                {selectedProfile.name}
                            </Text>
                            <Text
                                className="text-slate-500 text-sm"
                                style={{ fontFamily: 'DMSans' }}
                            >
                                {selectedProfile.manufacturer} ·{' '}
                                {selectedProfile.releaseYear}
                            </Text>
                        </View>
                    </View>
                ) : (
                    <Text
                        className="text-slate-500 text-base"
                        style={{ fontFamily: 'DMSans' }}
                    >
                        Select a drone profile
                    </Text>
                )}
                <MaterialCommunityIcons
                    name="chevron-right"
                    size={22}
                    color="#f59e0b"
                />
            </Pressable>

            <Modal
                visible={isModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={handleClose}
            >
                <View className="flex-1 bg-black/60">
                    <View
                        className="flex-1 mt-24 rounded-t-3xl"
                        style={{ backgroundColor: '#0f1115' }}
                    >
                        <View className="p-4 border-b border-white/5 flex-row justify-between items-center">
                            <Text
                                className="text-slate-100 text-lg font-semibold"
                                style={{ fontFamily: 'Outfit-SemiBold' }}
                            >
                                Select Drone Profile
                            </Text>
                            <Pressable
                                onPress={handleClose}
                                className="p-2"
                                accessibilityRole="button"
                                accessibilityLabel="Close drone profile selector"
                                style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }}
                            >
                                <MaterialCommunityIcons
                                    name="close"
                                    size={22}
                                    color="#f59e0b"
                                />
                            </Pressable>
                        </View>

                        <View className="px-4 pt-3 pb-2">
                            <TextInput
                                className="h-11 px-4 text-slate-100 rounded-xl"
                                style={{
                                    backgroundColor: 'rgba(22, 26, 32, 0.8)',
                                    fontFamily: 'DMSans',
                                }}
                                placeholder="Search by name or manufacturer..."
                                placeholderTextColor="#64748b"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoCapitalize="none"
                                autoCorrect={false}
                                accessibilityLabel="Search drone profiles"
                            />
                        </View>

                        <ScrollView className="flex-1 p-4">
                            {filteredProfiles.length === 0 ? (
                                <Text
                                    className="text-slate-500 text-center py-8"
                                    style={{ fontFamily: 'DMSans' }}
                                >
                                    No profiles match your search
                                </Text>
                            ) : (
                                filteredProfiles.map((profile) => (
                                    <Pressable
                                        key={profile.id}
                                        onPress={() => {
                                            onSelectProfile(profile)
                                            handleClose()
                                        }}
                                        accessibilityRole="button"
                                        accessibilityState={{
                                            selected:
                                                selectedProfile?.id ===
                                                profile.id,
                                        }}
                                        accessibilityLabel={`${profile.name}, ${profile.manufacturer}, ${profile.releaseYear}`}
                                        className="rounded-xl p-4 mb-3 flex-row items-center"
                                        style={{
                                            minHeight: 44,
                                            backgroundColor:
                                                selectedProfile?.id ===
                                                profile.id
                                                    ? 'rgba(245, 158, 11, 0.15)'
                                                    : 'rgba(22, 26, 32, 0.6)',
                                            borderWidth: 1,
                                            borderColor:
                                                selectedProfile?.id ===
                                                profile.id
                                                    ? 'rgba(245, 158, 11, 0.4)'
                                                    : 'rgba(255, 255, 255, 0.06)',
                                        }}
                                    >
                                        {profile.imageUrl && (
                                            <Image
                                                source={{
                                                    uri: profile.imageUrl,
                                                }}
                                                className="w-16 h-16 rounded-lg mr-4"
                                            />
                                        )}
                                        <View className="flex-1">
                                            <Text
                                                className="text-slate-100 text-base font-semibold"
                                                style={{
                                                    fontFamily:
                                                        'Outfit-SemiBold',
                                                }}
                                            >
                                                {profile.name}
                                            </Text>
                                            <Text
                                                className="text-slate-500 text-sm"
                                                style={{
                                                    fontFamily: 'DMSans',
                                                }}
                                            >
                                                {profile.manufacturer} ·{' '}
                                                {profile.releaseYear}
                                            </Text>
                                            <View className="flex-row mt-2">
                                                <Text
                                                    className="text-slate-500 text-xs"
                                                    style={{
                                                        fontFamily: 'DMSans',
                                                    }}
                                                >
                                                    {
                                                        profile.thresholds
                                                            .windSpeed.max
                                                    }{' '}
                                                    {
                                                        profile.thresholds
                                                            .windSpeed.unit
                                                    }{' '}
                                                    max wind
                                                </Text>
                                                <Text
                                                    className="text-slate-500 text-xs ml-4"
                                                    style={{
                                                        fontFamily: 'DMSans',
                                                    }}
                                                >
                                                    {
                                                        profile.thresholds
                                                            .temperature.min
                                                    }
                                                    ° to{' '}
                                                    {
                                                        profile.thresholds
                                                            .temperature.max
                                                    }
                                                    °C
                                                </Text>
                                            </View>
                                        </View>
                                        {selectedProfile?.id === profile.id && (
                                            <MaterialCommunityIcons
                                                name="check-circle"
                                                size={22}
                                                color="#f59e0b"
                                            />
                                        )}
                                    </Pressable>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    )
}
