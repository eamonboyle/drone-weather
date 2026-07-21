import * as Location from 'expo-location'
import { normalizeCountryCode } from '@/constants/mapConfig'

export interface ReverseGeocodePlace {
    name: string
    countryCode: string | null
}

export function formatPlaceName(
    place: Location.LocationGeocodedAddress
): string {
    const locality =
        place.city ||
        place.district ||
        place.subregion ||
        place.region ||
        ''
    const country = place.country || ''

    if (locality && country) return `${locality}, ${country}`
    if (locality) return locality
    if (country) return country
    return 'Location name unavailable'
}

export function placeFromGeocodedAddress(
    place: Location.LocationGeocodedAddress
): ReverseGeocodePlace {
    return {
        name: formatPlaceName(place),
        countryCode: normalizeCountryCode(place.isoCountryCode),
    }
}

export async function reverseGeocodePlace(
    latitude: number,
    longitude: number
): Promise<ReverseGeocodePlace> {
    const [place] = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
    })
    if (!place) {
        return { name: 'Location name unavailable', countryCode: null }
    }
    return placeFromGeocodedAddress(place)
}

export async function reverseGeocodePlaceName(
    latitude: number,
    longitude: number
): Promise<string> {
    const place = await reverseGeocodePlace(latitude, longitude)
    return place.name
}
