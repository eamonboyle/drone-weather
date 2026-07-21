import AsyncStorage from '@react-native-async-storage/async-storage'
import {
    clearInFlightPackDownloadsForTests,
    getOpenAipPackForCountry,
    isLargePackConfirmationError,
    openAipCountryUrl,
} from '@/services/airspace/airspacePackService'
import { MAP_CONFIG } from '@/constants/mapConfig'

const mockDownloadAsync = jest.fn()
const mockGetInfoAsync = jest.fn()
const mockMakeDirectoryAsync = jest.fn()
const mockReadAsStringAsync = jest.fn()
const mockWriteAsStringAsync = jest.fn()
const mockMoveAsync = jest.fn()
const mockDeleteAsync = jest.fn()

jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
}))

jest.mock('expo-file-system/legacy', () => ({
    documentDirectory: 'file:///docs/',
    cacheDirectory: 'file:///cache/',
    EncodingType: { UTF8: 'utf8' },
    downloadAsync: (...args: unknown[]) => mockDownloadAsync(...args),
    getInfoAsync: (...args: unknown[]) => mockGetInfoAsync(...args),
    makeDirectoryAsync: (...args: unknown[]) => mockMakeDirectoryAsync(...args),
    readAsStringAsync: (...args: unknown[]) => mockReadAsStringAsync(...args),
    writeAsStringAsync: (...args: unknown[]) => mockWriteAsStringAsync(...args),
    moveAsync: (...args: unknown[]) => mockMoveAsync(...args),
    deleteAsync: (...args: unknown[]) => mockDeleteAsync(...args),
}))

jest.mock('@/services/airspace/normalizeAirspace', () => ({
    normalizeOpenAipFeatureCollection: (
        raw: GeoJSON.FeatureCollection,
        options: { country: string }
    ) => ({
        type: 'FeatureCollection',
        features: raw.features.map((feature, index) => ({
            ...feature,
            properties: {
                id: `f-${index}`,
                name: 'Test',
                source: 'openaip',
                category: 'restricted',
                typeLabel: 'CTR',
                country: options.country.toUpperCase(),
            },
        })),
        metadata: {
            source: 'openaip',
            country: options.country.toUpperCase(),
            generatedAt: '2026-07-21T00:00:00.000Z',
            featureCount: raw.features.length,
        },
    }),
}))

function smallFeatureCollection(): GeoJSON.FeatureCollection {
    return {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                properties: { type: 2, name: 'Test CTR' },
                geometry: {
                    type: 'Polygon',
                    coordinates: [
                        [
                            [0, 0],
                            [1, 0],
                            [1, 1],
                            [0, 1],
                            [0, 0],
                        ],
                    ],
                },
            },
        ],
    }
}

describe('airspacePackService', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        clearInFlightPackDownloadsForTests()
        ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(null)
        mockMakeDirectoryAsync.mockResolvedValue(undefined)
        mockMoveAsync.mockResolvedValue(undefined)
        mockDeleteAsync.mockResolvedValue(undefined)
        mockWriteAsStringAsync.mockResolvedValue(undefined)
        mockGetInfoAsync.mockImplementation(async (uri: string) => {
            if (uri.endsWith('airspace-packs-v3/')) {
                return { exists: true, isDirectory: true }
            }
            if (uri.includes('/raw-') || uri.includes('/norm-')) {
                return { exists: true, size: 2048, isDirectory: false }
            }
            // final pack path — absent unless test sets otherwise
            return { exists: false, isDirectory: false }
        })
    })

    it('builds the OpenAIP country URL', () => {
        expect(openAipCountryUrl('ie')).toBe(
            `${MAP_CONFIG.openAipBucketBase}/ie_asp.geojson`
        )
    })

    it('downloads to temp, normalizes, and commits atomically', async () => {
        const collection = smallFeatureCollection()
        mockDownloadAsync.mockResolvedValue({
            status: 200,
            uri: 'file:///docs/airspace-packs-v3/raw-ie-temp.geojson',
        })
        mockReadAsStringAsync.mockResolvedValue(JSON.stringify(collection))

        const handle = await getOpenAipPackForCountry('ie')

        expect(mockDownloadAsync).toHaveBeenCalled()
        expect(mockWriteAsStringAsync).toHaveBeenCalled()
        expect(mockMoveAsync).toHaveBeenCalledWith(
            expect.objectContaining({
                to: 'file:///docs/airspace-packs-v3/ie.geojson',
            })
        )
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
            'airspace:pack-index:v3',
            expect.stringContaining('"country":"IE"')
        )
        expect(handle.uri).toBe('file:///docs/airspace-packs-v3/ie.geojson')
        expect(handle.meta.featureCount).toBe(1)
        expect(handle.meta.attribution).toContain('OpenAIP')
        expect(mockDeleteAsync).toHaveBeenCalled()
    })

    it('rejects oversized downloads when no last-good cache exists', async () => {
        mockDownloadAsync.mockResolvedValue({
            status: 200,
            uri: 'file:///docs/airspace-packs-v3/raw-us-temp.geojson',
        })
        mockGetInfoAsync.mockImplementation(async (uri: string) => {
            if (uri.endsWith('airspace-packs-v3/')) {
                return { exists: true, isDirectory: true }
            }
            if (uri.includes('/raw-')) {
                return {
                    exists: true,
                    size: MAP_CONFIG.maxRawPackBytes + 1,
                    isDirectory: false,
                }
            }
            return { exists: false, isDirectory: false }
        })

        await expect(getOpenAipPackForCountry('us')).rejects.toThrow(
            /too large/i
        )
    })

    it('requires confirmation for packs between confirm and hard max', async () => {
        mockDownloadAsync.mockResolvedValue({
            status: 200,
            uri: 'file:///docs/airspace-packs-v3/raw-br-temp.geojson',
        })
        mockGetInfoAsync.mockImplementation(async (uri: string) => {
            if (uri.endsWith('airspace-packs-v3/')) {
                return { exists: true, isDirectory: true }
            }
            if (uri.includes('/raw-')) {
                return {
                    exists: true,
                    size: MAP_CONFIG.confirmRawPackBytes + 1,
                    isDirectory: false,
                }
            }
            return { exists: false, isDirectory: false }
        })

        try {
            await getOpenAipPackForCountry('br')
            throw new Error('expected confirmation error')
        } catch (error) {
            expect(isLargePackConfirmationError(error)).toBe(true)
        }
        expect(mockReadAsStringAsync).not.toHaveBeenCalled()
    })

    it('loads a large pack when allowLargePack is set', async () => {
        mockDownloadAsync.mockResolvedValue({
            status: 200,
            uri: 'file:///docs/airspace-packs-v3/raw-br-temp.geojson',
        })
        mockGetInfoAsync.mockImplementation(async (uri: string) => {
            if (uri.endsWith('airspace-packs-v3/')) {
                return { exists: true, isDirectory: true }
            }
            if (uri.includes('/raw-') || uri.includes('/norm-')) {
                return {
                    exists: true,
                    size: MAP_CONFIG.confirmRawPackBytes + 1,
                    isDirectory: false,
                }
            }
            return { exists: false, isDirectory: false }
        })
        mockReadAsStringAsync.mockResolvedValue(
            JSON.stringify(smallFeatureCollection())
        )

        const handle = await getOpenAipPackForCountry('br', {
            allowLargePack: true,
        })
        expect(handle.uri).toContain('br.geojson')
        expect(handle.meta.featureCount).toBe(1)
    })

    it('auto-accepts mid-size packs under the confirm threshold', async () => {
        mockDownloadAsync.mockResolvedValue({
            status: 200,
            uri: 'file:///docs/airspace-packs-v3/raw-ca-temp.geojson',
        })
        mockGetInfoAsync.mockImplementation(async (uri: string) => {
            if (uri.endsWith('airspace-packs-v3/')) {
                return { exists: true, isDirectory: true }
            }
            if (uri.includes('/raw-') || uri.includes('/norm-')) {
                return {
                    exists: true,
                    size: 12 * 1024 * 1024,
                    isDirectory: false,
                }
            }
            return { exists: false, isDirectory: false }
        })
        mockReadAsStringAsync.mockResolvedValue(
            JSON.stringify(smallFeatureCollection())
        )

        const handle = await getOpenAipPackForCountry('ca')
        expect(handle.uri).toContain('ca.geojson')
    })

    it('returns last-good cache on HTTP 404 when a pack file exists', async () => {
        mockDownloadAsync.mockResolvedValue({
            status: 404,
            uri: 'file:///docs/airspace-packs-v3/raw-fr-temp.geojson',
        })
        mockGetInfoAsync.mockImplementation(async (uri: string) => {
            if (uri.endsWith('airspace-packs-v3/')) {
                return { exists: true, isDirectory: true }
            }
            if (uri.endsWith('fr.geojson')) {
                return { exists: true, size: 100, isDirectory: false }
            }
            return { exists: false, isDirectory: false }
        })
        ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(
            JSON.stringify({
                fr: {
                    country: 'FR',
                    source: 'openaip',
                    fetchedAt: '2020-01-01T00:00:00.000Z',
                    featureCount: 3,
                },
            })
        )

        const handle = await getOpenAipPackForCountry('fr', { force: true })
        expect(handle.uri).toContain('fr.geojson')
        expect(handle.meta.featureCount).toBe(3)
    })

    it('rethrows when download fails and no cache exists', async () => {
        mockDownloadAsync.mockResolvedValue({
            status: 500,
            uri: 'file:///docs/airspace-packs-v3/raw-de-temp.geojson',
        })

        await expect(
            getOpenAipPackForCountry('de', { force: true })
        ).rejects.toThrow(/unavailable/i)
    })

    it('rejects corrupt JSON when no last-good cache exists', async () => {
        mockDownloadAsync.mockResolvedValue({
            status: 200,
            uri: 'file:///docs/airspace-packs-v3/raw-es-temp.geojson',
        })
        mockReadAsStringAsync.mockResolvedValue('{not-json')

        await expect(getOpenAipPackForCountry('es')).rejects.toThrow(/corrupt/i)
    })

    it('deduplicates simultaneous downloads for the same country', async () => {
        mockDownloadAsync.mockResolvedValue({
            status: 200,
            uri: 'file:///docs/airspace-packs-v3/raw-it-temp.geojson',
        })
        mockReadAsStringAsync.mockResolvedValue(
            JSON.stringify(smallFeatureCollection())
        )

        const [ha, hb] = await Promise.all([
            getOpenAipPackForCountry('it'),
            getOpenAipPackForCountry('it'),
        ])
        expect(ha.uri).toBe(hb.uri)
        expect(mockDownloadAsync).toHaveBeenCalledTimes(1)
    })
})
