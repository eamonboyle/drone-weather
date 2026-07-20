import AsyncStorage from '@react-native-async-storage/async-storage'
import {
    clearHasCompletedOnboarding,
    getHasCompletedOnboarding,
    setHasCompletedOnboarding,
} from '@/services/onboardingService'

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

describe('onboardingService', () => {
    beforeEach(async () => {
        await AsyncStorage.clear()
    })

    it('returns false when the flag is missing', async () => {
        await expect(getHasCompletedOnboarding()).resolves.toBe(false)
    })

    it('returns true when the flag is stored', async () => {
        await AsyncStorage.setItem('has_completed_onboarding', 'true')
        await expect(getHasCompletedOnboarding()).resolves.toBe(true)
    })

    it('persists completion', async () => {
        await setHasCompletedOnboarding()
        await expect(
            AsyncStorage.getItem('has_completed_onboarding')
        ).resolves.toBe('true')
    })

    it('clears completion', async () => {
        await AsyncStorage.setItem('has_completed_onboarding', 'true')
        await clearHasCompletedOnboarding()
        await expect(
            AsyncStorage.getItem('has_completed_onboarding')
        ).resolves.toBeNull()
    })
})
