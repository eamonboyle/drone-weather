import { Link, Stack } from 'expo-router'
import { Text, Pressable, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Theme } from '@/constants/Theme'

export default function NotFoundScreen() {
    return (
        <>
            <Stack.Screen options={{ title: 'Not found', headerShown: false }} />
            <SafeAreaView style={styles.container}>
                <MaterialCommunityIcons
                    name="compass-off"
                    size={48}
                    color={Theme.colors.accent}
                />
                <Text style={styles.title}>Screen not found</Text>
                <Text style={styles.body}>
                    That route is not part of Drone Weather. Head back to Home
                    to check flying conditions.
                </Text>
                <Link href="/" asChild>
                    <Pressable
                        style={styles.button}
                        accessibilityRole="button"
                        accessibilityLabel="Go to home screen"
                    >
                        <Text style={styles.buttonText}>Go to Home</Text>
                    </Pressable>
                </Link>
            </SafeAreaView>
        </>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 12,
    },
    title: {
        color: Theme.colors.text,
        fontFamily: 'Outfit-SemiBold',
        fontSize: 22,
        marginTop: 8,
    },
    body: {
        color: Theme.colors.textSecondary,
        fontFamily: 'DMSans',
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 8,
    },
    button: {
        backgroundColor: Theme.colors.accent,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: Theme.borderRadius.md,
        minHeight: 44,
        justifyContent: 'center',
    },
    buttonText: {
        color: Theme.colors.textInverse,
        fontFamily: 'Outfit-SemiBold',
        fontSize: 16,
    },
})
