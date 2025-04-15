/**
 * config.js - Application configuration settings
 *
 * This file contains global configuration settings for the PowerAlert application.
 * It defines constants and environment-specific settings used throughout the app.
 */

/**
 * PowerAlert Configuration Object
 */
let CONFIG = {
    // API Settings
    API_BASE_URL: 'http://localhost:8080',
    API_VERSION: 'v1',
    API_TIMEOUT: 30000, // 30 seconds
    APP_BASE_URL: 'http://localhost:63342/Power-Alert-System-Frontend',

    // Authentication
    AUTH_TOKEN_KEY: 'auth_token',
    AUTH_REFRESH_ENDPOINT: '/api/auth/refresh',
    AUTH_EXPIRY_BUFFER: 300, // 5 minutes before token expiry to trigger refresh

    // Maps Configuration
    MAPBOX_TOKEN: 'pk.eyJ1IjoiY2hhbWF0aDQ5OTciLCJhIjoiY204bXhqN2N2MGtuMDJscGw2bDk1N3RpNyJ9.tzXMf6U8UAd0GY1GR-iuTQ',
    MAPBOX_STYLE: 'mapbox://styles/mapbox/streets-v11',
    DEFAULT_MAP_CENTER: [80.6337, 7.8731], // Sri Lanka center coordinates
    DEFAULT_MAP_ZOOM: 7,

    // UI Settings
    TOAST_DURATION: 5000,
    MODAL_ANIMATION_DURATION: 300,
    DEBOUNCE_DELAY: 300,
    THEME_KEY: 'theme',
    SIDEBAR_COLLAPSED_KEY: 'sidebarCollapsed',

    // Outage Settings
    OUTAGE_TYPES: {
        ELECTRICITY: {
            color: '#4f46e5',
            icon: 'bxs-bolt',
            label: 'Electricity'
        },
        WATER: {
            color: '#0ea5e9',
            icon: 'bxs-droplet',
            label: 'Water'
        },
        GAS: {
            color: '#f97316',
            icon: 'bxs-flame',
            label: 'Gas'
        },
        INTERNET: {
            color: '#a855f7',
            icon: 'bx-wifi',
            label: 'Internet'
        }
    },

    OUTAGE_STATUSES: {
        SCHEDULED: {
            color: '#4f46e5',
            bgClass: 'bg-blue-100',
            textClass: 'text-blue-800',
            icon: 'bx-calendar',
            label: 'Scheduled'
        },
        ONGOING: {
            color: '#fbbf24',
            bgClass: 'bg-yellow-100',
            textClass: 'text-yellow-800',
            icon: 'bx-error-circle',
            label: 'Ongoing'
        },
        COMPLETED: {
            color: '#10b981',
            bgClass: 'bg-green-100',
            textClass: 'text-green-800',
            icon: 'bx-check-circle',
            label: 'Completed'
        },
        CANCELLED: {
            color: '#ef4444',
            bgClass: 'bg-red-100',
            textClass: 'text-red-800',
            icon: 'bx-x-circle',
            label: 'Cancelled'
        }
    },

    // Time and Date Settings
    DEFAULT_DATE_FORMAT: {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    },

    SHORT_DATE_FORMAT: {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    },

    // Data Settings
    TABLE_PAGE_SIZES: [10, 25, 50, 100],
    DEFAULT_PAGE_SIZE: 10,

    // Feature Flags
    FEATURES: {
        DARK_MODE: true,
        NOTIFICATIONS: true,
        COMMUNITY_FEEDBACK: true,
        ALTERNATIVE_RESOURCES: true,
        GEOSPATIAL_VISUALIZATION: true
    },

    // Utility Providers
    UTILITY_TYPES: [
        { value: 'ELECTRICITY', label: 'Electricity Provider' },
        { value: 'WATER', label: 'Water Provider' },
        { value: 'GAS', label: 'Gas Provider' },
        { value: 'INTERNET', label: 'Internet Provider' }
    ],

    // User Settings
    USER_ROLES: {
        ADMIN: 'Administrator',
        UTILITY_PROVIDER: 'Utility Provider',
        USER: 'User'
    },

    LANGUAGES: [
        { code: 'en', name: 'English' },
        { code: 'si', name: 'Sinhala' },
        { code: 'ta', name: 'Tamil' }
    ],

    // Notifications
    NOTIFICATION_CHANNELS: [
        { value: 'EMAIL', label: 'Email' },
        { value: 'SMS', label: 'SMS' },
        { value: 'PUSH', label: 'Push Notification' },
        { value: 'WHATSAPP', label: 'WhatsApp' }
    ],

    // Resources
    RESOURCE_TYPES: [
        { value: 'WATER_SOURCE', label: 'Water Source' },
        { value: 'GENERATOR', label: 'Generator' },
        { value: 'CHARGING_STATION', label: 'Charging Station' },
        { value: 'FUEL_STATION', label: 'Fuel Station' },
        { value: 'INTERNET_HOTSPOT', label: 'Internet Hotspot' },
        { value: 'EMERGENCY_CENTER', label: 'Emergency Center' },
        { value: 'COMMUNITY_CENTER', label: 'Community Center' }
    ],

    // Feedback Types
    FEEDBACK_TYPES: [
        { value: 'CONFIRMATION', label: 'Confirm Outage', icon: 'bx-check-circle', color: '#10b981' },
        { value: 'DISPUTE', label: 'Dispute Outage', icon: 'bx-x-circle', color: '#ef4444' },
        { value: 'RESTORATION', label: 'Service Restored', icon: 'bx-power-off', color: '#4f46e5' },
        { value: 'INFORMATION', label: 'Additional Info', icon: 'bx-info-circle', color: '#0ea5e9' },
        { value: 'COMPLAINT', label: 'Complaint', icon: 'bx-message-alt-error', color: '#f97316' }
    ],

    // Constants
    MAX_UPLOAD_SIZE: 5 * 1024 * 1024, // 5MB
    MAX_PASSWORD_ATTEMPTS: 5,
    PASSWORD_LOCKOUT_TIME: 15 * 60 * 1000, // 15 minutes
    SESSION_TIMEOUT: 60 * 60 * 1000, // 1 hour

    // Development Settings
    DEV_MODE: window.location.hostname === 'localhost',
    LOG_LEVEL: window.location.hostname === 'localhost' ? 'debug' : 'error',

    /**
     * Get application URL with endpoint
     * @param {string} path - Application path
     * @returns {string} Full application URL
     */
    getAppUrl(path) {
        // Remove leading slash if present to avoid double slashes
        const cleanPath = path.startsWith('/') ? path.substring(1) : path;
        return `${this.APP_BASE_URL}/${cleanPath}`;
    },

    /**
     * Get API URL with endpoint
     * @param {string} endpoint - API endpoint
     * @returns {string} Full API URL
     */
    getApiUrl(endpoint) {
        return `${this.API_BASE_URL}${endpoint}`;
    },

    /**
     * Get outage type info
     * @param {string} type - Outage type
     * @returns {Object} Type info
     */
    getOutageTypeInfo(type) {
        return this.OUTAGE_TYPES[type] || {
            color: '#6b7280',
            icon: 'bx-question-mark',
            label: type || 'Unknown'
        };
    },

    /**
     * Get outage status info
     * @param {string} status - Outage status
     * @returns {Object} Status info
     */
    getOutageStatusInfo(status) {
        return this.OUTAGE_STATUSES[status] || {
            color: '#6b7280',
            bgClass: 'bg-gray-100',
            textClass: 'text-gray-800',
            icon: 'bx-question-mark',
            label: status || 'Unknown'
        };
    },

    /**
     * Get user role display name
     * @param {string} role - User role
     * @returns {string} Role display name
     */
    getUserRoleDisplay(role) {
        return this.USER_ROLES[role] || role || 'User';
    },

    /**
     * Get language display name
     * @param {string} code - Language code
     * @returns {string} Language display name
     */
    getLanguageDisplay(code) {
        const language = this.LANGUAGES.find(lang => lang.code === code);
        return language ? language.name : code;
    }
};

// Export CONFIG object for use in other modules
export default CONFIG;

// Also make it available globally if needed
window.CONFIG = CONFIG;