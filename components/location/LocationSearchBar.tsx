import { View, TextInput, Pressable, ActivityIndicator } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

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
                style={{ backgroundColor: '#161a20' }}
            >
                <MaterialCommunityIcons
                    name="magnify"
                    size={22}
                    color="#f59e0b"
                />
                <TextInput
                    className="flex-1 ml-3 text-slate-100 text-base"
                    style={{ fontFamily: 'DMSans' }}
                    placeholder="Search launch sites..."
                    placeholderTextColor="#64748b"
                    value={value}
                    onChangeText={onChangeText}
                    editable={!disabled}
                    autoFocus={autoFocus}
                    returnKeyType="search"
                    autoCorrect={false}
                    autoCapitalize="words"
                />
                {isSearching ? (
                    <ActivityIndicator size="small" color="#f59e0b" />
                ) : value.length > 0 ? (
                    <Pressable
                        onPress={onClear}
                        className="p-1"
                        hitSlop={8}
                    >
                        <MaterialCommunityIcons
                            name="close-circle"
                            size={20}
                            color="#64748b"
                        />
                    </Pressable>
                ) : null}
            </View>
        </View>
    )
}
