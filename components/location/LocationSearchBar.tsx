import { View, TextInput, Pressable, ActivityIndicator, Platform } from 'react-native'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Theme } from '@/constants/Theme'

interface LocationSearchBarProps {
    value: string
    onChangeText: (text: string) => void
    onClear: () => void
    isSearching: boolean
    disabled?: boolean
    autoFocus?: boolean
}

export function LocationSearchBar({
    value,
    onChangeText,
    onClear,
    isSearching,
    disabled = false,
    autoFocus = false,
}: LocationSearchBarProps) {
    return (
        <View className="px-4 pb-3">
            <View
                className="flex-row items-center rounded-2xl px-4 h-12 border border-white/5"
                style={{ backgroundColor: Theme.colors.surfaceElevated }}
            >
                <MaterialCommunityIcons
                    name="magnify"
                    size={22}
                    color={Theme.colors.accent}
                />
                <TextInput
                    className="flex-1 ml-3 text-slate-100 text-base"
                    style={{ fontFamily: 'DMSans' }}
                    placeholder="Search launch sites..."
                    placeholderTextColor={Theme.colors.textMuted}
                    value={value}
                    onChangeText={onChangeText}
                    editable={!disabled}
                    autoFocus={autoFocus}
                    returnKeyType="search"
                    autoCorrect={false}
                    autoCapitalize="words"
                    spellCheck={false}
                    keyboardAppearance={
                        Platform.OS === 'ios' ? 'dark' : undefined
                    }
                    clearButtonMode={
                        Platform.OS === 'ios' ? 'while-editing' : 'never'
                    }
                    accessibilityLabel="Search launch sites"
                />
                {isSearching ? (
                    <ActivityIndicator size="small" color={Theme.colors.accent} />
                ) : value.length > 0 && Platform.OS !== 'ios' ? (
                    <Pressable
                        onPress={onClear}
                        className="p-1"
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Clear location search"
                        style={{
                            minHeight: 44,
                            minWidth: 44,
                            justifyContent: 'center',
                        }}
                    >
                        <MaterialCommunityIcons
                            name="close-circle"
                            size={20}
                            color={Theme.colors.textMuted}
                        />
                    </Pressable>
                ) : null}
            </View>
        </View>
    )
}
