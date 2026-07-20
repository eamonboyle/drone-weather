import React from 'react'
import renderer, { act, ReactTestRenderer } from 'react-test-renderer'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Location from 'expo-location'
import { sharedDeviceLocationService } from '@/services/deviceLocationService'
import { getHasCompletedOnboarding } from '@/services/onboardingService'
import { LocationProvider, useLocation } from '@/contexts/LocationContext'

jest.mock('@react-native-async-storage/async-storage', () => ({
    setItem: jest.fn(() => Promise.resolve()),
    getItem: jest.fn(() => Promise.resolve(null)),
}))

jest.mock('expo-location', () => ({
    requestForegroundPermissionsAsync: jest.fn(),
    hasServicesEnabledAsync: jest.fn(),
    getLastKnownPositionAsync: jest.fn(),
    Accuracy: { Balanced: 3 },
}))

jest.mock('@/services/deviceLocationService', () => ({
    sharedDeviceLocationService: {
        acquireFirstFix: jest.fn(),
        reverseGeocodeCached: jest.fn(),
    },
}))

jest.mock('@/services/onboardingService', () => ({
    getHasCompletedOnboarding: jest.fn(() => Promise.resolve(true)),
}))

function makeLocation(
    latitude: number,
    longitude: number
): Location.LocationObject {
    return {
        coords: {
            latitude,
            longitude,
            altitude: null,
            accuracy: 10,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
        },
        timestamp: Date.now(),
    }
}

function deferred<T>() {
    let resolve!: (value: T) => void
    let reject!: (reason?: unknown) => void
    const promise = new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
    })
    return { promise, resolve, reject }
}

interface ProbeApi {
    location: Location.LocationObject | null
    locationName: string
    deviceLocation: Location.LocationObject | null
    deviceLocationName: string
    isLocating: boolean
    isDeviceLocating: boolean
    updateLocation: (manual?: Location.LocationObject) => Promise<void>
    refreshLocation: () => Promise<void>
    ensureDeviceLocation: () => Promise<void>
}

function Probe({ onReady }: { onReady: (api: ProbeApi) => void }) {
    const ctx = useLocation()
    onReady({
        location: ctx.location,
        locationName: ctx.locationName,
        deviceLocation: ctx.deviceLocation,
        deviceLocationName: ctx.deviceLocationName,
        isLocating: ctx.isLocating,
        isDeviceLocating: ctx.isDeviceLocating,
        updateLocation: ctx.updateLocation,
        refreshLocation: ctx.refreshLocation,
        ensureDeviceLocation: ctx.ensureDeviceLocation,
    })
    return null
}

describe('LocationContext', () => {
    const mockAcquireFirstFix =
        sharedDeviceLocationService.acquireFirstFix as jest.Mock
    const mockReverseGeocodeCached =
        sharedDeviceLocationService.reverseGeocodeCached as jest.Mock
    const mockRequestPermissions =
        Location.requestForegroundPermissionsAsync as jest.Mock
    const mockHasServices = Location.hasServicesEnabledAsync as jest.Mock
    const mockLastKnown = Location.getLastKnownPositionAsync as jest.Mock
    const mockGetItem = AsyncStorage.getItem as jest.Mock
    const mockSetItem = AsyncStorage.setItem as jest.Mock
    const mockGetHasCompletedOnboarding =
        getHasCompletedOnboarding as jest.Mock

    let latest: ProbeApi | null
    let tree: ReactTestRenderer

    beforeEach(() => {
        latest = null
        jest.clearAllMocks()
        mockGetItem.mockResolvedValue(null)
        mockSetItem.mockResolvedValue(undefined)
        mockGetHasCompletedOnboarding.mockResolvedValue(true)
        mockRequestPermissions.mockResolvedValue({ status: 'granted' })
        mockHasServices.mockResolvedValue(true)
        mockLastKnown.mockResolvedValue(null)
        mockReverseGeocodeCached.mockImplementation(
            async (lat: number, lon: number) => `Place ${lat},${lon}`
        )
    })

    afterEach(() => {
        if (tree) {
            act(() => {
                tree.unmount()
            })
        }
    })

    async function mountProvider() {
        await act(async () => {
            tree = renderer.create(
                <LocationProvider>
                    <Probe
                        onReady={(api) => {
                            latest = api
                        }}
                    />
                </LocationProvider>
            )
        })
    }

    it('does not overwrite a manual selection when a GPS acquire with applyToActive completes', async () => {
        const gpsFix = deferred<Location.LocationObject>()
        mockAcquireFirstFix.mockReturnValue(gpsFix.promise)

        await mountProvider()

        const manual = makeLocation(40.71, -74.0)
        await act(async () => {
            await latest!.updateLocation(manual)
        })

        expect(latest!.location?.coords.latitude).toBe(40.71)
        expect(latest!.location?.coords.longitude).toBe(-74.0)

        const gps = makeLocation(53.35, -6.26)
        await act(async () => {
            gpsFix.resolve(gps)
            await gpsFix.promise
        })
        // Allow reverse-geocode / state flush after acquire completes
        await act(async () => {
            await Promise.resolve()
        })

        expect(latest!.location?.coords.latitude).toBe(40.71)
        expect(latest!.location?.coords.longitude).toBe(-74.0)
        expect(latest!.deviceLocation?.coords.latitude).toBe(53.35)
    })

    it('lets refreshLocation (force) replace a manual selection with GPS', async () => {
        const bootstrapFix = deferred<Location.LocationObject>()
        mockAcquireFirstFix.mockReturnValue(bootstrapFix.promise)

        await mountProvider()

        const manual = makeLocation(40.71, -74.0)
        await act(async () => {
            await latest!.updateLocation(manual)
        })

        await act(async () => {
            bootstrapFix.resolve(makeLocation(1, 1))
            await bootstrapFix.promise
        })
        await act(async () => {
            await Promise.resolve()
        })

        expect(latest!.location?.coords.latitude).toBe(40.71)

        const refreshFix = deferred<Location.LocationObject>()
        mockAcquireFirstFix.mockReturnValue(refreshFix.promise)

        await act(async () => {
            void latest!.refreshLocation()
        })

        const gps = makeLocation(53.35, -6.26)
        await act(async () => {
            refreshFix.resolve(gps)
            await refreshFix.promise
        })
        await act(async () => {
            await Promise.resolve()
        })

        expect(latest!.location?.coords.latitude).toBe(53.35)
        expect(latest!.location?.coords.longitude).toBe(-6.26)
        expect(mockAcquireFirstFix).toHaveBeenLastCalledWith({ force: true })
    })

    it('ensureDeviceLocation preview does not change the active location', async () => {
        mockAcquireFirstFix.mockRejectedValue(new Error('GPS acquisition timed out'))

        await mountProvider()
        await act(async () => {
            await Promise.resolve()
        })

        const manual = makeLocation(40.71, -74.0)
        await act(async () => {
            await latest!.updateLocation(manual)
        })

        expect(latest!.location?.coords.latitude).toBe(40.71)
        expect(latest!.deviceLocation).toBeNull()

        const previewFix = deferred<Location.LocationObject>()
        mockAcquireFirstFix.mockReturnValue(previewFix.promise)

        await act(async () => {
            void latest!.ensureDeviceLocation()
        })

        const gps = makeLocation(53.35, -6.26)
        await act(async () => {
            previewFix.resolve(gps)
            await previewFix.promise
        })
        await act(async () => {
            await Promise.resolve()
        })

        expect(latest!.location?.coords.latitude).toBe(40.71)
        expect(latest!.location?.coords.longitude).toBe(-74.0)
        expect(latest!.deviceLocation?.coords.latitude).toBe(53.35)
        expect(mockAcquireFirstFix).toHaveBeenLastCalledWith({ force: false })
    })

    it('uses shared DeviceLocationService for reverse geocode and GPS acquire', async () => {
        const gps = makeLocation(53.35, -6.26)
        mockAcquireFirstFix.mockResolvedValue(gps)
        mockReverseGeocodeCached.mockResolvedValue('Dublin')

        await mountProvider()
        await act(async () => {
            await Promise.resolve()
            await Promise.resolve()
        })

        expect(mockAcquireFirstFix).toHaveBeenCalled()
        expect(mockReverseGeocodeCached).toHaveBeenCalledWith(53.35, -6.26)
        expect(latest!.locationName).toBe('Dublin')
        expect(latest!.deviceLocationName).toBe('Dublin')
    })

    it('defers permission bootstrap until onboarding is complete', async () => {
        mockGetHasCompletedOnboarding.mockResolvedValue(false)

        await mountProvider()
        await act(async () => {
            await Promise.resolve()
            await Promise.resolve()
        })

        expect(mockRequestPermissions).not.toHaveBeenCalled()
        expect(mockAcquireFirstFix).not.toHaveBeenCalled()
        expect(latest!.isLocating).toBe(false)
    })
})
