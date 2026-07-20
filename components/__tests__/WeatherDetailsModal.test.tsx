import React from 'react'
import renderer from 'react-test-renderer'
import { WeatherDetailsModal } from '@/components/WeatherDetailsModal'

jest.mock('@/contexts/WeatherConfigContext', () => {
    const { DEFAULT_WEATHER_THRESHOLDS } = jest.requireActual(
        '@/types/weatherConfig'
    ) as typeof import('@/types/weatherConfig')
    return {
        useWeatherConfig: () => ({
            thresholds: DEFAULT_WEATHER_THRESHOLDS,
        }),
    }
})

jest.mock('@/services/droneFlyabilityService', () => ({
    DroneFlyabilityService: {
        checkFlyingConditions: jest.fn(() => {
            throw new Error('should not evaluate when hidden')
        }),
    },
}))

describe('WeatherDetailsModal', () => {
    it('returns null while hidden and does not evaluate flyability', () => {
        let tree: renderer.ReactTestRenderer
        renderer.act(() => {
            tree = renderer.create(
                <WeatherDetailsModal
                    isVisible={false}
                    onClose={() => undefined}
                    hourData={{
                        time: new Date('2026-05-24T12:00:00.000Z'),
                        temperature2m: 20,
                        relativeHumidity2m: 50,
                        dewPoint2m: 10,
                        apparentTemperature: 19,
                        precipitationProbability: 10,
                        precipitation: 0,
                        rain: 0,
                        showers: 0,
                        snowfall: 0,
                        snowDepth: 0,
                        weatherCode: 0,
                        cloudCover: 30,
                        cloudCoverLow: 10,
                        cloudCoverMid: 10,
                        cloudCoverHigh: 10,
                        visibility: 10000,
                        evapotranspiration: 0,
                        et0FaoEvapotranspiration: 0,
                        vapourPressureDeficit: 0,
                        windSpeed10m: 10,
                        windSpeed80m: 12,
                        windSpeed120m: 14,
                        windSpeed180m: 16,
                        windDirection10m: 180,
                        windDirection80m: 180,
                        windDirection120m: 180,
                        windDirection180m: 180,
                        windGusts10m: 15,
                        temperature80m: 18,
                        temperature120m: 16,
                        temperature180m: 14,
                    }}
                />
            )
        })
        expect(tree!.toJSON()).toBeNull()
    })
})
