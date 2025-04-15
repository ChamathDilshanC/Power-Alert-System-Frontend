if (typeof Toastify !== 'function') {
    console.error('Toastify is required for notification.js - Please include the Toastify library');
}


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


const NOTIFICATION_TYPES = {
    success: {
        icon: '<i class="bx bx-check-circle icon-lg"></i>',
        style: {
            background: "linear-gradient(135deg, #34d399 0%, #10b981 100%)",
            color: "#ffffff"
        }
    },
    error: {
        icon: '<i class="bx bx-error-circle icon-lg"></i>',
        style: {
            background: "linear-gradient(135deg, #f87171 0%, #ef4444 100%)",
            color: "#ffffff"
        }
    },
    warning: {
        icon: '<i class="bx bx-error icon-lg"></i>',
        style: {
            background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
            color: "#ffffff"
        }
    },
    info: {
        icon: '<i class="bx bx-info-circle icon-lg"></i>',
        style: {
            background: "linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)",
            color: "#ffffff"
        }
    },
    loading: {
        icon: '<i class="bx bx-loader-alt icon-lg spin-animation"></i>',
        style: {
            background: "linear-gradient(135deg, #93c5fd 0%, #3b82f6 100%)",
            color: "#ffffff"
        }
    },
    dark: {
        icon: '<i class="bx bx-moon icon-lg"></i>',
        style: {
            background: "linear-gradient(135deg, #374151 0%, #111827 100%)",
            color: "#ffffff"
        }
    },
    light: {
        icon: '<i class="bx bx-sun icon-lg"></i>',
        style: {
            background: "#ffffff",
            color: "#374151",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)"
        }
    }
};

// Inject css for animations
function injectStyles() {
    if (document.getElementById('poweralert-notification-styles')) {
        return;
    }

    const style = document.createElement('style');
    style.id = 'poweralert-notification-styles';
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

        .poweralert-notification .icon-lg {
            font-size: 24px;
            margin-right: 12px;
            min-width: 24px;
            height: 24px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
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
            padding: 6px 12px;
            border-radius: 6px;
            margin-left: 12px;
            cursor: pointer;
            font-size: 0.75rem;
            font-weight: 600;
            transition: background 0.2s;
            display: inline-flex;
            align-items: center;
        }

        .poweralert-notification .action-button i {
            margin-right: 4px;
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
}

// Initialize styles when in browser environment
if (typeof document !== 'undefined') {
    injectStyles();
}


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
        <div style="display: flex; align-items: flex-start; width: 100%;">
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
        const actionIcon = action.icon ? `<i class="bx ${action.icon}"></i>` : '';
        contentHtml += `
            <button class="action-button">
                ${actionIcon}${action.text}
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


function showSuccess(message, duration = 5000, callback = null, action = null, title = null) {
    return showNotification(message, 'success', duration, callback, action, title);
}

function showError(message, duration = 7000, callback = null, action = null, title = null) {
    return showNotification(message, 'error', duration, callback, action, title);
}


function showWarning(message, duration = 6000, callback = null, action = null, title = null) {
    return showNotification(message, 'warning', duration, callback, action, title);
}


function showInfo(message, duration = 5000, callback = null, action = null, title = null) {
    return showNotification(message, 'info', duration, callback, action, title);
}


function showLoading(message = 'Loading, please wait...', duration = 0, callback = null, title = null) {
    return showNotification(message, 'loading', duration, callback, null, title);
}


function showDark(message, duration = 5000, callback = null, action = null, title = null) {
    return showNotification(message, 'dark', duration, callback, action, title);
}


function showLight(message, duration = 5000, callback = null, action = null, title = null) {
    return showNotification(message, 'light', duration, callback, action, title);
}


function dismissNotification(toast) {
    if (toast && typeof toast.hideToast === 'function') {
        toast.hideToast();
    }
}


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