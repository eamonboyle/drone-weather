import {
    classifyAirspaceLabel,
    isDroneRelevantAirspace,
    openAipTypeLabel,
} from '@/services/airspace/classifyAirspace'

describe('classifyAirspace', () => {
    it('maps OpenAIP type codes to labels', () => {
        expect(openAipTypeLabel(1)).toBe('RESTRICTED')
        expect(openAipTypeLabel(4)).toBe('CTR')
        expect(openAipTypeLabel('frz')).toBe('FRZ')
        expect(openAipTypeLabel(33)).toBe('SIV')
    })

    it('classifies restriction and controlled labels', () => {
        expect(classifyAirspaceLabel('FRZ')).toBe('restricted')
        expect(classifyAirspaceLabel('DANGER')).toBe('restricted')
        expect(classifyAirspaceLabel('CTR')).toBe('controlled')
        expect(classifyAirspaceLabel('GLIDING_SECTOR')).toBe('advisory')
    })

    it('keeps low-level drone-relevant airspace and drops the rest', () => {
        expect(
            isDroneRelevantAirspace('CTR', {
                value: 0,
                unit: 1,
                referenceDatum: 0,
            })
        ).toBe(true)
        expect(
            isDroneRelevantAirspace('PROHIBITED', {
                value: 0,
                unit: 1,
                referenceDatum: 0,
            })
        ).toBe(true)
        expect(
            isDroneRelevantAirspace('TMA', {
                value: 1500,
                unit: 1,
                referenceDatum: 1,
            })
        ).toBe(false)
        expect(
            isDroneRelevantAirspace('TMA', {
                value: 35,
                unit: 6,
                referenceDatum: 2,
            })
        ).toBe(false)
        expect(isDroneRelevantAirspace('GLIDING_SECTOR')).toBe(false)
        expect(isDroneRelevantAirspace('FIR')).toBe(false)
        expect(isDroneRelevantAirspace('SIV')).toBe(false)
    })
})
