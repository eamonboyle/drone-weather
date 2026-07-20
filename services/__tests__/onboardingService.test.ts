import AsyncStorage from '@react-native-async-storage/async-storage'
import {
    clearHasCompletedOnboarding,
    getHasCompletedOnboarding,
    setHasCompletedOnboarding,
} from '@/services/onboardingService'

jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
}))

describe('onboardingService', () => {
    const mockGetItem = AsyncStorage.getItem as jest.Mock
    const mockSetItem = AsyncStorage.setItem as jest.Mock
    const mockRemoveItem = AsyncStorage.removeItem as jest.Mock

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('returns false when the flag is missing', async () => {
        mockGetItem.mockResolvedValue(null)
        await expect(getHasCompletedOnboarding()).resolves.toBe(false)
    })

    it('returns true when the flag is stored', async () => {
        mockGetItem.mockResolvedValue('true')
        await expect(getHasCompletedOnboarding()).resolves.toBe(true)
    })

    it('persists completion', async () => {
        mockSetItem.mockResolvedValue(undefined)
        await setHasCompletedOnboarding()
        expect(mockSetItem).toHaveBeenCalledWith(
            'has_completed_onboarding',
            'true'
        )
    })

    it('clears completion', async () => {
        mockRemoveItem.mockResolvedValue(undefined)
        await clearHasCompletedOnboarding()
        expect(mockRemoveItem).toHaveBeenCalledWith(
            'has_completed_onboarding'
        )
    })
})
