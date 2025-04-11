/**
 * Configuration settings for Power Alert Outage Management
 */
const CONFIG = {
    // API Base URL
    API_BASE_URL: 'http://localhost:8080',

    // Mapbox token
    MAPBOX_TOKEN: 'pk.eyJ1IjoiY2hhbWF0aDQ5OTciLCJhIjoiY204bXhqN2N2MGtuMDJscGw2bDk1N3RpNyJ9.tzXMf6U8UAd0GY1GR-iuTQ',

    // Mapbox style URL
    MAPBOX_STYLE: 'mapbox://styles/mapbox/streets-v11',

    // Default map center coordinates (Sri Lanka)
    DEFAULT_MAP_CENTER: [80.6337, 7.8731],

    // Default map zoom level
    DEFAULT_MAP_ZOOM: 7,

    // Authentication
    AUTH_TOKEN_KEY: 'power_alert_auth_token',

    // Outage types with their corresponding colors
    OUTAGE_TYPES: {
        ELECTRICITY: {
            color: '#0dcaf0',
            icon: 'bx-bolt'
        },
        WATER: {
            color: '#0d6efd',
            icon: 'bx-droplet'
        },
        GAS: {
            color: '#fd7e14',
            icon: 'bx-flame'
        },
        INTERNET: {
            color: '#6f42c1',
            icon: 'bx-wifi'
        }
    },

    // Outage statuses with their corresponding colors
    OUTAGE_STATUSES: {
        SCHEDULED: {
            color: '#0dcaf0',
            icon: 'bx-calendar'
        },
        ONGOING: {
            color: '#ffc107',
            icon: 'bx-play-circle'
        },
        COMPLETED: {
            color: '#198754',
            icon: 'bx-check-circle'
        },
        CANCELLED: {
            color: '#dc3545',
            icon: 'bx-x-circle'
        }
    },

    // Month names
    MONTHS: [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ],

    // Current year (for default history filters)
    CURRENT_YEAR: new Date().getFullYear(),

    // Available years for history selection (last 5 years)
    AVAILABLE_YEARS: Array.from({length: 5}, (_, i) => new Date().getFullYear() - i),

    // Toast notification duration (ms)
    TOAST_DURATION: 5000
};