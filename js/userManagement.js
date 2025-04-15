/**
 * userManagement.js - Handles the user management functionality
 * This script manages the user interface for the user management page,
 * including loading users, filtering, CRUD operations and pagination.
 */

// Set base configuration if not already defined globally
if (typeof CONFIG === 'undefined') {
    const CONFIG = {
        API_BASE_URL: 'http://localhost:8080',
        API_VERSION: 'v1',
        API_TIMEOUT: 30000
    };
    window.CONFIG = CONFIG;
}

// State variables
let users = [];
let filteredUsers = [];
let currentPage = 1;
const pageSize = 10;
let editingUserId = null;
let confirmationCallback = null;

// DOM ready
$(document).ready(function() {
    // Initialize the UI
    initUserManagement();

    // Set up event listeners
    setupEventListeners();
});

/**
 * Initialize the user management interface
 */
function initUserManagement() {
    // Load users
    loadUsers();

    // Set up UI components
    setupModals();
}

/**
 * Set up event listeners for the user interface
 */
function setupEventListeners() {
    // Search input
    $('#search-users').on('input', function() {
        applyFilters();
    });

    // Role and status filters
    $('#filter-role, #filter-status').on('change', function() {
        applyFilters();
    });

    // Reset filters button
    $('#reset-filters').on('click', function() {
        resetFilters();
    });

    // Add user button
    $('#add-user-btn').on('click', function() {
        showAddUserModal();
    });

    // Form submission
    $('#user-form').on('submit', function(e) {
        e.preventDefault();
        saveUser();
    });

    // Reset password form submission
    $('#reset-password-form').on('submit', function(e) {
        e.preventDefault();
        resetUserPassword();
    });

    // Username and email validation
    $('#username').on('blur', function() {
        validateUsername($(this).val());
    });

    $('#email').on('blur', function() {
        validateEmail($(this).val());
    });
    $('#phone-number').on('blur', function() {
        validatePhoneNumber($(this).val());
    });

    // Role selection change (for utility provider fields)
    $('#role').on('change', function() {
        toggleUtilityProviderFields();
    });

    // Toggle password visibility
    $('#toggle-password, #toggle-new-password').on('click', function() {
        const passwordField = $(this).closest('div').find('input');
        const type = passwordField.attr('type') === 'password' ? 'text' : 'password';
        passwordField.attr('type', type);

        // Toggle icon
        const icon = $(this).find('i');
        if (type === 'text') {
            icon.removeClass('bx-show').addClass('bx-hide');
        } else {
            icon.removeClass('bx-hide').addClass('bx-show');
        }
    });

    // Modal close buttons
    $('#close-modal, #cancel-form').on('click', function() {
        hideUserModal();
    });

    $('#close-view-modal').on('click', function() {
        $('#view-user-modal').addClass('hidden');
    });

    $('#close-reset-modal, #cancel-reset').on('click', function() {
        $('#reset-password-modal').addClass('hidden');
    });

    $('#cancel-confirm').on('click', function() {
        $('#confirm-modal').addClass('hidden');
    });

    // Confirm action button
    $('#confirm-action').on('click', function() {
        if (confirmationCallback) {
            confirmationCallback();
            $('#confirm-modal').addClass('hidden');
        }
    });

    // Page navigation
    $('#prev-page').on('click', function() {
        if (currentPage > 1) {
            navigateToPage(currentPage - 1);
        }
    });

    $('#next-page').on('click', function() {
        const totalPages = Math.ceil(filteredUsers.length / pageSize);
        if (currentPage < totalPages) {
            navigateToPage(currentPage + 1);
        }
    });
}

/**
 * Load users from the API
 */
function loadUsers() {
    // Show loading indicator
    $('#loading-row').show();
    $('#empty-state').hide();

    // Call the API
    $.ajax({
        url: `${CONFIG.API_BASE_URL}/api/admin/users`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        success: function(response) {
            // Process the response
            if (response && response.code === 200 && response.data) {
                console.log("Original API response:", response.data);

                users = response.data.map(user => {
                    // Debug the user object received from the API
                    console.log(`User ${user.username} original:`, user);

                    // Check if the API is using a different property name
                    // It might be using 'active' or 'is_active' instead of 'isActive'
                    const activeStatus = user.isActive || user.active || user.is_active;

                    console.log(`User ${user.username}: isActive=${user.isActive}, active=${user.active}, is_active=${user.is_active}`);

                    // Ensure isActive is a boolean with proper default
                    const isActive = typeof activeStatus === 'boolean' ? activeStatus :
                        activeStatus === 1 || activeStatus === '1' ||
                        activeStatus === true || activeStatus === 'true' ||
                        activeStatus === 'Active';

                    console.log(`User ${user.username}: Active status determined: ${isActive}`);

                    return {
                        ...user,
                        isActive: isActive
                    };
                });

                // Apply filters and display users
                applyFilters();
            } else {
                // Show empty state
                showEmptyState("No users found", "There are no users in the system.");
            }
        },
        error: function(xhr, status, error) {
            console.error('Error loading users:', error);
            showError('Failed to load users. Please try again.');
            showEmptyState("Error loading users", "Could not load users from the server.");
        },
        complete: function() {
            // Hide loading indicator
            $('#loading-row').hide();
        }
    });
}

/**
 * Apply filters to the user list
 */
function applyFilters() {
    const searchText = $('#search-users').val().toLowerCase();
    const roleFilter = $('#filter-role').val();
    const statusFilter = $('#filter-status').val();

    // Filter users
    filteredUsers = users.filter(user => {
        // Search text filter
        const matchesSearch =
            !searchText ||
            user.username?.toLowerCase().includes(searchText) ||
            user.email?.toLowerCase().includes(searchText) ||
            user.phoneNumber?.toLowerCase().includes(searchText);

        // Role filter
        const matchesRole = !roleFilter || user.role === roleFilter;

        // Status filter
        const matchesStatus = statusFilter === '' ||
            (statusFilter === 'true' && user.isActive) ||
            (statusFilter === 'false' && !user.isActive);

        return matchesSearch && matchesRole && matchesStatus;
    });

    // Reset to first page
    currentPage = 1;

    // Render the user table
    renderUserTable();
}

/**
 * Reset all filters
 */
function resetFilters() {
    $('#search-users').val('');
    $('#filter-role').val('');
    $('#filter-status').val('');

    applyFilters();
}

/**
 * Render the user table with current filtered users
 */
function renderUserTable() {
    const tableBody = $('#users-table-body');

    // Clear existing table content (except loading row)
    tableBody.find('tr:not(#loading-row)').remove();

    // Check if we have users to display
    if (filteredUsers.length === 0) {
        tableBody.append(`
            <tr>
                <td colspan="7" class="px-6 py-4 text-center">
                    <div class="py-8">
                        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-gray-400 mb-4">
                            <i class='bx bx-user-x text-3xl'></i>
                        </div>
                        <h3 class="text-lg font-medium text-gray-900">No users found</h3>
                        <p class="mt-2 text-sm text-gray-500">No users match your search criteria.</p>
                    </div>
                </td>
            </tr>
        `);

        // Hide pagination
        $('#pagination-container').hide();
        return;
    }

    // Show pagination
    $('#pagination-container').show();

    // Calculate pagination
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredUsers.length);
    const pageUsers = filteredUsers.slice(startIndex, endIndex);

    function renderStatusBadge(user) {
        if (user.isActive) {
            return '<span class="status-badge active">Active</span>';
        } else {
            return '<span class="status-badge inactive">Inactive</span>';
        }
    }

    // Render each user
    pageUsers.forEach(user => {
        const row = $(`
            <tr>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
                            <span class="font-medium">${getInitials(user.username)}</span>
                        </div>
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">${user.username}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${user.email}</div>
                    <div class="text-sm text-gray-500">${user.phoneNumber || 'N/A'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="role-badge ${getRoleBadgeClass(user.role)}">
                        ${formatRole(user.role)}
                    </span>
                </td>

                // Replace this section in renderUserTable()
                    <td class="px-6 py-4 whitespace-nowrap">
                        ${renderStatusBadge(user)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${formatDate(user.createdAt)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div class="flex space-x-2 justify-end">
                        <button class="view-user-btn text-blue-600 hover:text-blue-900" data-user-id="${user.id}">
                            <i class='bx bx-show'></i>
                        </button>
                        <button class="edit-user-btn text-indigo-600 hover:text-indigo-900" data-user-id="${user.id}">
                            <i class='bx bx-edit'></i>
                        </button>
                        <button class="delete-user-btn text-red-600 hover:text-red-900" data-user-id="${user.id}">
                            <i class='bx bx-trash'></i>
                        </button>
                    </div>
                </td>
            </tr>
        `);

        // Add event listeners
        row.find('.view-user-btn').on('click', function() {
            showUserDetails(user.id);
        });

        row.find('.edit-user-btn').on('click', function() {
            showEditUserModal(user.id);
        });

        row.find('.delete-user-btn').on('click', function() {
            showDeleteConfirmation(user.id);
        });

        tableBody.append(row);
    });

    // Update pagination
    updatePagination();
}

/**
 * Update pagination controls
 */
function updatePagination() {
    const totalItems = filteredUsers.length;
    const totalPages = Math.ceil(totalItems / pageSize);

    // Update item count text
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    $('#page-start').text(startItem);
    $('#page-end').text(endItem);
    $('#total-items').text(totalItems);

    // Enable/disable previous and next buttons
    $('#prev-page').prop('disabled', currentPage === 1);
    $('#next-page').prop('disabled', currentPage === totalPages || totalPages === 0);

    // Generate page numbers
    generatePageNumbers(currentPage, totalPages);
}

/**
 * Generate page number buttons
 */
function generatePageNumbers(currentPage, totalPages) {
    const pageNumbers = $('#page-numbers');
    pageNumbers.empty();

    if (totalPages <= 1) return;

    // Determine range of pages to show
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);

    // Adjust if we're near the end
    if (endPage - startPage < 4 && startPage > 1) {
        startPage = Math.max(1, endPage - 4);
    }

    // Always show first page
    if (startPage > 1) {
        pageNumbers.append(`
            <button class="page-number relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50" data-page="1">1</button>
        `);

        // Add ellipsis if needed
        if (startPage > 2) {
            pageNumbers.append(`
                <span class="page-ellipsis relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700">...</span>
            `);
        }
    }

    // Add page numbers
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;

        pageNumbers.append(`
            <button class="page-number relative inline-flex items-center px-4 py-2 border ${isActive ? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'} text-sm font-medium rounded-md" data-page="${i}" ${isActive ? 'disabled' : ''}>${i}</button>
        `);
    }

    // Add last page if needed
    if (endPage < totalPages) {
        // Add ellipsis if needed
        if (endPage < totalPages - 1) {
            pageNumbers.append(`
                <span class="page-ellipsis relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700">...</span>
            `);
        }

        pageNumbers.append(`
            <button class="page-number relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50" data-page="${totalPages}">${totalPages}</button>
        `);
    }

    // Add event listeners to page numbers
    $('.page-number').on('click', function() {
        const page = parseInt($(this).data('page'));
        navigateToPage(page);
    });
}

/**
 * Navigate to a specific page
 */
function navigateToPage(page) {
    currentPage = page;
    renderUserTable();
}

/**
 * Show add user modal
 */
function showAddUserModal() {
    // Reset form
    $('#user-form')[0].reset();
    $('#user-id').val('');
    editingUserId = null;

    // Show password fields
    $('#password-container, #password-field').show();

    // Add this line to ensure password is required for new users
    $('#password').attr('required', 'required');

    // Reset error messages
    $('#username-error, #email-error').addClass('hidden');

    // Set modal title
    $('#modal-title').text('Add New User');

    // Default values
    $('#is-active').prop('checked', true);
    $('#preferred-language').val('en');
    $('#role').val('USER');

    // Check if utility provider fields should be shown
    toggleUtilityProviderFields();

    // Show modal
    $('#user-modal').removeClass('hidden');
}

/**
 * Show edit user modal
 */
function showEditUserModal(userId) {
    // Get user data
    const user = users.find(u => u.id === userId);
    if (!user) return;

    // Reset form and set user ID
    $('#user-form')[0].reset();
    $('#user-id').val(userId);
    editingUserId = userId;

    // Hide password fields and remove required attribute
    $('#password-container, #password-field').hide();
    $('#password').removeAttr('required');

    // Reset error messages
    $('#username-error, #email-error').addClass('hidden');

    // Handle phone number - remove the +94 prefix if present
    let phoneNumberWithoutPrefix = user.phoneNumber;
    if (user.phoneNumber && user.phoneNumber.startsWith('+94')) {
        phoneNumberWithoutPrefix = user.phoneNumber.substring(3);
    }

    // Fill form with user data
    $('#username').val(user.username);
    $('#email').val(user.email);
    $('#phone-number').val(phoneNumberWithoutPrefix);
    $('#role').val(user.role);
    $('#preferred-language').val(user.preferredLanguage || 'en');
    $('#is-active').prop('checked', user.isActive);

    // Set modal title
    $('#modal-title').text('Edit User');

    // Set utility provider fields if needed
    toggleUtilityProviderFields();

    // If user is utility provider, load and fill provider data
    if (user.role === 'UTILITY_PROVIDER') {
        loadProviderDetailsForEdit(userId);
    }

    // Show modal
    $('#user-modal').removeClass('hidden');
}

/**
 * Load provider details for editing
 */
function loadProviderDetailsForEdit(userId) {
    $.ajax({
        url: `${CONFIG.API_BASE_URL}/api/admin/users/${userId}/provider`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        success: function(response) {
            if (response && response.code === 200) {
                showSuccess(`User ${newStatus ? 'activated' : 'deactivated'} successfully`);
                loadUsers();
                $('#view-user-modal').addClass('hidden');
            } else {
                showError(response?.message || 'Failed to update user status');
            }
        },
        error: function(xhr, status, error) {
            console.error('Error toggling user status:', error);
            showError('Failed to update user status. Please try again.');
        }
    });
}

/**
 * Validate username to check if it's available
 */
function validateUsername(username) {
    // Skip if editing and username hasn't changed
    if (editingUserId) {
        const currentUser = users.find(u => u.id === editingUserId);
        if (currentUser && currentUser.username === username) {
            $('#username-error').addClass('hidden');
            return;
        }
    }

    // Check username availability
    $.ajax({
        url: `${CONFIG.API_BASE_URL}/api/public/check-username?username=${encodeURIComponent(username)}`,
        method: 'GET',
        success: function(response) {
            if (response && response.exists) {
                $('#username-error').removeClass('hidden');
            } else {
                $('#username-error').addClass('hidden');
            }
        },
        error: function(xhr, status, error) {
            console.error('Error checking username:', error);
            $('#username-error').addClass('hidden');
        }
    });
}

/**
 * Validate email to check if it's available
 */
function validateEmail(email) {
    // Skip if editing and email hasn't changed
    if (editingUserId) {
        const currentUser = users.find(u => u.id === editingUserId);
        if (currentUser && currentUser.email === email) {
            $('#email-error').addClass('hidden');
            return;
        }
    }

    // Check email availability
    $.ajax({
        url: `${CONFIG.API_BASE_URL}/api/public/check-email?email=${encodeURIComponent(email)}`,
        method: 'GET',
        success: function(response) {
            if (response && response.exists) {
                $('#email-error').removeClass('hidden');
            } else {
                $('#email-error').addClass('hidden');
            }
        },
        error: function(xhr, status, error) {
            console.error('Error checking email:', error);
            $('#email-error').addClass('hidden');
        }
    });
}

function validatePhoneNumber(phoneNumber) {
    // Skip if editing and phone number hasn't changed
    if (editingUserId) {
        const currentUser = users.find(u => u.id === editingUserId);
        // Format the phone numbers consistently for comparison
        const formattedCurrentPhone = currentUser.phoneNumber;
        const formattedNewPhone = phoneNumber.startsWith('+94') ? phoneNumber : '+94' + phoneNumber;

        if (currentUser && formattedCurrentPhone === formattedNewPhone) {
            $('#phone-error').addClass('hidden');
            return;
        }
    }

    // Add country code if not present
    const fullPhoneNumber = phoneNumber.startsWith('+94') ? phoneNumber : '+94' + phoneNumber;

    // Check phone number availability
    $.ajax({
        url: `${CONFIG.API_BASE_URL}/api/public/check-phone?phoneNumber=${encodeURIComponent(fullPhoneNumber)}`,
        method: 'GET',
        success: function(response) {
            if (response && response.exists) {
                $('#phone-error').removeClass('hidden');
            } else {
                $('#phone-error').addClass('hidden');
            }
        },
        error: function(xhr, status, error) {
            console.error('Error checking phone number:', error);
            $('#phone-error').addClass('hidden');
        }
    });
}


/**
 * Hide user modal
 */
function hideUserModal() {
    $('#user-modal').addClass('hidden');
}

/**
 * Show empty state message
 */
function showEmptyState(title, message) {
    $('#empty-state-message').text(message);
    $('#empty-state').removeClass('hidden');
    $('#pagination-container').hide();
}

/**
 * Setup modal behavior
 */
function setupModals() {
    // Close modals when clicking outside
    $('#user-modal, #view-user-modal, #confirm-modal, #reset-password-modal').on('click', function(e) {
        if (e.target === this) {
            $(this).addClass('hidden');
        }
    });

    // Close modals with Escape key
    $(document).on('keydown', function(e) {
        if (e.key === 'Escape') {
            $('.modal').addClass('hidden');
        }
    });
}

/**
 * Show a success notification
 */
function showSuccess(message) {
    Toastify({
        text: message,
        duration: 3000,
        close: true,
        gravity: "top",
        position: "right",
        backgroundColor: "linear-gradient(to right, #10b981, #059669)",
        stopOnFocus: true
    }).showToast();
}

/**
 * Show an error notification
 */
function showError(message) {
    Toastify({
        text: message,
        duration: 5000,
        close: true,
        gravity: "top",
        position: "right",
        backgroundColor: "linear-gradient(to right, #ef4444, #dc2626)",
        stopOnFocus: true
    }).showToast();
}

// Utility functions

/**
 * Get user initials from username
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
 * Format role name for display
 */
function formatRole(role) {
    if (!role) return 'User';

    return role
        .replace('ROLE_', '')
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) return 'N/A';

    // Format date
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };

    return date.toLocaleDateString('en-US', options);
}

/**
 * Get role badge CSS class
 */
function getRoleBadgeClass(role) {
    switch(role) {
        case 'ADMIN':
            return 'admin';
        case 'UTILITY_PROVIDER':
            return 'utility-provider';
        default:
            return 'user';
    }
}

/**
 * Format provider type for display
 */
function formatProviderType(type) {
    if (!type) return 'Unknown';

    switch(type) {
        case 'ELECTRICITY':
            return 'Electricity Provider';
        case 'WATER':
            return 'Water Provider';
        case 'GAS':
            return 'Gas Provider';
        case 'INTERNET':
            return 'Internet Provider';
        default:
            return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
    }
}

/**
 * Get language display name
 */
function getLanguageDisplay(code) {
    switch(code) {
        case 'en':
            return 'English';
        case 'si':
            return 'Sinhala';
        case 'ta':
            return 'Tamil';
        default:
            return code;
    }
}

/**
 * Toggle utility provider fields based on role selection
 */
function toggleUtilityProviderFields() {
    const role = $('#role').val();

    if (role === 'UTILITY_PROVIDER') {
        $('#utility-provider-section').removeClass('hidden');

        // Make provider fields required
        $('#provider-name, #provider-type').prop('required', true);
    } else {
        $('#utility-provider-section').addClass('hidden');

        // Make provider fields optional
        $('#provider-name, #provider-type').prop('required', false);
    }
}

/**
 * Save user from form data
 */
function saveUser() {
    // Get form data
    const userId = $('#user-id').val();
    const isEditing = userId !== '';

    // Get the phone number without the country code
    const phoneNumber = $('#phone-number').val();
    // Combine with country code
    const fullPhoneNumber = "+94" + phoneNumber;

    const userData = {
        username: $('#username').val(),
        email: $('#email').val(),
        phoneNumber: fullPhoneNumber, // Use the combined phone number
        role: $('#role').val(),
        preferredLanguage: $('#preferred-language').val(),
        active: $('#is-active').is(':checked')
    };

    // Add password for new users
    if (!isEditing) {
        userData.password = $('#password').val();
    }

    // Add provider data if applicable
    if (userData.role === 'UTILITY_PROVIDER') {
        userData.provider = {
            name: $('#provider-name').val(),
            type: $('#provider-type').val(),
            website: $('#provider-website').val() || null
        };
    }

    // Determine API endpoint and method
    const endpoint = isEditing
        ? `${CONFIG.API_BASE_URL}/api/admin/users/${userId}`
        : `${CONFIG.API_BASE_URL}/api/admin/register`;

    const method = isEditing ? 'PUT' : 'POST';

    // Save user
    $.ajax({
        url: endpoint,
        method: method,
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify(userData),
        success: function(response) {
            if (response && (response.code === 200 || response.code === 201)) {
                showSuccess(isEditing ? 'User updated successfully' : 'User created successfully');

                // Reload users and hide modal
                loadUsers();
                hideUserModal();
            } else {
                showError(response?.message || 'Failed to save user');
            }
        },
        error: function(xhr, status, error) {
            console.error('Error saving user:', error);

            // Check for validation errors
            if (xhr.responseJSON && xhr.responseJSON.message) {
                showError(xhr.responseJSON.message);
            } else {
                showError('Failed to save user. Please try again.');
            }
        }
    });
}

/**
 * Show user details in view modal
 */
function showUserDetails(userId) {
    // Get user data
    const user = users.find(u => u.id === userId);
    if (!user) return;

    // Fill user details
    $('#user-initials').text(getInitials(user.username));
    $('#view-username').text(user.username);
    $('#view-role').text(formatRole(user.role));

    // Set status badge
    const statusBadge = $('#view-status');
    statusBadge.removeClass('bg-green-100 text-green-800 bg-red-100 text-red-800');
    if (user.isActive) {
        statusBadge.addClass('bg-green-100 text-green-800');
        statusBadge.text('Active');
    } else {
        statusBadge.addClass('bg-red-100 text-red-800');
        statusBadge.text('Inactive');
    }

    // Fill contact info
    $('#view-email').text(user.email);
    $('#view-phone').text(user.phoneNumber || 'Not provided');

    // Fill account info
    $('#view-created').text(formatDate(user.createdAt));
    $('#view-last-login').text(user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never');
    $('#view-language').text(getLanguageDisplay(user.preferredLanguage || 'en'));

    // Set up action buttons
    $('#reset-password-btn').off('click').on('click', function() {
        showResetPasswordModal(userId, user.username);
    });

    $('#toggle-status-btn').off('click').on('click', function() {
        showToggleStatusConfirmation(userId, user.isActive);
    });

    $('#edit-user-btn').off('click').on('click', function() {
        $('#view-user-modal').addClass('hidden');
        showEditUserModal(userId);
    });

    // Toggle status button text
    $('#toggle-status-btn').html(`
        <i class='bx bx-power-off mr-2'></i> ${user.isActive ? 'Deactivate' : 'Activate'}
    `);

    // Handle utility provider details
    if (user.role === 'UTILITY_PROVIDER') {
        loadProviderDetails(userId);
    } else {
        $('#view-provider-details').addClass('hidden');
    }

    // Show modal
    $('#view-user-modal').removeClass('hidden');
}

/**
 * Load provider details for viewing
 */
function loadProviderDetails(userId) {
    $.ajax({
        url: `${CONFIG.API_BASE_URL}/api/admin/users/${userId}/provider`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        success: function(response) {
            if (response && response.code === 200 && response.data) {
                const provider = response.data;

                // Fill provider details
                $('#view-provider-name').text(provider.name || 'N/A');
                $('#view-provider-type').text(formatProviderType(provider.type));

                // Handle website link
                if (provider.website) {
                    $('#view-website').text(provider.website);
                    $('#view-website').attr('href', provider.website);
                    $('#view-website-container').show();
                } else {
                    $('#view-website-container').hide();
                }

                // Show provider section
                $('#view-provider-details').removeClass('hidden');
            } else {
                $('#view-provider-details').addClass('hidden');
            }
        },
        error: function(xhr, status, error) {
            console.error('Error loading provider details:', error);
            $('#view-provider-details').addClass('hidden');
        }
    });
}

/**
 * Show reset password modal
 */
function showResetPasswordModal(userId, username) {
    $('#reset-user-id').val(userId);
    $('#reset-user-name').text(username);
    $('#new-password').val('');

    $('#reset-password-modal').removeClass('hidden');
}

/**
 * Reset user password
 */
function resetUserPassword() {
    const userId = $('#reset-user-id').val();
    const newPassword = $('#new-password').val();

    $.ajax({
        url: `${CONFIG.API_BASE_URL}/api/admin/users/${userId}/reset-password`,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify({ newPassword }),
        success: function(response) {
            if (response && response.code === 200) {
                showSuccess('Password reset successfully');
                $('#reset-password-modal').addClass('hidden');
            } else {
                showError(response?.message || 'Failed to reset password');
            }
        },
        error: function(xhr, status, error) {
            console.error('Error resetting password:', error);
            showError('Failed to reset password. Please try again.');
        }
    });
}

/**
 * Show delete user confirmation
 */
function showDeleteConfirmation(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    // Set confirmation message
    $('#confirm-title').text('Delete User');
    $('#confirm-message').text(`Are you sure you want to delete user "${user.username}"? This action cannot be undone.`);

    // Set icon
    $('#confirm-icon').removeClass().addClass('bx bx-trash text-2xl');
    $('#confirm-icon-container').removeClass().addClass('inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 mb-4');

    // Set button text
    $('#confirm-action').text('Delete').removeClass().addClass('px-4 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500');

    // Set callback
    confirmationCallback = function() {
        deleteUser(userId);
    };

    // Show modal
    $('#confirm-modal').removeClass('hidden');
}

/**
 * Show toggle status confirmation
 */
function showToggleStatusConfirmation(userId, currentStatus) {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const newStatus = !currentStatus;
    const action = newStatus ? 'activate' : 'deactivate';
    const actionTitle = newStatus ? 'Activate' : 'Deactivate';

    // Set confirmation message
    $('#confirm-title').text(`${actionTitle} User`);
    $('#confirm-message').text(`Are you sure you want to ${action} user "${user.username}"?`);

    // Set icon
    $('#confirm-icon').removeClass().addClass('bx bx-power-off text-2xl');

    const iconColorClass = newStatus ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600';
    $('#confirm-icon-container').removeClass().addClass(`inline-flex items-center justify-center w-12 h-12 rounded-full ${iconColorClass} mb-4`);

    // Set button text
    $('#confirm-action').text(actionTitle);

    const buttonColorClass = newStatus
        ? 'bg-green-600 text-white rounded-md font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
        : 'bg-red-600 text-white rounded-md font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500';

    $('#confirm-action').removeClass().addClass(`px-4 py-2 ${buttonColorClass}`);

    // Set callback
    confirmationCallback = function() {
        toggleUserStatus(userId, newStatus);
    };

    // Show modal
    $('#confirm-modal').removeClass('hidden');
}

/**
 * Delete a user
 */
function deleteUser(userId) {
    $.ajax({
        url: `${CONFIG.API_BASE_URL}/api/admin/users/${userId}`,
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        success: function(response) {
            if (response && response.code === 200) {
                showSuccess('User deleted successfully');
                loadUsers();
            } else {
                showError(response?.message || 'Failed to delete user');
            }
        },
        error: function(xhr, status, error) {
            console.error('Error deleting user:', error);
            showError('Failed to delete user. Please try again.');
        }
    });
}

/**
 * Toggle user active status
 */
function toggleUserStatus(userId, newStatus) {
    $.ajax({
        url: `${CONFIG.API_BASE_URL}/api/admin/users/${userId}/toggle-status`,
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify({ isActive: newStatus }),
        success: function(response) {
            if (response && response.code === 200) {
                showSuccess(`User ${newStatus ? 'activated' : 'deactivated'} successfully`);
                loadUsers();
                $('#view-user-modal').addClass('hidden');
            } else {
                showError(response?.message || 'Failed to update user status');
            }
        },
        error: function(xhr, status, error) {
            console.error('Error toggling user status:', error);
            showError('Failed to update user status. Please try again.');
        }
    });


}