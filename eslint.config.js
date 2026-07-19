// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')

module.exports = defineConfig([
    expoConfig,
    {
        ignores: ['dist/*'],
    },
    {
        // eslint-config-expo ~57 enables React Compiler lint rules that flag
        // common RN bootstrap/sync patterns (location bootstrap, hour tick, map center).
        // Keep static-components; relax the rest until those screens are refactored.
        rules: {
            'react-hooks/set-state-in-effect': 'off',
            'react-hooks/refs': 'off',
            'react-hooks/preserve-manual-memoization': 'off',
        },
    },
])
