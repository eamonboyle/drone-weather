/**
 * Drone Weather — semantic design tokens
 * Black / teal / amber aviation identity. Prefer these over hard-coded hex.
 */

export const Theme = {
    colors: {
        background: '#08090c',
        surface: '#0f1115',
        surfaceElevated: '#161a20',
        surfaceOverlay: '#1c2128',

        border: 'rgba(255, 255, 255, 0.06)',
        borderMuted: 'rgba(255, 255, 255, 0.04)',

        accent: '#f59e0b',
        accentMuted: 'rgba(245, 158, 11, 0.6)',
        accentDim: 'rgba(245, 158, 11, 0.2)',

        text: '#f8fafc',
        textSecondary: '#94a3b8',
        textMuted: '#64748b',
        textInverse: '#08090c',

        safe: '#10b981',
        safeMuted: 'rgba(16, 185, 129, 0.25)',
        safeSurface: 'rgba(6, 95, 70, 0.4)',
        warning: '#f59e0b',
        warningMuted: 'rgba(245, 158, 11, 0.25)',
        danger: '#ef4444',
        dangerMuted: 'rgba(239, 68, 68, 0.25)',
        dangerSurface: 'rgba(127, 29, 29, 0.4)',

        /** Neutral weather (e.g. cloud cover) — never go/no-go */
        weatherNeutral: '#94a3b8',
        weatherNeutralSurface: 'rgba(22, 26, 32, 0.6)',

        tabBar: '#0a0b0e',
        tabActive: '#f59e0b',
        tabInactive: '#64748b',
    },

    elevation: {
        none: 0,
        low: 2,
        medium: 8,
        high: 16,
    },

    typography: {
        fontFamily: {
            display: 'Outfit',
            body: 'DMSans',
        },
        sizes: {
            xs: 12,
            sm: 14,
            base: 16,
            lg: 18,
            xl: 20,
            '2xl': 24,
            '3xl': 30,
        },
    },

    spacing: {
        xs: 4,
        sm: 8,
        md: 12,
        lg: 16,
        xl: 24,
        '2xl': 32,
    },

    borderRadius: {
        sm: 8,
        md: 12,
        lg: 16,
        xl: 20,
        full: 9999,
    },

    touchTarget: 44,
} as const
