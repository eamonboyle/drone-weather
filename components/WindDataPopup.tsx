import { View, Text, Modal, Pressable } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useWeatherConfig } from '@/contexts/WeatherConfigContext'
import {
    formatWindSpeedMph,
    isWindWithinThreshold,
} from '@/utils/windDisplay'

interface WindDataPoint {
    height: string
    speed: number
}

interface WindDataPopupProps {
    isVisible: boolean
    onClose: () => void
    data: WindDataPoint[]
    title: string
    icon: keyof typeof MaterialCommunityIcons.glyphMap
    unit?: string
    type: 'speed' | 'gusts'
}

export function WindDataPopup({
    isVisible,
    onClose,
    data,
    title,
    icon,
    type,
}: WindDataPopupProps) {
    const { thresholds } = useWeatherConfig()

    const isSpeedSafe = (speedMph: number) => {
        if (!thresholds) return false
        const max =
            type === 'speed'
                ? thresholds.windSpeed.max
                : thresholds.windGust.max
        return isWindWithinThreshold(
            speedMph,
            max,
            thresholds.windSpeed.unit
        )
    }

    const formatSpeed = (speedMph: number) =>
        formatWindSpeedMph(speedMph, thresholds.windSpeed.unit)

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <Pressable
                className="flex-1 justify-center items-center bg-black/60"
                onPress={onClose}
            >
                <Pressable
                    className="p-6 rounded-2xl w-[80%] max-w-[400px]"
                    style={{
                        backgroundColor: '#161a20',
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.08)',
                    }}
                    onPress={(e) => e.stopPropagation()}
                >
                    <View className="flex-row items-center mb-4">
                        <MaterialCommunityIcons
                            name={icon}
                            size={22}
                            color="#f59e0b"
                        />
                        <Text
                            className="text-slate-100 text-lg font-semibold ml-2"
                            style={{ fontFamily: 'Outfit-SemiBold' }}
                        >
                            {title}
                        </Text>
                    </View>

                    {data.map((item, index) => (
                        <View
                            key={item.height}
                            className={`flex-row justify-between items-center py-3 ${
                                index !== data.length - 1
                                    ? 'border-b border-white/5'
                                    : ''
                            }`}
                        >
                            <Text
                                className="text-slate-300 text-base"
                                style={{ fontFamily: 'DMSans' }}
                            >
                                At {item.height}
                            </Text>
                            <View className="flex-row items-center">
                                <Text
                                    className="text-slate-100 text-base font-semibold mr-2"
                                    style={{ fontFamily: 'Outfit-SemiBold' }}
                                >
                                    {formatSpeed(item.speed)}
                                </Text>
                                <MaterialCommunityIcons
                                    name={
                                        isSpeedSafe(item.speed)
                                            ? 'check-circle'
                                            : 'close-circle'
                                    }
                                    size={20}
                                    color={
                                        isSpeedSafe(item.speed)
                                            ? '#10b981'
                                            : '#ef4444'
                                    }
                                />
                            </View>
                        </View>
                    ))}

                    <Pressable
                        onPress={onClose}
                        className="mt-6 py-3 rounded-xl"
                        style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)' }}
                    >
                        <Text
                            className="text-amber-400 text-center font-semibold"
                            style={{ fontFamily: 'Outfit-SemiBold' }}
                        >
                            Close
                        </Text>
                    </Pressable>
                </Pressable>
            </Pressable>
        </Modal>
    )
}
