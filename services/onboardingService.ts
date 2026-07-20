import AsyncStorage from '@react-native-async-storage/async-storage'

const HAS_COMPLETED_ONBOARDING_KEY = 'has_completed_onboarding'

export async function getHasCompletedOnboarding(): Promise<boolean> {
    try {
        const value = await AsyncStorage.getItem(HAS_COMPLETED_ONBOARDING_KEY)
        return value === 'true'
    } catch (error) {
        console.error('Error reading onboarding state:', error)
        return false
    }
}

export async function setHasCompletedOnboarding(): Promise<void> {
    try {
        await AsyncStorage.setItem(HAS_COMPLETED_ONBOARDING_KEY, 'true')
    } catch (error) {
        console.error('Error saving onboarding state:', error)
        throw error
    }
}

export async function clearHasCompletedOnboarding(): Promise<void> {
    try {
        await AsyncStorage.removeItem(HAS_COMPLETED_ONBOARDING_KEY)
    } catch (error) {
        console.error('Error clearing onboarding state:', error)
        throw error
    }
}
