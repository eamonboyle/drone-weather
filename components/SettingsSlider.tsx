import React, { useRef } from 'react'
import { View, Text, Pressable } from 'react-native'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import Slider from '@react-native-community/slider'
import { Theme } from '@/constants/Theme'

interface SettingsSliderProps {
    icon: keyof typeof MaterialCommunityIcons.glyphMap
    label: string
    value: number
    onValueChange: (value: number) => void
    onSlidingComplete?: (value: number) => void
    minimumValue: number
    maximumValue: number
    step?: number
    unit?: string
    units?: string[]
    onUnitChange?: (unit: string) => void
    selectedUnit?: string
    sublabel?: string
}

export function SettingsSlider({
    icon,
    label,
    value,
    onValueChange,
    onSlidingComplete,
    minimumValue,
    maximumValue,
    step = 1,
    unit,
    units,
    onUnitChange,
    selectedUnit,
    sublabel,
}: SettingsSliderProps) {
    const accessibilityValue = `${value}${unit ? ` ${unit}` : ''}`
    const range = maximumValue - minimumValue
    // Keep the native UISlider on a stable 0...1 scale. iOS applies changed
    // props one at a time, so updating its value and range together can briefly
    // clamp the converted value to the old range and visibly jump.
    const sliderValue =
        range > 0
            ? Math.max(0, Math.min(1, (value - minimumValue) / range))
            : 0
    const sliderStep = range > 0 && step > 0 ? step / range : 0
    const toDomainValue = (position: number) => {
        const raw = minimumValue + Math.max(0, Math.min(1, position)) * range
        const stepped =
            step > 0
                ? minimumValue +
                  Math.round((raw - minimumValue) / step) * step
                : raw
        const decimalPlaces = step.toString().split('.')[1]?.length ?? 0

        return Number(
            Math.max(minimumValue, Math.min(maximumValue, stepped)).toFixed(
                decimalPlaces
            )
        )
    }
    // Native Slider can emit onValueChange on mount / prop updates. Only treat
    // changes as user input while a gesture is active.
    const isSlidingRef = useRef(false)

    return (
        <View
            className="rounded-xl p-4 mb-3"
            style={{
                backgroundColor: Theme.colors.surfaceElevated,
                borderWidth: 1,
                borderColor: Theme.colors.border,
            }}
            accessible={false}
        >
            <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center flex-1">
                    <MaterialCommunityIcons
                        name={icon}
                        size={22}
                        color={Theme.colors.accent}
                    />
                    <Text
                        className="text-slate-100 text-base font-semibold ml-2"
                        style={{ fontFamily: 'Outfit-SemiBold' }}
                        accessibilityRole="header"
                    >
                        {label}
                    </Text>
                </View>
                {units && onUnitChange && (
                    <View
                        className="flex-row"
                        accessibilityRole="tablist"
                    >
                        {units.map((u) => (
                            <Pressable
                                key={u}
                                onPress={() => onUnitChange(u)}
                                accessibilityRole="tab"
                                accessibilityState={{ selected: selectedUnit === u }}
                                accessibilityLabel={`${label} unit ${u}`}
                                className="px-3 py-1.5 rounded-lg ml-2"
                                style={{
                                    minHeight: Theme.touchTarget,
                                    justifyContent: 'center',
                                    backgroundColor:
                                        selectedUnit === u
                                            ? Theme.colors.accent
                                            : 'rgba(51, 65, 85, 0.5)',
                                }}
                            >
                                <Text
                                    className={`text-sm ${
                                        selectedUnit === u
                                            ? 'text-background font-semibold'
                                            : 'text-slate-400'
                                    }`}
                                    style={{
                                        fontFamily:
                                            selectedUnit === u
                                                ? 'Outfit-SemiBold'
                                                : 'DMSans',
                                    }}
                                >
                                    {u}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                )}
            </View>
            {sublabel && (
                <Text
                    className="text-slate-500 text-sm mb-2 ml-9"
                    style={{ fontFamily: 'DMSans' }}
                >
                    {sublabel}
                </Text>
            )}
            <View className="flex-row items-center ml-9">
                <View className="flex-1">
                    <Slider
                        minimumValue={0}
                        maximumValue={1}
                        step={sliderStep}
                        value={sliderValue}
                        onSlidingStart={() => {
                            isSlidingRef.current = true
                        }}
                        onValueChange={(next) => {
                            if (!isSlidingRef.current) return
                            onValueChange(toDomainValue(next))
                        }}
                        onSlidingComplete={(next) => {
                            isSlidingRef.current = false
                            onSlidingComplete?.(toDomainValue(next))
                        }}
                        minimumTrackTintColor={Theme.colors.accent}
                        maximumTrackTintColor="#334155"
                        thumbTintColor={Theme.colors.accent}
                        accessibilityLabel={label}
                        accessibilityValue={{
                            min: minimumValue,
                            max: maximumValue,
                            now: value,
                            text: accessibilityValue,
                        }}
                    />
                </View>
                <View className="ml-3 min-w-[60px]">
                    <Text
                        className="text-slate-100 text-base text-right"
                        style={{ fontFamily: 'DMSans' }}
                        accessibilityLabel={`Current value ${accessibilityValue}`}
                    >
                        {value}
                        {unit && ` ${unit}`}
                    </Text>
                </View>
            </View>
        </View>
    )
}
