import { DeviceLocationService } from '@/services/deviceLocationService'
import type * as Location from 'expo-location'

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

describe('DeviceLocationService', () => {
    beforeEach(() => {
        jest.useFakeTimers()
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    it('shares a single in-flight acquisition (single-flight)', async () => {
        let watchCb: ((loc: Location.LocationObject) => void) | null = null
        const watchPositionAsync = jest.fn(
            async (
                _opts: Location.LocationOptions,
                cb: (loc: Location.LocationObject) => void
            ) => {
                watchCb = cb
                return { remove: jest.fn() }
            }
        )

        const service = new DeviceLocationService({
            watchPositionAsync: watchPositionAsync as never,
            reverseGeocodePlace: jest.fn(async () => ({
                name: 'Dublin',
                countryCode: 'ie',
            })),
        })

        const p1 = service.acquireFirstFix()
        const p2 = service.acquireFirstFix()
        expect(service.isAcquiring).toBe(true)
        expect(watchPositionAsync).toHaveBeenCalledTimes(1)

        watchCb!(makeLocation(53.35, -6.26))
        await expect(p1).resolves.toMatchObject({
            coords: { latitude: 53.35 },
        })
        await expect(p2).resolves.toMatchObject({
            coords: { latitude: 53.35 },
        })
    })

    it('times out and cancels the watch after 8 seconds', async () => {
        const remove = jest.fn()
        const watchPositionAsync = jest.fn(
            async (
                _opts: Location.LocationOptions,
                _cb: (loc: Location.LocationObject) => void
            ) => ({ remove })
        )

        const service = new DeviceLocationService({
            watchPositionAsync: watchPositionAsync as never,
        })

        const promise = service.acquireFirstFix()
        const assertion = expect(promise).rejects.toThrow(
            'GPS acquisition timed out'
        )
        jest.advanceTimersByTime(8000)
        await assertion
        expect(remove).toHaveBeenCalled()
    })

    it('force cancels an in-flight watch and starts a new acquisition', async () => {
        const remove1 = jest.fn()
        let call = 0
        let secondCb: ((loc: Location.LocationObject) => void) | null = null

        const watchPositionAsync = jest.fn(
            async (
                _opts: Location.LocationOptions,
                cb: (loc: Location.LocationObject) => void
            ) => {
                call += 1
                if (call === 1) {
                    return { remove: remove1 }
                }
                secondCb = cb
                return { remove: jest.fn() }
            }
        )

        const service = new DeviceLocationService({
            watchPositionAsync: watchPositionAsync as never,
        })

        const first = service.acquireFirstFix()
        const second = service.acquireFirstFix({ force: true })

        await expect(first).rejects.toThrow('GPS acquisition cancelled')
        expect(remove1).toHaveBeenCalled()

        secondCb!(makeLocation(51.5, -0.12))
        await expect(second).resolves.toMatchObject({
            coords: { latitude: 51.5 },
        })
        expect(watchPositionAsync).toHaveBeenCalledTimes(2)
    })

    it('reuses reverse-geocoded places for rounded coordinates', async () => {
        const reverseGeocodePlace = jest.fn(async () => ({
            name: 'Test City',
            countryCode: 'ie',
        }))
        const service = new DeviceLocationService({
            reverseGeocodePlace,
        })

        const a = await service.reverseGeocodePlaceCached(53.3501, -6.2603)
        // Same toFixed(3) bucket (53.350,-6.260)
        const b = await service.reverseGeocodePlaceCached(53.3504, -6.2602)
        expect(a).toEqual({ name: 'Test City', countryCode: 'ie' })
        expect(b).toEqual({ name: 'Test City', countryCode: 'ie' })
        expect(reverseGeocodePlace).toHaveBeenCalledTimes(1)
        expect(await service.reverseGeocodeCached(53.3501, -6.2603)).toBe(
            'Test City'
        )
    })
})
