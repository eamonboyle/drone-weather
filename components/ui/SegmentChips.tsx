import {
    View,
    Text,
    Pressable,
    StyleProp,
    ViewStyle,
    Platform,
    StyleSheet,
} from 'react-native'
import { Theme } from '@/constants/Theme'
import { selectionHaptic } from '@/utils/haptics'

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
    /**
     * Stretch segments across the full track width (e.g. All / Flyable / Blocked).
     * Off by default so compact controls like Cards / Table size to their labels
     * with comfortable padding.
     */
    expand?: boolean
}

/**
 * Segmented filter control. On iOS this renders as a single instrument track
 * (UISegmentedControl-like); Android keeps discrete chips for Material feel.
 */
export function SegmentChips<T extends string>({
    options,
    value,
    onChange,
    accessibilityLabelPrefix = 'Filter',
    style,
    condensed = false,
    expand = false,
}: SegmentChipsProps<T>) {
    const isIosSegmented = Platform.OS === 'ios'

    if (isIosSegmented) {
        return (
            <View
                style={[
                    styles.iosTrack,
                    expand ? styles.iosTrackExpand : styles.iosTrackCompact,
                    style,
                ]}
                accessibilityRole="tablist"
            >
                {options.map(({ id, label }) => {
                    const selected = value === id
                    const segment = (
                        <Pressable
                            onPress={() => {
                                if (id === value) return
                                selectionHaptic()
                                onChange(id)
                            }}
                            accessibilityRole="tab"
                            accessibilityState={{ selected }}
                            accessibilityLabel={`${accessibilityLabelPrefix} ${label}`}
                            style={({ pressed }) => [
                                styles.iosSegment,
                                !expand && styles.iosSegmentCompact,
                                condensed && styles.iosSegmentCondensed,
                                selected && styles.iosSegmentSelected,
                                pressed && !selected && styles.iosSegmentPressed,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.iosLabel,
                                    condensed && styles.iosLabelCondensed,
                                    selected
                                        ? styles.iosLabelSelected
                                        : styles.iosLabelIdle,
                                ]}
                                numberOfLines={1}
                                maxFontSizeMultiplier={1.3}
                            >
                                {label}
                            </Text>
                        </Pressable>
                    )

                    // Wrap expanded segments in a flex View — Pressable + flex:1
                    // was collapsing to content width on iOS (labels packed left).
                    if (expand) {
                        return (
                            <View key={id} style={styles.iosSegmentSlot}>
                                {segment}
                            </View>
                        )
                    }

                    return <View key={id}>{segment}</View>
                })}
            </View>
        )
    }

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
                        style={({ pressed }) => ({
                            flex: expand ? 1 : undefined,
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
                            opacity: pressed ? 0.85 : 1,
                        })}
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
                            maxFontSizeMultiplier={1.3}
                        >
                            {label}
                        </Text>
                    </Pressable>
                )
            })}
        </View>
    )
}

const styles = StyleSheet.create({
    iosTrack: {
        flexDirection: 'row',
        alignItems: 'stretch',
        backgroundColor: '#0c0e12',
        borderRadius: Theme.borderRadius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        padding: 8,
        gap: 6,
    },
    iosTrackExpand: {
        alignSelf: 'stretch',
        width: '100%',
    },
    iosTrackCompact: {
        alignSelf: 'flex-start',
    },
    iosSegmentSlot: {
        flex: 1,
        minWidth: 0,
    },
    iosSegment: {
        flex: 1,
        minHeight: Theme.touchTarget,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Theme.borderRadius.md,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'transparent',
    },
    iosSegmentCompact: {
        flex: 0,
        minWidth: 96,
        paddingHorizontal: 24,
    },
    iosSegmentCondensed: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        minWidth: 80,
    },
    iosSegmentSelected: {
        backgroundColor: 'rgba(245, 158, 11, 0.28)',
        borderColor: 'rgba(245, 158, 11, 0.55)',
    },
    iosSegmentPressed: {
        opacity: 0.75,
    },
    iosLabel: {
        fontFamily: 'Outfit-SemiBold',
        fontSize: Theme.typography.sizes.sm,
        letterSpacing: 0.3,
        textAlign: 'center',
    },
    iosLabelCondensed: {
        fontSize: Theme.typography.sizes.xs,
    },
    iosLabelSelected: {
        color: Theme.colors.accent,
    },
    iosLabelIdle: {
        color: Theme.colors.textSecondary,
    },
})
