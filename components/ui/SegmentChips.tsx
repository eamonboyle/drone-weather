import { View, Text, Pressable, StyleProp, ViewStyle } from 'react-native'
import { Theme } from '@/constants/Theme'

export interface SegmentOption<T extends string> {
    id: T
    label: string
}

interface SegmentChipsProps<T extends string> {
    options: SegmentOption<T>[]
    value: T
    onChange: (value: T) => void
    accessibilityLabelPrefix?: string
    style?: StyleProp<ViewStyle>
    condensed?: boolean
}

export function SegmentChips<T extends string>({
    options,
    value,
    onChange,
    accessibilityLabelPrefix = 'Filter',
    style,
    condensed = false,
}: SegmentChipsProps<T>) {
    return (
        <View className="flex-row gap-2" style={style} accessibilityRole="tablist">
            {options.map(({ id, label }) => {
                const selected = value === id
                return (
                    <Pressable
                        key={id}
                        onPress={() => onChange(id)}
                        accessibilityRole="tab"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`${accessibilityLabelPrefix} ${label}`}
                        className="rounded-lg items-center justify-center"
                        style={{
                            minHeight: Theme.touchTarget,
                            paddingHorizontal: condensed
                                ? Theme.spacing.md
                                : Theme.spacing.lg,
                            paddingVertical: Theme.spacing.sm,
                            backgroundColor: selected
                                ? Theme.colors.accentDim
                                : Theme.colors.surfaceElevated,
                            borderWidth: 1,
                            borderColor: selected
                                ? 'rgba(245, 158, 11, 0.4)'
                                : Theme.colors.border,
                        }}
                    >
                        <Text
                            className="font-semibold"
                            style={{
                                fontFamily: 'Outfit-SemiBold',
                                fontSize: condensed
                                    ? Theme.typography.sizes.xs
                                    : Theme.typography.sizes.sm,
                                color: selected
                                    ? Theme.colors.accent
                                    : Theme.colors.textMuted,
                            }}
                        >
                            {label}
                        </Text>
                    </Pressable>
                )
            })}
        </View>
    )
}
