export function formatDate(date, options = {}) {
    if (!date) return '';

    const dateObj = typeof date === 'string' ? new Date(date) : date;

    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };

    const formatOptions = { ...defaultOptions, ...options };

    return new Intl.DateTimeFormat('en-US', formatOptions).format(dateObj);
}

export function getRelativeTimeString(date) {
    if (!date) return 'N/A';

    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now - dateObj;

    // Define time units in milliseconds
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const week = 7 * day;
    const month = 30 * day;

    // Return appropriate relative time string
    if (diffMs < 0) {
        // Future date
        const absDiff = Math.abs(diffMs);
        if (absDiff < hour) {
            const mins = Math.floor(absDiff / minute);
            return `in ${mins} minute${mins !== 1 ? 's' : ''}`;
        } else if (absDiff < day) {
            const hours = Math.floor(absDiff / hour);
            return `in ${hours} hour${hours !== 1 ? 's' : ''}`;
        } else if (absDiff < week) {
            const days = Math.floor(absDiff / day);
            return `in ${days} day${days !== 1 ? 's' : ''}`;
        } else {
            return formatDate(dateObj);
        }
    } else {
        // Past date
        if (diffMs < minute) {
            return 'just now';
        } else if (diffMs < hour) {
            const mins = Math.floor(diffMs / minute);
            return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
        } else if (diffMs < day) {
            const hours = Math.floor(diffMs / hour);
            return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        } else if (diffMs < week) {
            const days = Math.floor(diffMs / day);
            return `${days} day${days !== 1 ? 's' : ''} ago`;
        } else if (diffMs < month) {
            const weeks = Math.floor(diffMs / week);
            return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
        } else {
            return formatDate(dateObj);
        }
    }
}


export function calculateDuration(startDate, endDate) {
    if (!startDate || !endDate) return 'Unknown';

    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

    const diff = end - start;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours >= 24) {
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        return `${days}d ${remainingHours}h ${minutes}m`;
    } else {
        return `${hours}h ${minutes}m`;
    }
}

export function hashStringToNumber(str, min = 0, max = 10000) {
    if (!str) return min + Math.floor((max - min) / 2);

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }

    // Map the hash to the desired range
    const normalizedHash = Math.abs(hash) % (max - min);
    return min + normalizedHash;
}

export function getInitials(name) {
    if (!name) return '?';

    const parts = name.split(' ');
    if (parts.length === 1) {
        return name.charAt(0).toUpperCase();
    }

    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}


export function truncateText(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}


export function debounce(func, wait = 300) {
    let timeout;

    return function(...args) {
        const context = this;

        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}


export function throttle(func, limit = 300) {
    let inThrottle;

    return function(...args) {
        const context = this;

        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}


export function toCamelCase(str) {
    return str.replace(/[-_](.)/g, (_, c) => c.toUpperCase());
}


export function toSnakeCase(str) {
    return str.replace(/[A-Z]/g, match => `_${match.toLowerCase()}`);
}


export function toKebabCase(str) {
    return str.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`);
}


export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}


export function formatNumber(num) {
    return new Intl.NumberFormat().format(num);
}


export function formatCoordinate(coordinate) {
    return coordinate.toFixed(6);
}


export function getStatusColor(status) {
    switch(status) {
        case 'SCHEDULED':
            return {
                bg: 'bg-blue-100',
                text: 'text-blue-800',
                border: 'border-blue-200'
            };
        case 'ONGOING':
            return {
                bg: 'bg-yellow-100',
                text: 'text-yellow-800',
                border: 'border-yellow-200'
            };
        case 'COMPLETED':
            return {
                bg: 'bg-green-100',
                text: 'text-green-800',
                border: 'border-green-200'
            };
        case 'CANCELLED':
            return {
                bg: 'bg-red-100',
                text: 'text-red-800',
                border: 'border-red-200'
            };
        default:
            return {
                bg: 'bg-gray-100',
                text: 'text-gray-800',
                border: 'border-gray-200'
            };
    }
}


export function getOutageTypeInfo(type) {
    switch(type) {
        case 'ELECTRICITY':
            return {
                bg: 'bg-amber-100',
                text: 'text-amber-800',
                border: 'border-amber-200',
                icon: 'bxs-bolt',
                color: '#f59e0b'
            };
        case 'WATER':
            return {
                bg: 'bg-sky-100',
                text: 'text-sky-800',
                border: 'border-sky-200',
                icon: 'bxs-droplet',
                color: '#0ea5e9'
            };
        case 'GAS':
            return {
                bg: 'bg-orange-100',
                text: 'text-orange-800',
                border: 'border-orange-200',
                icon: 'bxs-flame',
                color: '#f97316'
            };
        case 'INTERNET':
            return {
                bg: 'bg-purple-100',
                text: 'text-purple-800',
                border: 'border-purple-200',
                icon: 'bx-wifi',
                color: '#a855f7'
            };
        default:
            return {
                bg: 'bg-gray-100',
                text: 'text-gray-800',
                border: 'border-gray-200',
                icon: 'bx-question-mark',
                color: '#6b7280'
            };
    }
}