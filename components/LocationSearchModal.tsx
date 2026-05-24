import React from 'react'
import {
    View,
    Modal,
    Pressable,
    Text,
    Dimensions,
    StyleSheet,
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

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Pressable
                    style={[styles.modalCard, { maxHeight: height * 0.8 }]}
                    onPress={(event) => event.stopPropagation()}
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
                </Pressable>
            </Pressable>
        </Modal>
    )
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    modalCard: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#0f1115',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
})
