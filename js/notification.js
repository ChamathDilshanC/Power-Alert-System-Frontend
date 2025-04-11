/**
 * notification.js - Modern notification system for PowerAlert
 * A reusable notification module built on Toastify with enhanced features
 *
 * Usage examples:
 *
 * - Show a success notification:
 *   showNotification('Operation completed successfully', 'success');
 *
 * - Show an error with custom duration:
 *   showNotification('Something went wrong', 'error', 8000);
 *
 * - Show a warning with callback:
 *   showNotification('Your session will expire soon', 'warning', 10000,
 *     () => { console.log('Notification was closed'); });
 *
 * - Show a notification with action button:
 *   showNotification('New update available', 'info', 0, null,
 *     { text: 'Update Now', callback: () => { performUpdate(); } });
 */

// Ensure Toastify is available
if (typeof Toastify !== 'function') {
    console.error('Toastify is required for notification.js - Please include the Toastify library');
}

/**
 * Base notification settings
 */
const NOTIFICATION_DEFAULTS = {
    position: "top-right",
    duration: 5000,
    close: true,
    gravity: "top",
    stopOnFocus: true,
    className: "poweralert-notification",
    style: {
        fontFamily: "'Inter', sans-serif",
        borderRadius: "12px",
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        maxWidth: "380px"
    }
};

/**
 * Type-specific settings
 */
const NOTIFICATION_TYPES = {
    success: {
        icon: '<svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M5 12l5 5l10 -10"></path></svg>',
        style: {
            background: "linear-gradient(135deg, #34d399 0%, #10b981 100%)",
            color: "#ffffff"
        }
    },
    error: {
        icon: '<svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"></path><path d="M12 9v4"></path><path d="M12 16v.01"></path></svg>',
        style: {
            background: "linear-gradient(135deg, #f87171 0%, #ef4444 100%)",
            color: "#ffffff"
        }
    },
    warning: {
        icon: '<svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M12 9v4"></path><path d="M10.363 3.591l-8.106 13.295a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.296a1.914 1.914 0 0 0 -3.274 0z"></path><path d="M12 16h.01"></path></svg>',
        style: {
            background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
            color: "#ffffff"
        }
    },
    info: {
        icon: '<svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"></path><path d="M12 8l.01 0"></path><path d="M11 12l1 0l0 4l1 0"></path></svg>',
        style: {
            background: "linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)",
            color: "#ffffff"
        }
    },
    loading: {
        icon: '<svg xmlns="http://www.w3.org/2000/svg" class="icon spin-animation" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M12 3a9 9 0 1 0 9 9"></path></svg>',
        style: {
            background: "linear-gradient(135deg, #93c5fd 0%, #3b82f6 100%)",
            color: "#ffffff"
        }
    },
    dark: {
        icon: '',
        style: {
            background: "linear-gradient(135deg, #374151 0%, #111827 100%)",
            color: "#ffffff"
        }
    },
    light: {
        icon: '',
        style: {
            background: "#ffffff",
            color: "#374151",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)"
        }
    }
};

// Inject css for animations
const style = document.createElement('style');
style.textContent = `
    .poweralert-notification {
        animation: slide-in 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
    }
    
    .poweralert-notification.toastify-on {
        transform: none !important;
    }
    
    .poweralert-notification.toastify-off {
        animation: slide-out 0.5s cubic-bezier(0.55, 0.085, 0.68, 0.53) both !important;
    }
    
    @keyframes slide-in {
        0% {
            transform: translateX(50px);
            opacity: 0;
        }
        100% {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slide-out {
        0% {
            transform: translateX(0);
            opacity: 1;
        }
        100% {
            transform: translateX(50px);
            opacity: 0;
        }
    }
    
    .poweralert-notification .icon {
        width: 20px;
        height: 20px;
        min-width: 20px;
        margin-right: 10px;
    }
    
    .poweralert-notification .toast-close {
        color: currentColor;
        opacity: 0.6;
        cursor: pointer;
        transition: opacity 0.2s;
    }
    
    .poweralert-notification .toast-close:hover {
        opacity: 1;
    }
    
    .poweralert-notification .content-wrapper {
        flex: 1;
        overflow: hidden;
    }
    
    .poweralert-notification .notification-title {
        font-weight: 600;
        margin-bottom: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    
    .poweralert-notification .notification-message {
        font-size: 0.875rem;
    }
    
    .poweralert-notification .action-button {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        margin-left: 8px;
        cursor: pointer;
        font-size: 0.75rem;
        font-weight: 600;
        transition: background 0.2s;
    }
    
    .poweralert-notification .action-button:hover {
        background: rgba(255, 255, 255, 0.3);
    }
    
    .poweralert-notification.light-theme .action-button {
        background: rgba(0, 0, 0, 0.1);
        color: #374151;
    }
    
    .poweralert-notification.light-theme .action-button:hover {
        background: rgba(0, 0, 0, 0.2);
    }
    
    .spin-animation {
        animation: spin 1.5s linear infinite;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    /* Responsive adjustments */
    @media (max-width: 480px) {
        .poweralert-notification {
            max-width: 90vw !important;
        }
    }
`;
document.head.appendChild(style);

/**
 * Shows a notification with customizable options
 *
 * @param {string} message - The notification message
 * @param {string} type - Type of notification: 'success', 'error', 'warning', 'info', 'loading', 'dark', 'light'
 * @param {number} duration - Duration in ms (0 for persistent notification)
 * @param {Function} callback - Function to call when notification is dismissed
 * @param {Object} action - Optional action button {text: string, callback: Function}
 * @param {string} title - Optional title for the notification
 * @return {Object} - The Toastify instance (can be used to dismiss programmatically)
 */
function showNotification(message, type = 'info', duration = null, callback = null, action = null, title = null) {
    // Validate parameters
    if (!message) {
        console.error('Notification message is required');
        return null;
    }

    if (!NOTIFICATION_TYPES[type]) {
        console.warn(`Unknown notification type: ${type}, falling back to info`);
        type = 'info';
    }

    // Merge default settings with type-specific settings
    const settings = {...NOTIFICATION_DEFAULTS};

    // Set duration if provided
    if (duration !== null) {
        settings.duration = duration;
    }

    // Apply type-specific styles
    const typeConfig = NOTIFICATION_TYPES[type];
    settings.style = {...settings.style, ...typeConfig.style};

    if (type === 'light') {
        settings.className += ' light-theme';
    }

    // Create the notification content with icon and message
    const iconHtml = typeConfig.icon;

    // Create the HTML structure for the notification
    let contentHtml = `
        <div style="display: flex; align-items: flex-start;">
            ${iconHtml}
            <div class="content-wrapper">
    `;

    // Add title if provided
    if (title) {
        contentHtml += `<div class="notification-title">${title}</div>`;
    }

    // Add the main message
    contentHtml += `<div class="notification-message">${message}</div>`;
    contentHtml += `</div>`;

    // Add action button if provided
    if (action && action.text) {
        contentHtml += `
            <button class="action-button">
                ${action.text}
            </button>
        `;
    }

    contentHtml += `</div>`;

    // Set the HTML content
    settings.escapeMarkup = false;
    settings.text = contentHtml;

    // Set the callback
    if (callback) {
        settings.callback = callback;
    }

    // Create the notification
    const toast = Toastify(settings);
    toast.showToast();

    // Attach action button event handler if needed
    if (action && action.callback) {
        const actionButton = toast.toastElement.querySelector('.action-button');
        if (actionButton) {
            actionButton.addEventListener('click', (e) => {
                e.stopPropagation();
                action.callback();
                toast.hideToast();
            });
        }
    }

    return toast;
}

/**
 * Show a success notification
 */
function showSuccess(message, duration = 5000, callback = null, action = null, title = null) {
    return showNotification(message, 'success', duration, callback, action, title);
}

/**
 * Show an error notification
 */
function showError(message, duration = 7000, callback = null, action = null, title = null) {
    return showNotification(message, 'error', duration, callback, action, title);
}

/**
 * Show a warning notification
 */
function showWarning(message, duration = 6000, callback = null, action = null, title = null) {
    return showNotification(message, 'warning', duration, callback, action, title);
}

/**
 * Show an info notification
 */
function showInfo(message, duration = 5000, callback = null, action = null, title = null) {
    return showNotification(message, 'info', duration, callback, action, title);
}

/**
 * Show a loading notification
 * @returns {Object} - The toast instance that should be dismissed when loading is complete
 */
function showLoading(message = 'Loading, please wait...', duration = 0, callback = null, title = null) {
    return showNotification(message, 'loading', duration, callback, null, title);
}

/**
 * Show a dark notification
 */
function showDark(message, duration = 5000, callback = null, action = null, title = null) {
    return showNotification(message, 'dark', duration, callback, action, title);
}

/**
 * Show a light notification
 */
function showLight(message, duration = 5000, callback = null, action = null, title = null) {
    return showNotification(message, 'light', duration, callback, action, title);
}

/**
 * Dismiss a notification programmatically
 */
function dismissNotification(toast) {
    if (toast && typeof toast.hideToast === 'function') {
        toast.hideToast();
    }
}

/**
 * Update loading notification to success/error when operation completes
 * @param {Object} loadingToast - The toast object returned from showLoading
 * @param {boolean} success - Whether the operation was successful
 * @param {string} message - The success/error message
 */
function completeLoading(loadingToast, success, message) {
    if (loadingToast && typeof loadingToast.hideToast === 'function') {
        loadingToast.hideToast();

        // Show appropriate follow-up notification
        if (success) {
            showSuccess(message);
        } else {
            showError(message);
        }
    }
}

// Export all functions
export {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
    showDark,
    showLight,
    dismissNotification,
    completeLoading
};