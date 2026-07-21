const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const config = getDefaultConfig(__dirname)

// Treat .geojson as JSON source modules (airspace packs), not binary assets.
config.resolver.sourceExts = [...config.resolver.sourceExts, 'geojson']
config.resolver.assetExts = config.resolver.assetExts.filter(
    (ext) => ext !== 'geojson'
)

module.exports = withNativeWind(config, { input: './styles/globals.css' })
