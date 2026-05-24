import React from 'react'
import {
    View,
    Modal,
    Pressable,
    Text,
    TouchableWithoutFeedback,
    Dimensions,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { LocationSearch } from './LocationSearch'

interface LocationSearchModalProps {
    visible: boolean
    onClose: () => void
}

export function LocationSearchModal({
    visible,
    onClose,
}: LocationSearchModalProps) {
    const { height } = Dimensions.get('window')

    const handleBackdropPress = (event: any) => {
        if (event.target === event.currentTarget) {
            onClose()
        }
    }

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={handleBackdropPress}>
                <View className="flex-1 bg-black/60 justify-center items-center px-4">
                    <View
                        className="w-full rounded-2xl overflow-hidden"
                        style={{
                            maxHeight: height * 0.8,
                            backgroundColor: '#0f1115',
                            borderWidth: 1,
                            borderColor: 'rgba(255, 255, 255, 0.08)',
                        }}
                    >
                        <View className="flex-row items-center justify-between px-6 py-4 border-b border-white/5">
                            <Text
                                className="text-slate-100 text-lg font-semibold"
                                style={{ fontFamily: 'Outfit-SemiBold' }}
                            >
                                Search Location
                            </Text>
                            <Pressable
                                onPress={onClose}
                                className="w-10 h-10 items-center justify-center"
                            >
                                <MaterialCommunityIcons
                                    name="close"
                                    size={22}
                                    color="#f59e0b"
                                />
                            </Pressable>
                        </View>
                        <View className="p-4">
                            <LocationSearch onLocationSelected={onClose} />
                        </View>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    )
}
