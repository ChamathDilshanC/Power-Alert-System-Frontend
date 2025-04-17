/**
 * Utility Provider Management JavaScript
 *
 * This script handles the functionality for the utility provider management page.
 * It manages loading, displaying, creating, updating, and deleting utility providers.
 */

$(document).ready(function() {
    // State variables
    let providers = [];
    let areas = [];
    let currentPage = 1;
    const pageSize = 10;
    let totalPages = 1;
    let editMode = false;
    let selectedServiceAreas = [];

    // Constants
    const API_BASE_URL = CONFIG.API_BASE_URL || 'http://localhost:8080';
    const UTILITY_TYPE_ICONS = {
        'ELECTRICITY': 'bxs-bolt',
        'WATER': 'bxs-droplet',
        'GAS': 'bxs-flame',
        'INTERNET': 'bx-wifi'
    };
    const UTILITY_TYPE_COLORS = {
        'ELECTRICITY': 'electricity',
        'WATER': 'water',
        'GAS': 'gas',
        'INTERNET': 'internet'
    };

    /**
     * Initialize the page by loading data and setting up event listeners
     */
    function init() {
        // Load providers
        loadProviders();

        // Load areas for the service areas selection
        loadAreas();

        // Add event listeners for search and filters
        $('#search-providers').on('input', debounce(filterProviders, 300));
        $('#filter-type').on('change', filterProviders);
        $('#reset-filters').on('click', resetFilters);
        $('#clear-search-btn').on('click', resetFilters);

        // Add event listeners for pagination
        $('#prev-page').on('click', function() {
            changePage(currentPage - 1);
        });
        $('#next-page').on('click', function() {
            changePage(currentPage + 1);
        });

        // Add event listeners for provider modal
        $('#add-provider-btn').on('click', openAddProviderModal);
        $('#close-modal, #cancel-form').on('click', closeProviderModal);
        $('#provider-form').on('submit', saveProvider);
        $('#toggle-password').on('click', togglePasswordVisibility);

        // Add event listeners for view provider modal
        $('#close-view-modal').on('click', closeViewProviderModal);
        $('#edit-provider-btn').on('click', handleEditProvider);
        $('#delete-provider-btn').on('click', confirmDeleteProvider);

        // Add event listeners for confirmation modal
        $('#cancel-confirm').on('click', closeConfirmModal);
        $('#confirm-action').on('click', executeConfirmedAction);
    }

    /**
     * Load utility providers from the API
     */
    function loadProviders() {
        const loadingNotification = showToast('Loading utility providers...', 'info');

        // Get authentication token from local storage
        const token = localStorage.getItem('auth_token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        $.ajax({
            url: `${API_BASE_URL}/api/provider/all`,
            type: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            success: function(result) {
                dismissToast(loadingNotification);

                if (result.code === 200) {
                    providers = result.data || [];
                    renderProviders();
                } else {
                    showToast('Failed to load providers: ' + result.message, 'error');
                }
            },
            error: function(xhr, status, error) {
                console.error('Error loading providers:', error);
                showToast('Failed to load providers: ' + (xhr.responseJSON?.message || error), 'error');

                // Hide loading row and show empty state
                $('#loading-row').addClass('hidden');
                $('#empty-state').removeClass('hidden');
                $('#empty-state-message').text('Error loading utility providers. Please try again later.');
            }
        });
    }

    /**
     * Load service areas from the API
     */
    function loadAreas() {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            return;
        }

        $.ajax({
            url: `${API_BASE_URL}/api/public/areas`,
            type: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            success: function(result) {
                if (result.code === 200) {
                    areas = result.data || [];
                }
            },
            error: function(xhr, status, error) {
                console.error('Error loading areas:', error);
            }
        });
    }

    /**
     * Render the list of providers with pagination
     */
    function renderProviders() {
        // Hide loading row
        $('#loading-row').addClass('hidden');

        const filteredProviders = filterProvidersList();

        // Update pagination
        updatePagination(filteredProviders.length);

        // If no providers match the filters, show empty state
        if (filteredProviders.length === 0) {
            $('#empty-state').removeClass('hidden');
            $('#pagination-container').addClass('hidden');

            // Determine appropriate empty state message
            if ($('#search-providers').val() || $('#filter-type').val()) {
                $('#empty-state-message').text('No utility providers match your search criteria.');
            } else {
                $('#empty-state-message').text('No utility providers have been added yet.');
            }

            // Clear table body
            $('#providers-table-body').html('');
            return;
        }

        // Show providers table and pagination
        $('#empty-state').addClass('hidden');
        $('#pagination-container').removeClass('hidden');

        // Calculate pagination offsets
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, filteredProviders.length);
        const displayedProviders = filteredProviders.slice(startIndex, endIndex);

        // Generate HTML for each provider
        let html = '';
        $.each(displayedProviders, function(index, provider) {
            const icon = UTILITY_TYPE_ICONS[provider.type] || 'bx-building-house';
            const colorClass = UTILITY_TYPE_COLORS[provider.type] || '';

            html += `
                <tr class="hover:bg-gray-50 transition-colors">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <div class="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-primary-100 text-primary-600 rounded-full">
                                <i class='bx ${icon} text-xl'></i>
                            </div>
                            <div class="ml-4">
                                <div class="text-sm font-medium text-gray-900">${provider.name}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${provider.contactEmail || 'N/A'}</div>
                        <div class="text-sm text-gray-500">${provider.contactPhone || 'No phone provided'}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="provider-type-badge ${colorClass}">${formatUtilityType(provider.type)}</span>
                    </td>
                    <td class="px-6 py-4">
                        <div class="text-sm text-gray-900">${getServiceAreasText(provider)}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button class="text-primary-600 hover:text-primary-900 mr-3 view-provider-btn" data-id="${provider.id}">
                            View
                        </button>
                        <button class="text-gray-600 hover:text-gray-900 edit-provider-btn" data-id="${provider.id}">
                            Edit
                        </button>
                    </td>
                </tr>
            `;
        });

        // Update table body
        $('#providers-table-body').html(html);

        // Add event listeners to action buttons
        $('.view-provider-btn').on('click', function() {
            openViewProviderModal($(this).data('id'));
        });

        $('.edit-provider-btn').on('click', function() {
            openEditProviderModal($(this).data('id'));
        });
    }

    /**
     * Get formatted text for provider service areas
     * @param {Object} provider - The provider object
     * @returns {string} - Formatted text for service areas
     */
    function getServiceAreasText(provider) {
        if (!provider.serviceAreas || provider.serviceAreas.length === 0) {
            return 'No service areas specified';
        }

        if (provider.serviceAreas.length <= 2) {
            return provider.serviceAreas.map(area => area.name).join(', ');
        }

        return `${provider.serviceAreas[0].name}, ${provider.serviceAreas[1].name}, and ${provider.serviceAreas.length - 2} more`;
    }

    /**
     * Format utility type for display
     * @param {string} type - The utility type
     * @returns {string} - Formatted type string
     */
    function formatUtilityType(type) {
        return type.charAt(0) + type.slice(1).toLowerCase();
    }

    /**
     * Filter the providers list based on search and filter inputs
     * @returns {Array} - Filtered providers list
     */
    function filterProvidersList() {
        const searchTerm = $('#search-providers').val().toLowerCase();
        const typeFilter = $('#filter-type').val();

        return providers.filter(function(provider) {
            // Type filter
            if (typeFilter && provider.type !== typeFilter) {
                return false;
            }

            // Search filter
            if (searchTerm) {
                const nameMatch = provider.name.toLowerCase().includes(searchTerm);
                const emailMatch = provider.contactEmail && provider.contactEmail.toLowerCase().includes(searchTerm);
                const phoneMatch = provider.contactPhone && provider.contactPhone.toLowerCase().includes(searchTerm);
                const websiteMatch = provider.website && provider.website.toLowerCase().includes(searchTerm);

                return nameMatch || emailMatch || phoneMatch || websiteMatch;
            }

            return true;
        });
    }

    /**
     * Apply filters to the providers list
     */
    function filterProviders() {
        currentPage = 1; // Reset to first page when filtering
        renderProviders();
    }

    /**
     * Reset all filters and search
     */
    function resetFilters() {
        $('#search-providers').val('');
        $('#filter-type').val('');
        currentPage = 1;
        renderProviders();
    }

    /**
     * Update pagination controls
     * @param {number} totalItemsCount - Total number of items
     */
    function updatePagination(totalItemsCount) {
        totalPages = Math.ceil(totalItemsCount / pageSize);

        // Update pagination text
        const startItem = totalItemsCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
        const endItem = Math.min(currentPage * pageSize, totalItemsCount);

        $('#page-start').text(startItem);
        $('#page-end').text(endItem);
        $('#total-items').text(totalItemsCount);

        // Update pagination buttons state
        $('#prev-page').prop('disabled', currentPage === 1);
        $('#next-page').prop('disabled', currentPage === totalPages);

        // Generate page numbers
        generatePageNumbers();
    }

    /**
     * Generate pagination page numbers
     */
    function generatePageNumbers() {
        $('#page-numbers').empty();

        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        // Add first page if not visible
        if (startPage > 1) {
            addPageNumber(1);
            if (startPage > 2) {
                addEllipsis();
            }
        }

        // Add visible page numbers
        for (let i = startPage; i <= endPage; i++) {
            addPageNumber(i);
        }

        // Add last page if not visible
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                addEllipsis();
            }
            addPageNumber(totalPages);
        }
    }

    /**
     * Add a page number button to pagination
     * @param {number} pageNum - The page number
     */
    function addPageNumber(pageNum) {
        const isActive = pageNum === currentPage;
        const pageBtn = $('<button></button>')
            .addClass(isActive
                ? 'relative inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-primary-600 rounded-md'
                : 'relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50')
            .text(pageNum);

        if (!isActive) {
            pageBtn.on('click', function() {
                changePage(pageNum);
            });
        }

        $('#page-numbers').append(pageBtn);
    }

    /**
     * Add ellipsis to pagination
     */
    function addEllipsis() {
        const ellipsis = $('<span></span>')
            .addClass('relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white')
            .text('...');
        $('#page-numbers').append(ellipsis);
    }

    /**
     * Change the current page
     * @param {number} pageNum - The page number to change to
     */
    function changePage(pageNum) {
        if (pageNum < 1 || pageNum > totalPages || pageNum === currentPage) {
            return;
        }

        currentPage = pageNum;
        renderProviders();
    }

    /**
     * Open the provider modal for adding a new provider
     */
    function openAddProviderModal() {
        // Reset form and set add mode
        resetProviderForm();
        editMode = false;
        $('#modal-title').text('Add New Utility Provider');
        $('#save-provider').text('Save Provider');

        // Show account fields
        $('#account-container').removeClass('hidden');
        $('#username-field').removeClass('hidden');
        $('#password-field').removeClass('hidden');

        // Make username and password required
        $('#username').prop('required', true);
        $('#password').prop('required', true);

        // Populate service areas
        populateServiceAreas();

        // Show modal
        $('#provider-modal').removeClass('hidden');
    }

    function openEditProviderModal(id) {
        // Find provider by ID
        const provider = providers.find(p => p.id == id);
        if (!provider) {
            showToast('Provider not found', 'error');
            return;
        }

        // Reset form and set edit mode
        resetProviderForm();
        editMode = true;

        // Populate form with provider data
        $('#provider-id').val(provider.id);
        $('#name').val(provider.name);
        $('#type').val(provider.type); // Make sure this sets the correct value
        $('#contact-email').val(provider.contactEmail || '');
        $('#contact-phone').val(provider.contactPhone || '');
        $('#website').val(provider.website || '');

        // Get service area IDs from the provider object
        const serviceAreaIds = provider.serviceAreas ?
            provider.serviceAreas.map(area => area.id) : [];

        // Populate service areas with the extracted IDs
        populateServiceAreas(provider.serviceAreas || []);

        // Make sure selectedServiceAreas is correctly set
        selectedServiceAreas = [...serviceAreaIds];

        // Show modal
        $('#provider-modal').removeClass('hidden');
    }

    /**
     * Close the provider modal
     */
    function closeProviderModal() {
        $('#provider-modal').addClass('hidden');
        resetProviderForm();
    }

    /**
     * Reset the provider form
     */
    function resetProviderForm() {
        $('#provider-form')[0].reset();
        $('#provider-id').val('');
        selectedServiceAreas = [];
    }

    /**
     * Populate service areas checkboxes
     * @param {Array} selectedAreas - Currently selected areas (for edit mode)
     */
    function populateServiceAreas(selectedAreas = []) {
        if (!areas || areas.length === 0) {
            $('#service-areas-container').html('<p class="text-sm text-gray-500">No areas available</p>');
            return;
        }

        // Reset selected areas
        selectedServiceAreas = selectedAreas ? selectedAreas.map(area => area.id) : [];

        // Generate checkboxes for each area
        let html = '';
        $.each(areas, function(index, area) {
            const isChecked = selectedAreas && selectedAreas.some(selected => selected.id === area.id);

            html += `
            <div class="flex items-center p-2 hover:bg-gray-100 rounded-md">
                <input type="checkbox" id="area-${area.id}" name="serviceAreas" value="${area.id}"
                    class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    ${isChecked ? 'checked' : ''}>
                <label for="area-${area.id}" class="ml-2 block text-sm text-gray-900">
                    ${area.name} (${area.district})
                </label>
            </div>
        `;
        });

        $('#service-areas-container').html(html);

        // Add event listeners to checkboxes
        $('input[name="serviceAreas"]').on('change', function() {
            const areaId = parseInt($(this).val());
            if ($(this).is(':checked')) {
                if (!selectedServiceAreas.includes(areaId)) {
                    selectedServiceAreas.push(areaId);
                }
            } else {
                selectedServiceAreas = selectedServiceAreas.filter(id => id !== areaId);
            }

            // Log for debugging
            console.log("Selected service areas:", selectedServiceAreas);
        });
    }

    /**
     * Toggle password visibility
     */
    function togglePasswordVisibility() {
        const icon = $('#toggle-password i');

        if ($('#password').attr('type') === 'password') {
            $('#password').attr('type', 'text');
            icon.removeClass('bx-show').addClass('bx-hide');
        } else {
            $('#password').attr('type', 'password');
            icon.removeClass('bx-hide').addClass('bx-show');
        }
    }

    function saveProvider(e) {
        e.preventDefault();

        const loadingNotification = showToast(editMode ? 'Updating provider...' : 'Creating provider...', 'info');

        // Get token
        const token = localStorage.getItem('auth_token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        try {
            // Create a clean data object
            const formData = {
                name: $('#name').val().trim(),
                type: $('#type').val(),
                contactEmail: $('#contact-email').val().trim(),
                contactPhone: $('#contact-phone').val().trim(),
                website: $('#website').val().trim() || "",
                serviceAreaIds: selectedServiceAreas.slice() // Create a copy of the array
            };

            // Add ID only in edit mode
            if (editMode && $('#provider-id').val()) {
                formData.id = parseInt($('#provider-id').val());
            }

            // Add account info for new providers
            if (!editMode) {
                formData.username = $('#username').val().trim();
                formData.password = $('#password').val();
            }

            // Clean up the object - remove any undefined or null values
            Object.keys(formData).forEach(key => {
                if (formData[key] === undefined || formData[key] === null) {
                    delete formData[key];
                }
            });

            // Log the cleaned data
            console.log("Sending data to API:", JSON.stringify(formData));

            // Make request to API
            const url = editMode
                ? `${API_BASE_URL}/api/provider/${$('#provider-id').val()}`
                : `${API_BASE_URL}/api/provider/register`;

            const method = editMode ? 'PUT' : 'POST';

            $.ajax({
                url: url,
                type: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                data: JSON.stringify(formData),
                processData: false,
                success: function(result) {
                    dismissToast(loadingNotification);

                    if (result.code === 200 || result.code === 201) {
                        showToast(editMode ? 'Provider updated successfully' : 'Provider created successfully', 'success');
                        closeProviderModal();
                        loadProviders(); // Reload providers list
                    } else {
                        showToast('Failed to save provider: ' + result.message, 'error');
                    }
                },
                error: function(xhr, status, error) {
                    dismissToast(loadingNotification);
                    console.error("API error details:", xhr);
                    showToast('Failed to save provider: ' + (xhr.responseJSON?.message || error), 'error');
                }
            });
        } catch (e) {
            dismissToast(loadingNotification);
            console.error("Error preparing data:", e);
            showToast('Error preparing provider data: ' + e.message, 'error');
        }
    }
    /**
     * Open view provider modal
     * @param {string} id - The provider ID to view
     */
    function openViewProviderModal(id) {
        // Find provider by ID
        const provider = providers.find(p => p.id == id);
        if (!provider) {
            showToast('Provider not found', 'error');
            return;
        }

        // Set view modal content
        $('#view-name').text(provider.name);

        // Set provider type with appropriate badge
        const colorClass = UTILITY_TYPE_COLORS[provider.type] || '';
        $('#view-type').html(`<span class="provider-type-badge ${colorClass}">${formatUtilityType(provider.type)}</span>`);

        // Set contact info
        $('#view-email').text(provider.contactEmail || 'Not provided');
        $('#view-phone').text(provider.contactPhone || 'Not provided');

        // Set website with link if available
        if (provider.website) {
            $('#view-website-link').text(provider.website);
            $('#view-website-link').attr('href', provider.website.startsWith('http') ? provider.website : `https://${provider.website}`);
            $('#view-website-container').removeClass('hidden');
        } else {
            $('#view-website-container').html('<p class="text-sm font-medium text-gray-900">Not provided</p>');
        }

        // Set provider icon
        const icon = UTILITY_TYPE_ICONS[provider.type] || 'bx-building-house';
        $('#provider-icon').html(`<i class='bx ${icon} text-2xl'></i>`);

        // Set service areas
        if (provider.serviceAreas && provider.serviceAreas.length > 0) {
            let areasHtml = '';
            $.each(provider.serviceAreas, function(index, area) {
                areasHtml += `<p class="text-sm text-gray-900">${area.name} (${area.district})</p>`;
            });
            $('#view-service-areas').html(areasHtml);
        } else {
            $('#view-service-areas').html('<p class="text-sm text-gray-500">No service areas specified</p>');
        }

        // Set edit/delete buttons with provider ID
        $('#edit-provider-btn').data('id', provider.id);
        $('#delete-provider-btn').data('id', provider.id);

        // Show modal
        $('#view-provider-modal').removeClass('hidden');
    }

    /**
     * Close view provider modal
     */
    function closeViewProviderModal() {
        $('#view-provider-modal').addClass('hidden');
    }

    /**
     * Handle edit provider button in view modal
     */
    function handleEditProvider() {
        const id = $('#edit-provider-btn').data('id');
        closeViewProviderModal();
        openEditProviderModal(id);
    }

    /**
     * Open confirm delete modal
     */
    function confirmDeleteProvider() {
        const id = $('#delete-provider-btn').data('id');
        const provider = providers.find(p => p.id == id);

        if (!provider) {
            showToast('Provider not found', 'error');
            return;
        }

        // Set confirmation modal content
        $('#confirm-title').text('Delete Utility Provider');
        $('#confirm-message').text(`Are you sure you want to delete ${provider.name}? This action cannot be undone.`);
        $('#confirm-action').text('Delete');

        // Set confirm action with provider ID
        $('#confirm-action').data('action', 'delete-provider');
        $('#confirm-action').data('id', id);

        // Show confirmation modal
        $('#confirm-modal').removeClass('hidden');
    }

    /**
     * Close confirmation modal
     */
    function closeConfirmModal() {
        $('#confirm-modal').addClass('hidden');
    }

    /**
     * Execute confirmed action
     */
    function executeConfirmedAction() {
        const action = $('#confirm-action').data('action');
        const id = $('#confirm-action').data('id');

        // Close confirmation modal
        closeConfirmModal();

        // Execute appropriate action
        if (action === 'delete-provider') {
            deleteProvider(id);
        }
    }

    /**
     * Delete a provider
     * @param {string} id - The provider ID to delete
     */
    function deleteProvider(id) {
        const loadingNotification = showToast('Deleting provider...', 'info');

        // Get token
        const token = localStorage.getItem('auth_token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        $.ajax({
            url: `${API_BASE_URL}/api/provider/${id}`,
            type: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            success: function(result) {
                dismissToast(loadingNotification);

                if (result.code === 200) {
                    showToast('Utility provider deleted successfully', 'success');
                    closeViewProviderModal();
                    loadProviders(); // Reload providers list
                } else {
                    showToast('Failed to delete provider: ' + result.message, 'error');
                }
            },
            error: function(xhr, status, error) {
                dismissToast(loadingNotification);
                console.error('Error deleting provider:', error);
                showToast('Failed to delete provider: ' + (xhr.responseJSON?.message || error), 'error');
            }
        });
    }

    /**
     * Simple toast notification functions
     */
    function showToast(message, type = 'info') {
        // Check if Toastify is available
        if (typeof Toastify === 'function') {
            const toast = Toastify({
                text: message,
                duration: 5000,
                close: true,
                gravity: "top",
                position: "right",
                stopOnFocus: true,
                style: {
                    background: type === 'success' ? "linear-gradient(to right, #10b981, #059669)" :
                        type === 'error' ? "linear-gradient(to right, #ef4444, #b91c1c)" :
                            type === 'warning' ? "linear-gradient(to right, #f59e0b, #d97706)" :
                                "linear-gradient(to right, #3b82f6, #2563eb)",
                }
            });

            toast.showToast();
            return toast;
        } else {
            // Fallback to alert if Toastify is not available
            console.log(`[${type.toUpperCase()}] ${message}`);
            return null;
        }
    }

    function dismissToast(toast) {
        if (toast && typeof toast.hideToast === 'function') {
            toast.hideToast();
        }
    }

    /**
     * Debounce function to limit how often a function can be called
     * @param {Function} func - The function to debounce
     * @param {number} wait - Milliseconds to wait
     * @returns {Function} - Debounced function
     */
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    /**
     * Check if the user has admin permissions
     * If not, redirect to dashboard
     */
    function checkAdminPermissions() {
        const userRole = localStorage.getItem('user_role');
        if (userRole !== 'ADMIN') {
            window.location.href = 'dashboard.html';
            showToast('You do not have permission to access this page', 'error');
        }
    }

    // Initialize the page
    init();

    // Check if user has admin permissions
    checkAdminPermissions();
});