import * as Location from 'expo-location'

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

export async function reverseGeocodePlaceName(
    latitude: number,
    longitude: number
): Promise<string> {
    const [place] = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
    })
    return place ? formatPlaceName(place) : 'Location name unavailable'
}
