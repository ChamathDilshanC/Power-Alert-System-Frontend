/**
 * uiManager.js - UI management functions
 *
 * This module handles common UI operations like showing/hiding modals,
 * creating dialogs, updating UI elements, and handling responsive behaviors.
 */

import { getCurrentUser } from '../auth/authHelper.js';

/**
 * Initialize UI elements and event listeners
 */
export function initUI() {
    setupMobileMenu();
    setupUserInfo();
    setupModals();
    setupDropdowns();
    setupTabs();
    setupAccordions();
    setupScrollToTop();
}

/**
 * Set up mobile menu functionality
 */
function setupMobileMenu() {
    const mobileToggleBtn = document.getElementById('mobile-toggle-btn');
    const sidebar = document.getElementById('sidebar-main');

    if (mobileToggleBtn && sidebar) {
        mobileToggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('mobile-open');
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', function(event) {
            if (window.innerWidth <= 768 &&
                !sidebar.contains(event.target) &&
                !mobileToggleBtn.contains(event.target) &&
                sidebar.classList.contains('mobile-open')) {
                sidebar.classList.remove('mobile-open');
            }
        });
    }
}

/**
 * Set up user info in the UI
 */
function setupUserInfo() {
    const user = getCurrentUser();

    if (!user) {
        return;
    }

    // Update sidebar user information
    const avatarCircle = document.getElementById('avatar-circle');
    const avatarName = document.getElementById('avatar-name');
    const avatarRole = document.getElementById('avatar-role');

    if (avatarCircle) {
        avatarCircle.textContent = getInitials(user.username);
    }

    if (avatarName) {
        avatarName.textContent = user.username;
    }

    if (avatarRole) {
        avatarRole.textContent = formatRole(user.role);
    }

    // Update top navbar user information
    const navbarUsername = document.querySelector('.top-navbar .hidden.md\\:flex span');
    if (navbarUsername) {
        navbarUsername.textContent = user.username;
    }
}

/**
 * Get user initials from username
 * @param {string} username - Username
 * @returns {string} Initials
 */
function getInitials(username) {
    if (!username) return '?';

    const parts = username.split(' ');
    if (parts.length === 1) {
        return username.charAt(0).toUpperCase();
    }

    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Format role for display
 * @param {string} role - User role
 * @returns {string} Formatted role
 */
function formatRole(role) {
    if (!role) return 'User';

    return role
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Set up modal functionality
 */
function setupModals() {
    // Find all modal triggers
    const modalTriggers = document.querySelectorAll('[data-modal-target]');

    modalTriggers.forEach(trigger => {
        const modalId = trigger.getAttribute('data-modal-target');
        const modal = document.getElementById(modalId);

        if (modal) {
            // Open modal on trigger click
            trigger.addEventListener('click', () => {
                showModal(modalId);
            });

            // Setup close buttons inside the modal
            const closeButtons = modal.querySelectorAll('[data-close-modal]');
            closeButtons.forEach(button => {
                button.addEventListener('click', () => {
                    hideModal(modalId);
                });
            });

            // Close on click outside
            modal.addEventListener('click', (event) => {
                if (event.target === modal) {
                    hideModal(modalId);
                }
            });
        }
    });
}

/**
 * Show a modal by ID
 * @param {string} modalId - Modal element ID
 */
export function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');

        // Add animation classes
        setTimeout(() => {
            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.classList.add('modal-show');
            }
        }, 10);

        // Set focus on first input
        setTimeout(() => {
            const firstInput = modal.querySelector('input, button:not([data-close-modal])');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    }
}

/**
 * Hide a modal by ID
 * @param {string} modalId - Modal element ID
 */
export function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.classList.remove('modal-show');

            // Wait for animation to complete
            setTimeout(() => {
                modal.classList.add('hidden');
                document.body.classList.remove('overflow-hidden');
            }, 300);
        } else {
            modal.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
        }
    }
}

/**
 * Create and show a confirmation dialog
 * @param {Object} options - Dialog options
 * @param {string} options.title - Dialog title
 * @param {string} options.message - Dialog message
 * @param {string} options.confirmText - Confirm button text
 * @param {string} options.cancelText - Cancel button text
 * @param {Function} options.onConfirm - Confirm callback
 * @param {Function} options.onCancel - Cancel callback
 * @param {string} options.type - Dialog type (info, warning, error, success)
 * @returns {HTMLElement} The dialog element
 */
export function showConfirmDialog({
                                      title = 'Confirm Action',
                                      message = 'Are you sure you want to proceed?',
                                      confirmText = 'Confirm',
                                      cancelText = 'Cancel',
                                      onConfirm = () => {},
                                      onCancel = () => {},
                                      type = 'info'
                                  }) {
    // Remove any existing dialog
    const existingDialog = document.getElementById('confirm-dialog');
    if (existingDialog) {
        existingDialog.remove();
    }

    // Create dialog element
    const dialog = document.createElement('div');
    dialog.id = 'confirm-dialog';
    dialog.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';

    // Get icon and color based on type
    let iconContainer, icon, confirmBtnClass;

    switch(type) {
        case 'warning':
            iconContainer = 'bg-yellow-100 text-yellow-600';
            icon = 'bx-error-circle';
            confirmBtnClass = 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500';
            break;
        case 'error':
            iconContainer = 'bg-red-100 text-red-600';
            icon = 'bx-x-circle';
            confirmBtnClass = 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
            break;
        case 'success':
            iconContainer = 'bg-green-100 text-green-600';
            icon = 'bx-check-circle';
            confirmBtnClass = 'bg-green-600 hover:bg-green-700 focus:ring-green-500';
            break;
        default: // info
            iconContainer = 'bg-blue-100 text-blue-600';
            icon = 'bx-info-circle';
            confirmBtnClass = 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
    }

    // Set dialog content
    dialog.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 modal-content scale-95 opacity-0 transition-all duration-300">
            <div class="text-center mb-4">
                <div class="inline-flex items-center justify-center w-12 h-12 rounded-full ${iconContainer} mb-4">
                    <i class='bx ${icon} text-2xl'></i>
                </div>
                <h3 class="text-lg font-medium text-gray-900">${title}</h3>
                <p class="mt-2 text-sm text-gray-500">${message}</p>
            </div>
            <div class="flex justify-center gap-3 mt-4">
                <button id="dialog-cancel" class="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                    ${cancelText}
                </button>
                <button id="dialog-confirm" class="px-4 py-2 ${confirmBtnClass} text-white rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2">
                    ${confirmText}
                </button>
            </div>
        </div>
    `;

    // Add to document body
    document.body.appendChild(dialog);

    // Add animation class
    setTimeout(() => {
        const modalContent = dialog.querySelector('.modal-content');
        if (modalContent) {
            modalContent.classList.remove('scale-95', 'opacity-0');
            modalContent.classList.add('scale-100', 'opacity-100');
        }
    }, 10);

    // Add event listeners
    document.getElementById('dialog-confirm').addEventListener('click', () => {
        closeDialog(dialog);
        onConfirm();
    });

    document.getElementById('dialog-cancel').addEventListener('click', () => {
        closeDialog(dialog);
        onCancel();
    });

    // Close on outside click
    dialog.addEventListener('click', (event) => {
        if (event.target === dialog) {
            closeDialog(dialog);
            onCancel();
        }
    });

    // Close on escape key
    const handleEscape = (event) => {
        if (event.key === 'Escape') {
            closeDialog(dialog);
            onCancel();
            document.removeEventListener('keydown', handleEscape);
        }
    };

    document.addEventListener('keydown', handleEscape);

    return dialog;
}

/**
 * Close a dialog with animation
 * @param {HTMLElement} dialog - Dialog element
 */
function closeDialog(dialog) {
    const modalContent = dialog.querySelector('.modal-content');
    if (modalContent) {
        modalContent.classList.remove('scale-100', 'opacity-100');
        modalContent.classList.add('scale-95', 'opacity-0');

        // Remove after animation
        setTimeout(() => {
            dialog.remove();
        }, 300);
    } else {
        dialog.remove();
    }
}

/**
 * Set up dropdown menu functionality
 */
function setupDropdowns() {
    const dropdownTriggers = document.querySelectorAll('[data-dropdown-toggle]');

    dropdownTriggers.forEach(trigger => {
        const dropdownId = trigger.getAttribute('data-dropdown-toggle');
        const dropdownMenu = document.getElementById(dropdownId);

        if (dropdownMenu) {
            // Toggle dropdown on click
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdownMenu.classList.toggle('hidden');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', () => {
                if (!dropdownMenu.classList.contains('hidden')) {
                    dropdownMenu.classList.add('hidden');
                }
            });

            // Prevent dropdown from closing when clicking inside it
            dropdownMenu.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    });
}

/**
 * Set up tab functionality
 */
function setupTabs() {
    const tabGroups = document.querySelectorAll('[data-tab-group]');

    tabGroups.forEach(group => {
        const groupName = group.getAttribute('data-tab-group');
        const tabs = document.querySelectorAll(`[data-tab="${groupName}"]`);
        const panels = document.querySelectorAll(`[data-tab-panel="${groupName}"]`);

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.getAttribute('data-tab-id');

                // Update active tab
                tabs.forEach(t => {
                    if (t.getAttribute('data-tab-id') === tabId) {
                        t.classList.add('tab-active');
                        t.setAttribute('aria-selected', 'true');
                    } else {
                        t.classList.remove('tab-active');
                        t.setAttribute('aria-selected', 'false');
                    }
                });

                // Show active panel
                panels.forEach(panel => {
                    if (panel.getAttribute('data-tab-panel-id') === tabId) {
                        panel.classList.remove('hidden');
                    } else {
                        panel.classList.add('hidden');
                    }
                });
            });
        });
    });
}

/**
 * Set up accordion functionality
 */
function setupAccordions() {
    const accordionHeaders = document.querySelectorAll('[data-accordion-header]');

    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const accordionId = header.getAttribute('data-accordion-header');
            const content = document.querySelector(`[data-accordion-content="${accordionId}"]`);
            const icon = header.querySelector('.accordion-icon');

            if (content) {
                content.classList.toggle('hidden');

                if (icon) {
                    icon.classList.toggle('rotate-180');
                }
            }
        });
    });
}

/**
 * Set up scroll-to-top button
 */
function setupScrollToTop() {
    const scrollButton = document.getElementById('scroll-to-top');

    if (scrollButton) {
        // Show/hide button based on scroll position
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                scrollButton.classList.remove('hidden');
            } else {
                scrollButton.classList.add('hidden');
            }
        });

        // Scroll to top on click
        scrollButton.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

/**
 * Update page title and breadcrumb
 * @param {string} pageTitle - Page title
 * @param {Array} breadcrumbItems - Breadcrumb items (objects with label and url)
 */
export function updatePageHeader(pageTitle, breadcrumbItems = []) {
    // Update document title
    document.title = `${pageTitle} - PowerAlert`;

    // Update page title in breadcrumb
    const pageTitleElement = document.getElementById('page-title');
    if (pageTitleElement) {
        pageTitleElement.textContent = pageTitle;
    }

    // Update breadcrumb
    const breadcrumbContainer = document.querySelector('.breadcrumb');
    if (breadcrumbContainer && breadcrumbItems.length > 0) {
        // Clear existing items except for Home
        breadcrumbContainer.innerHTML = `
            <span class="breadcrumb-item">Home</span>
            <span class="breadcrumb-separator">/</span>
        `;

        // Add new items
        breadcrumbItems.forEach((item, index) => {
            const isLast = index === breadcrumbItems.length - 1;

            if (isLast) {
                breadcrumbContainer.innerHTML += `
                    <span class="breadcrumb-item active">${item.label}</span>
                `;
            } else {
                breadcrumbContainer.innerHTML += `
                    <a href="${item.url}" class="breadcrumb-item">${item.label}</a>
                    <span class="breadcrumb-separator">/</span>
                `;
            }
        });
    }
}

/**
 * Show a loading spinner in a container
 * @param {string} containerId - Container element ID
 * @param {string} message - Loading message
 */
export function showLoading(containerId, message = 'Loading...') {
    const container = document.getElementById(containerId);

    if (container) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12">
                <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500 mb-4"></div>
                <p class="text-gray-500">${message}</p>
            </div>
        `;
    }
}

/**
 * Show an empty state in a container
 * @param {string} containerId - Container element ID
 * @param {string} message - Empty state message
 * @param {string} icon - Icon class
 * @param {Function} actionCallback - Action button callback
 * @param {string} actionText - Action button text
 */
export function showEmptyState(containerId, {
    message = 'No data available',
    icon = 'bx-package',
    actionCallback = null,
    actionText = 'Add New'
}) {
    const container = document.getElementById(containerId);

    if (container) {
        let actionButton = '';

        if (actionCallback) {
            actionButton = `
                <button id="empty-state-action" class="mt-4 inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors">
                    <i class='bx bx-plus mr-2'></i>
                    ${actionText}
                </button>
            `;
        }

        container.innerHTML = `
            <div class="py-12 text-center">
                <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-gray-400 mb-4">
                    <i class='bx ${icon} text-3xl'></i>
                </div>
                <h3 class="text-lg font-medium text-gray-900">No data found</h3>
                <p class="mt-2 text-sm text-gray-500">${message}</p>
                ${actionButton}
            </div>
        `;

        // Add action button event listener
        const actionBtn = document.getElementById('empty-state-action');
        if (actionBtn && actionCallback) {
            actionBtn.addEventListener('click', actionCallback);
        }
    }
}

/**
 * Show an error state in a container
 * @param {string} containerId - Container element ID
 * @param {string} message - Error message
 * @param {string} detail - Error detail
 * @param {Function} retryCallback - Retry button callback
 */
export function showErrorState(containerId, {
    message = 'An error occurred',
    detail = 'Please try again later',
    retryCallback = null
}) {
    const container = document.getElementById(containerId);

    if (container) {
        let retryButton = '';

        if (retryCallback) {
            retryButton = `
                <button id="error-retry-btn" class="mt-4 inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors">
                    <i class='bx bx-refresh mr-2'></i>
                    Try Again
                </button>
            `;
        }

        container.innerHTML = `
            <div class="py-12 text-center">
                <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mb-4">
                    <i class='bx bx-error-circle text-3xl'></i>
                </div>
                <h3 class="text-lg font-medium text-gray-900">${message}</h3>
                <p class="mt-2 text-sm text-gray-500">${detail}</p>
                ${retryButton}
            </div>
        `;

        // Add retry button event listener
        const retryBtn = document.getElementById('error-retry-btn');
        if (retryBtn && retryCallback) {
            retryBtn.addEventListener('click', retryCallback);
        }
    }
}

// Initialize UI when DOM is loaded
document.addEventListener('DOMContentLoaded', initUI);