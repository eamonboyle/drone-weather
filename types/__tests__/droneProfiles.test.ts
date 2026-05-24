import { DRONE_PROFILES, sortProfilesByReleaseYear } from '../droneProfiles'

describe('DRONE_PROFILES', () => {
    it('has unique profile ids', () => {
        const ids = DRONE_PROFILES.map((profile) => profile.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it('has required fields on every profile', () => {
        for (const profile of DRONE_PROFILES) {
            expect(profile.id).toBeTruthy()
            expect(profile.name).toBeTruthy()
            expect(profile.manufacturer).toBeTruthy()
            expect(profile.model).toBeTruthy()
            expect(profile.releaseYear).toBeGreaterThanOrEqual(2015)
            expect(profile.releaseYear).toBeLessThanOrEqual(2030)
        }
    })

    it('sorts newest models first', () => {
        const sorted = sortProfilesByReleaseYear(DRONE_PROFILES)

        expect(sorted[0].id).toBe('dji-flip')
        expect(sorted[0].releaseYear).toBe(2025)
        expect(sorted[sorted.length - 1].id).toBe('dji-phantom-4-rtk')
        expect(sorted[sorted.length - 1].releaseYear).toBe(2018)

        for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i - 1].releaseYear).toBeGreaterThanOrEqual(
                sorted[i].releaseYear
            )
        }
    })

    it('keeps thresholds within sane bounds', () => {
        for (const profile of DRONE_PROFILES) {
            const { temperature, windSpeed, windGust, visibility, weather } =
                profile.thresholds

            expect(temperature.min).toBeLessThan(temperature.max)
            expect(temperature.min).toBeGreaterThanOrEqual(-40)
            expect(temperature.max).toBeLessThanOrEqual(55)

            expect(windSpeed.max).toBeGreaterThanOrEqual(15)
            expect(windSpeed.max).toBeLessThanOrEqual(60)
            expect(windGust.max).toBeGreaterThanOrEqual(windSpeed.max)

            expect(visibility.min).toBeGreaterThanOrEqual(1)
            expect(visibility.min).toBeLessThanOrEqual(10)

            expect(weather.maxCloudCover).toBeGreaterThanOrEqual(80)
            expect(weather.maxCloudCover).toBeLessThanOrEqual(100)
            expect(weather.maxPrecipitationProbability).toBeGreaterThanOrEqual(
                15
            )
            expect(weather.maxPrecipitationProbability).toBeLessThanOrEqual(65)
        }
    })

    it('uses manufacturer-accurate wind limits for corrected profiles', () => {
        const byId = Object.fromEntries(
            DRONE_PROFILES.map((profile) => [profile.id, profile])
        )

        expect(byId['dji-agras-t40'].thresholds.windSpeed.max).toBe(22)
        expect(byId['dji-matrice-30t'].thresholds.windSpeed.max).toBe(43)
        expect(byId['parrot-anafi-ai'].thresholds.windSpeed.max).toBe(50)
        expect(byId['skydio-x10'].thresholds.windGust.max).toBe(45)
        expect(byId['dji-mini-4-pro'].thresholds.windSpeed.max).toBe(39)
    })

    it('includes newly added flagship models', () => {
        const ids = new Set(DRONE_PROFILES.map((profile) => profile.id))

        expect(ids.has('dji-mini-5-pro')).toBe(true)
        expect(ids.has('dji-mavic-4-pro')).toBe(true)
        expect(ids.has('dji-air-3s')).toBe(true)
        expect(ids.has('autel-evo-max-4t')).toBe(true)
        expect(ids.has('skydio-x10d')).toBe(true)
        expect(ids.has('parrot-anafi-usa')).toBe(true)
    })
})
