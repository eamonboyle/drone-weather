/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './app/**/*.{js,jsx,ts,tsx}',
        './components/**/*.{js,jsx,ts,tsx}',
    ],
    presets: [require('nativewind/preset')],
    theme: {
        extend: {
            colors: {
                // Aviation theme
                background: '#08090c',
                surface: '#0f1115',
                surfaceElevated: '#161a20',
                accent: '#f59e0b',
                safe: '#10b981',
                warning: '#f59e0b',
                danger: '#ef4444',
            },
            fontFamily: {
                display: ['Outfit'],
                body: ['DMSans'],
            },
        },
    },
    plugins: [],
}
