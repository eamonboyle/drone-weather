import React from 'react'
import {
    View,
    Text,
    Image,
    Pressable,
    Modal,
} from 'react-native'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { DroneProfile } from '@/types/droneProfiles'
import { DroneProfileList } from '@/components/DroneProfileList'
import { Theme } from '@/constants/Theme'

interface DroneProfileSelectorProps {
    selectedProfile: DroneProfile | null
    onSelectProfile: (profile: DroneProfile) => void
}

export function DroneProfileSelector({
    selectedProfile,
    onSelectProfile,
}: DroneProfileSelectorProps) {
    const [isModalVisible, setIsModalVisible] = React.useState(false)

    const handleClose = () => {
        setIsModalVisible(false)
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
                    borderColor: Theme.colors.border,
                    minHeight: Theme.touchTarget,
                }}
            >
                {selectedProfile ? (
                    <View className="flex-row items-center flex-1">
                        {selectedProfile.imageUrl ? (
                            <Image
                                source={{ uri: selectedProfile.imageUrl }}
                                className="w-12 h-12 rounded-lg mr-3"
                            />
                        ) : null}
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
                    color={Theme.colors.accent}
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
                        style={{ backgroundColor: Theme.colors.surface }}
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
                                style={{
                                    minHeight: Theme.touchTarget,
                                    minWidth: Theme.touchTarget,
                                    justifyContent: 'center',
                                }}
                            >
                                <MaterialCommunityIcons
                                    name="close"
                                    size={22}
                                    color={Theme.colors.accent}
                                />
                            </Pressable>
                        </View>

                        <View className="flex-1 px-4 pt-2">
                            <DroneProfileList
                                selectedProfile={selectedProfile}
                                onSelectProfile={(profile) => {
                                    onSelectProfile(profile)
                                    handleClose()
                                }}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    )
}
