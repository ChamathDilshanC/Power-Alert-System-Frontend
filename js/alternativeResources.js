$(document).ready(function() {
    // Global variables
    let resources = [];
    let areas = [];
    let currentPage = 1;
    let totalPages = 1;
    let itemsPerPage = 10;
    let selectedResourceId = null;
    let isEditMode = false;
    let imageFile = null;
    let currentUserRole = ''; // Will store the current user's role

    // Check if user is authenticated
    checkAuthentication();

    // Initialize the page
    init();

    /**
     * Check if user is authenticated and set up role-based UI
     */
    function checkAuthentication() {
        const token = getAuthToken();

        if (!token) {
            // Redirect to login page if no token is found
            showToast('Please log in to access this page', 'error');
            setTimeout(() => {
                window.location.href = '../login.html';
            }, 2000);
            return;
        }

        // Get user role from localStorage
        currentUserRole = localStorage.getItem('user_role');

        // Configure UI based on role
        configureUIForRole(currentUserRole);
    }

    /**
     * Configure UI elements based on user role
     */
    function configureUIForRole(role) {
        if (role === 'ADMIN') {
            // Admin can access all functionality
            $('#add-resource-btn').show();
        } else {
            // Non-admin users (regular users and utility providers) can only view
            $('#add-resource-btn').hide();
        }
    }

    /**
     * Get authentication token from localStorage
     */
    function getAuthToken() {
        return localStorage.getItem('auth_token');
    }

    /**
     * Add authorization header to ajax requests
     */
    function getAuthHeader() {
        const token = getAuthToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    /**
     * Check if user has admin role
     */
    function isAdmin() {
        return currentUserRole === 'ADMIN';
    }

    /**
     * Initialize the page
     */
    function init() {
        // Load areas for filters and form
        loadAreas();

        // Load alternative resources
        loadResources();

        // Initialize event handlers
        initEventHandlers();
    }

    /**
     * Initialize event handlers
     */
    function initEventHandlers() {
        // Add resource button (only visible to admins)
        $('#add-resource-btn').on('click', function() {
            if (isAdmin()) {
                openAddResourceModal();
            } else {
                showToast('You do not have permission to add resources', 'error');
            }
        });

        // Close modal buttons
        $('#close-modal, #cancel-form').on('click', function() {
            closeResourceModal();
        });

        // Close view modal button
        $('#close-view-modal').on('click', function() {
            closeViewModal();
        });

        // Form submission
        $('#resource-form').on('submit', function(e) {
            e.preventDefault();
            if (isAdmin()) {
                saveResource();
            } else {
                showToast('You do not have permission to save resources', 'error');
            }
        });

        // Search and filter handlers
        $('#search-resources').on('input', function() {
            currentPage = 1;
            loadResources();
        });

        $('#filter-type, #filter-area, #filter-status').on('change', function() {
            currentPage = 1;
            loadResources();
        });

        $('#reset-filters').on('click', function() {
            resetFilters();
        });

        $('#clear-search-btn').on('click', function() {
            resetFilters();
        });

        // Pagination handlers
        $('#prev-page').on('click', function() {
            if (currentPage > 1) {
                currentPage--;
                loadResources();
            }
        });

        $('#next-page').on('click', function() {
            if (currentPage < totalPages) {
                currentPage++;
                loadResources();
            }
        });

        // Image upload handlers
        $('#select-image-btn').on('click', function() {
            if (isAdmin()) {
                $('#image-upload').click();
            } else {
                showToast('You do not have permission to upload images', 'error');
            }
        });

        $('#image-upload').on('change', function(e) {
            if (isAdmin()) {
                handleImageSelection(e);
            }
        });

        $('#remove-image-btn').on('click', function() {
            if (isAdmin()) {
                removeSelectedImage();
            } else {
                showToast('You do not have permission to remove images', 'error');
            }
        });

        // Confirmation modal handlers
        $('#cancel-confirm').on('click', function() {
            closeConfirmModal();
        });

        $('#confirm-action').on('click', function() {
            if (!isAdmin()) {
                showToast('You do not have permission to perform this action', 'error');
                closeConfirmModal();
                return;
            }

            const action = $(this).data('action');
            const id = $(this).data('id');

            if (action === 'delete') {
                deleteResource(id);
            }

            closeConfirmModal();
        });
    }

    function loadAreas() {
        $.ajax({
            url: `${CONFIG.API_BASE_URL}/api/public/areas`,
            method: 'GET',
            success: function(response) {
                areas = response.data || [];

                // Populate area dropdowns
                const areaFilterSelect = $('#filter-area');
                const areaFormSelect = $('#area-id');

                // Clear existing options except the first one
                areaFilterSelect.find('option:not(:first)').remove();
                areaFormSelect.empty();

                // Add areas to dropdowns
                areas.forEach(area => {
                    areaFilterSelect.append(`<option value="${area.id}">${area.name}</option>`);
                    areaFormSelect.append(`<option value="${area.id}" data-lat="${area.latitude}" data-lng="${area.longitude}">${area.name}</option>`);
                });

                // Add event listener for area selection change
                $('#area-id').on('change', function() {
                    const selectedOption = $(this).find('option:selected');
                    const lat = selectedOption.data('lat');
                    const lng = selectedOption.data('lng');

                    if (lat && lng) {
                        $('#latitude').val(lat);
                        $('#longitude').val(lng);
                    }
                });
            },
            error: function(xhr) {
                handleApiError(xhr, 'Failed to load areas');
            }
        });
    }

// Add a new function to update coordinates based on selected area
    function updateCoordinatesFromArea() {
        const selectedOption = $('#area-id option:selected');
        const lat = selectedOption.data('lat');
        const lng = selectedOption.data('lng');

        // If the area has coordinates, set them in the fields
        if (lat && lng) {
            $('#latitude').val(lat);
            $('#longitude').val(lng);
        }
    }

    /**
     * Load alternative resources with filters and pagination
     */
    function loadResources() {
        // Show loading state
        $('#loading-row').show();
        $('#empty-state').hide();
        $('#resources-table-body tr:not(#loading-row)').remove();

        // Get filter values
        const searchTerm = $('#search-resources').val().trim();
        const typeFilter = $('#filter-type').val();
        const areaFilter = $('#filter-area').val();
        const statusFilter = $('#filter-status').val();

        // Prepare URL with query parameters
        let url = `${CONFIG.API_BASE_URL}/api/public/alternative-resources`;
        const queryParams = [];

        if (areaFilter) {
            // If area filter is applied, use the area-specific endpoint
            url = `${CONFIG.API_BASE_URL}/api/public/areas/${areaFilter}/alternative-resources`;
        }

        // Add the API call
        $.ajax({
            url: url,
            method: 'GET',
            success: function(response) {
                // Hide loading state
                $('#loading-row').hide();

                if (response.data && Array.isArray(response.data)) {
                    resources = response.data;

                    // Apply client-side filtering since the API doesn't support all filters
                    if (searchTerm) {
                        resources = resources.filter(resource =>
                            resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (resource.description && resource.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                            resource.address.toLowerCase().includes(searchTerm.toLowerCase())
                        );
                    }

                    if (typeFilter) {
                        resources = resources.filter(resource => resource.type === typeFilter);
                    }

                    if (statusFilter !== '') {
                        const isActive = statusFilter === 'true';
                        resources = resources.filter(resource => resource.active === isActive);
                    }

                    // Implement pagination
                    const totalItems = resources.length;
                    totalPages = Math.ceil(totalItems / itemsPerPage);

                    const startIndex = (currentPage - 1) * itemsPerPage;
                    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
                    const paginatedResources = resources.slice(startIndex, endIndex);

                    // Update pagination info
                    $('#page-start').text(totalItems === 0 ? 0 : startIndex + 1);
                    $('#page-end').text(endIndex);
                    $('#total-items').text(totalItems);
                    updatePaginationButtons();

                    // Render resources
                    if (paginatedResources.length === 0) {
                        showEmptyState('No alternative resources match your search criteria.');
                    } else {
                        renderResources(paginatedResources);
                    }
                } else {
                    showEmptyState('No alternative resources available.');
                }
            },
            error: function(xhr) {
                $('#loading-row').hide();
                handleApiError(xhr, 'Failed to load resources');
                showEmptyState('Failed to load resources. Please try again.');
            }
        });
    }

    /**
     * Render resources in the table
     */
    function renderResources(resources) {
        const tableBody = $('#resources-table-body');

        // Clear existing rows except loading row
        tableBody.find('tr:not(#loading-row)').remove();

        // Add resource rows
        resources.forEach(resource => {
            // Find area name
            const area = areas.find(a => a.id === resource.areaId) || { name: 'Unknown Area' };

            // Create resource row
            // Action buttons are conditionally displayed based on user role
            const row = `
                <tr data-id="${resource.id}" class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                            ${resource.hasImage
                ? `<img src="${CONFIG.API_BASE_URL}/api/public/alternative-resources/${resource.id}/image" alt="${resource.name}" class="w-full h-full object-cover">`
                : `<i class='bx bx-image-alt text-gray-400 text-2xl'></i>`
            }
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="text-sm font-medium text-gray-900">${resource.name}</div>
                        <div class="text-sm text-gray-500 truncate max-w-xs">${resource.description || 'No description'}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="type-badge ${getTypeBadgeClass(resource.type)}">${formatResourceType(resource.type)}</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${area.name}</div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="text-sm text-gray-900 truncate max-w-xs">${resource.address}</div>
                        <div class="text-sm text-gray-500">${resource.latitude.toFixed(6)}, ${resource.longitude.toFixed(6)}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="status-badge ${resource.active ? 'active' : 'inactive'}">${resource.active ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button class="view-resource-btn text-primary-600 hover:text-primary-900 mr-3" data-id="${resource.id}">
                            <i class='bx bx-show'></i> View
                        </button>
                        ${isAdmin() ? `
                            <button class="edit-resource-btn text-yellow-600 hover:text-yellow-900 mr-3" data-id="${resource.id}">
                                <i class='bx bx-edit'></i> Edit
                            </button>
                            <button class="delete-resource-btn text-red-600 hover:text-red-900" data-id="${resource.id}">
                                <i class='bx bx-trash'></i> Delete
                            </button>
                        ` : `
                            <button class="edit-resource-btn text-gray-400 cursor-not-allowed mr-3" disabled>
                                <i class='bx bx-edit'></i> Edit
                            </button>
                            <button class="delete-resource-btn text-gray-400 cursor-not-allowed" disabled>
                                <i class='bx bx-trash'></i> Delete
                            </button>
                        `}
                    </td>
                </tr>
            `;

            tableBody.append(row);
        });

        // Add event handlers for row actions
        $('.view-resource-btn').on('click', function() {
            const resourceId = $(this).data('id');
            openViewResourceModal(resourceId);
        });

        // Only add click handlers for admin users
        if (isAdmin()) {
            $('.edit-resource-btn:not([disabled])').on('click', function() {
                const resourceId = $(this).data('id');
                openEditResourceModal(resourceId);
            });

            $('.delete-resource-btn:not([disabled])').on('click', function() {
                const resourceId = $(this).data('id');
                confirmDeleteResource(resourceId);
            });
        }
    }

    /**
     * Update pagination buttons based on current page and total pages
     */
    function updatePaginationButtons() {
        // Disable/enable previous and next buttons
        $('#prev-page').prop('disabled', currentPage === 1);
        $('#next-page').prop('disabled', currentPage === totalPages || totalPages === 0);

        // Update page numbers
        const pageNumbers = $('#page-numbers');
        pageNumbers.empty();

        // Determine range of page numbers to show
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);

        if (endPage - startPage < 4 && totalPages > 4) {
            startPage = Math.max(1, endPage - 4);
        }

        // Add first page button if necessary
        if (startPage > 1) {
            pageNumbers.append(`
                <button class="page-number relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${1 === currentPage ? 'bg-primary-50 text-primary-600 border-primary-500' : 'text-gray-700 bg-white hover:bg-gray-50'}" data-page="1">1</button>
            `);

            if (startPage > 2) {
                pageNumbers.append(`
                    <span class="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700">...</span>
                `);
            }
        }

        // Add page numbers
        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.append(`
                <button class="page-number relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${i === currentPage ? 'bg-primary-50 text-primary-600 border-primary-500' : 'text-gray-700 bg-white hover:bg-gray-50'}" data-page="${i}">${i}</button>
            `);
        }

        // Add last page button if necessary
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pageNumbers.append(`
                    <span class="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700">...</span>
                `);
            }

            pageNumbers.append(`
                <button class="page-number relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${totalPages === currentPage ? 'bg-primary-50 text-primary-600 border-primary-500' : 'text-gray-700 bg-white hover:bg-gray-50'}" data-page="${totalPages}">${totalPages}</button>
            `);
        }

        // Add click handlers for page number buttons
        $('.page-number').on('click', function() {
            const page = parseInt($(this).data('page'));
            if (page !== currentPage) {
                currentPage = page;
                loadResources();
            }
        });
    }

    /**
     * Show empty state message
     */
    function showEmptyState(message) {
        $('#empty-state').show();
        $('#empty-state-message').text(message);
        $('#pagination-container').hide();
    }

    /**
     * Hide empty state
     */
    function hideEmptyState() {
        $('#empty-state').hide();
        $('#pagination-container').show();
    }

    /**
     * Reset all filters and search
     */
    function resetFilters() {
        $('#search-resources').val('');
        $('#filter-type').val('');
        $('#filter-area').val('');
        $('#filter-status').val('');
        currentPage = 1;
        loadResources();
    }

    function openAddResourceModal() {
        if (!isAdmin()) {
            showToast('You do not have permission to add resources', 'error');
            return;
        }

        // Reset form
        $('#resource-form')[0].reset();
        $('#resource-id').val('');
        $('#modal-title').text('Add New Resource');

        // Reset image preview
        removeSelectedImage();

        // If an area is pre-selected, set the coordinates
        const selectedOption = $('#area-id option:selected');
        if (selectedOption.val()) {
            const lat = selectedOption.data('lat');
            const lng = selectedOption.data('lng');

            if (lat && lng) {
                $('#latitude').val(lat);
                $('#longitude').val(lng);
            }
        }

        // Show modal
        isEditMode = false;
        $('#resource-modal').removeClass('hidden');
    }

    /**
     * Open edit resource modal
     */
    function openEditResourceModal(resourceId) {
        if (!isAdmin()) {
            showToast('You do not have permission to edit resources', 'error');
            return;
        }

        const resource = resources.find(r => r.id === resourceId);
        if (!resource) return;

        // Set form values
        $('#resource-id').val(resource.id);
        $('#name').val(resource.name);
        $('#type').val(resource.type);
        $('#description').val(resource.description || '');
        $('#area-id').val(resource.areaId);
        $('#address').val(resource.address);
        $('#latitude').val(resource.latitude);
        $('#longitude').val(resource.longitude);
        $('#contact-number').val(resource.contactNumber || '');
        $('#operating-hours').val(resource.operatingHours || '');
        $('#is-active').prop('checked', resource.active);

        // Update image preview if resource has an image
        if (resource.hasImage) {
            const imageUrl = `${CONFIG.API_BASE_URL}/api/public/alternative-resources/${resource.id}/image`;
            updateImagePreview(imageUrl);
            $('#remove-image-btn').show();
        } else {
            removeSelectedImage();
        }

        // Set modal title
        $('#modal-title').text('Edit Resource');

        // Show modal
        isEditMode = true;
        selectedResourceId = resource.id;
        $('#resource-modal').removeClass('hidden');
    }

    /**
     * Close resource modal
     */
    function closeResourceModal() {
        $('#resource-modal').addClass('hidden');
        $('#resource-form')[0].reset();
        removeSelectedImage();
        isEditMode = false;
        selectedResourceId = null;
    }

    /**
     * Open view resource modal
     */
    function openViewResourceModal(resourceId) {
        const resource = resources.find(r => r.id === resourceId);
        if (!resource) return;

        // Find area name
        const area = areas.find(a => a.id === resource.areaId) || { name: 'Unknown Area' };

        // Set values in view modal
        $('#view-name').text(resource.name);
        $('#view-description').text(resource.description || 'No description provided.');

        // Set type badge
        $('#view-type').attr('class', `type-badge ${getTypeBadgeClass(resource.type)}`);
        $('#view-type').text(formatResourceType(resource.type));

        // Set status badge
        $('#view-status').attr('class', `status-badge ${resource.active ? 'active' : 'inactive'}`);
        $('#view-status').text(resource.active ? 'Active' : 'Inactive');

        // Set location information
        $('#view-area').text(area.name);
        $('#view-address').text(resource.address);
        $('#view-coordinates').text(`${resource.latitude.toFixed(6)}, ${resource.longitude.toFixed(6)}`);

        // Set contact information
        $('#view-contact').text(resource.contactNumber || 'Not provided');
        $('#view-operating').text(resource.operatingHours || 'Not specified');

        // Set image if available
        if (resource.hasImage) {
            const imageUrl = `${CONFIG.API_BASE_URL}/api/public/alternative-resources/${resource.id}/image`;
            $('#view-image').attr('src', imageUrl).removeClass('hidden');
            $('#view-no-image').addClass('hidden');
        } else {
            $('#view-image').addClass('hidden');
            $('#view-no-image').removeClass('hidden');
        }

        // Update toggle status button text
        const statusBtnText = resource.active ? 'Deactivate' : 'Activate';
        $('#toggle-resource-status-btn').html(`<i class='bx bx-power-off mr-2'></i> ${statusBtnText}`);

        // Store resource ID for actions
        selectedResourceId = resource.id;

        // Configure action buttons based on user role
        if (isAdmin()) {
            // Show all action buttons for admin
            $('#edit-resource-btn, #delete-resource-btn, #toggle-resource-status-btn').show();

            // Setup action buttons
            $('#edit-resource-btn').off('click').on('click', function() {
                closeViewModal();
                openEditResourceModal(selectedResourceId);
            });

            $('#delete-resource-btn').off('click').on('click', function() {
                closeViewModal();
                confirmDeleteResource(selectedResourceId);
            });

            $('#toggle-resource-status-btn').off('click').on('click', function() {
                closeViewModal();
                toggleResourceStatus(selectedResourceId, !resource.active);
            });
        } else {
            // Hide action buttons for non-admin users
            $('#edit-resource-btn, #delete-resource-btn, #toggle-resource-status-btn').hide();
        }

        // Show modal
        $('#view-resource-modal').removeClass('hidden');
    }

    /**
     * Close view modal
     */
    function closeViewModal() {
        $('#view-resource-modal').addClass('hidden');
        selectedResourceId = null;
    }

    /**
     * Handle image selection
     */
    function handleImageSelection(e) {
        if (!isAdmin()) {
            showToast('You do not have permission to upload images', 'error');
            return;
        }

        const file = e.target.files[0];
        if (!file) return;

        // Check file type
        if (!file.type.match('image.*')) {
            showToast('Please select an image file', 'error');
            return;
        }

        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showToast('Image size should be less than 5MB', 'error');
            return;
        }

        // Store the file for upload
        imageFile = file;

        // Preview the image
        const reader = new FileReader();
        reader.onload = function(e) {
            updateImagePreview(e.target.result);
        };
        reader.readAsDataURL(file);
    }

    /**
     * Update image preview
     */
    function updateImagePreview(src) {
        const preview = $('#image-preview');
        preview.empty();
        preview.append(`<img src="${src}" alt="Preview" class="max-w-full max-h-full object-contain">`);
        $('#remove-image-btn').removeClass('hidden');
    }

    /**
     * Remove selected image
     */
    function removeSelectedImage() {
        // Reset file input
        $('#image-upload').val('');
        imageFile = null;

        // Reset preview
        const preview = $('#image-preview');
        preview.empty();
        preview.append(`
            <div class="placeholder">
                <i class='bx bx-image-alt text-3xl'></i>
                <p>No image selected</p>
            </div>
        `);

        // Hide remove button
        $('#remove-image-btn').addClass('hidden');
    }

    /**
     * Save resource (create or update)
     */
    function saveResource() {
        if (!isAdmin()) {
            showToast('You do not have permission to save resources', 'error');
            return;
        }

        // Get form data
        const resourceId = $('#resource-id').val();
        const formData = {
            name: $('#name').val(),
            type: $('#type').val(),
            description: $('#description').val(),
            areaId: parseInt($('#area-id').val()),
            address: $('#address').val(),
            latitude: parseFloat($('#latitude').val()),
            longitude: parseFloat($('#longitude').val()),
            contactNumber: $('#contact-number').val(),
            operatingHours: $('#operating-hours').val(),
            active: $('#is-active').is(':checked')
        };

        // If editing, add ID to form data
        if (isEditMode) {
            formData.id = parseInt(resourceId);
        }

        // API call to create or update resource
        const url = isEditMode
            ? `${CONFIG.API_BASE_URL}/api/admin/alternative-resources/${resourceId}`
            : `${CONFIG.API_BASE_URL}/api/admin/alternative-resources`;

        const method = isEditMode ? 'PUT' : 'POST';

        $.ajax({
            url: url,
            method: method,
            contentType: 'application/json',
            headers: getAuthHeader(),
            data: JSON.stringify(formData),
            success: function(response) {
                if (response.code === 200 || response.code === 201) {
                    // If there's an image file, upload it
                    if (imageFile) {
                        uploadResourceImage(response.data.id);
                    } else {
                        showToast(isEditMode ? 'Resource updated successfully' : 'Resource created successfully', 'success');
                        closeResourceModal();
                        loadResources();
                    }
                } else {
                    showToast(`Error: ${response.message}`, 'error');
                }
            },
            error: function(xhr) {
                handleApiError(xhr, isEditMode ? 'Failed to update resource' : 'Failed to create resource');
            }
        });
    }

    /**
     * Upload resource image
     */
    function uploadResourceImage(resourceId) {
        if (!isAdmin()) {
            showToast('You do not have permission to upload images', 'error');
            return;
        }

        if (!imageFile) return;

        const formData = new FormData();
        formData.append('file', imageFile);

        $.ajax({
            url: `${CONFIG.API_BASE_URL}/api/admin/alternative-resources/${resourceId}/image`,
            method: 'POST',
            data: formData,
            contentType: false,
            processData: false,
            headers: getAuthHeader(),
            success: function(response) {
                if (response.code === 200) {
                    showToast(isEditMode ? 'Resource updated successfully' : 'Resource created successfully', 'success');
                    closeResourceModal();
                    loadResources();
                } else {
                    showToast(`Error uploading image: ${response.message}`, 'error');
                }
            },
            error: function(xhr) {
                handleApiError(xhr, 'Failed to upload image');
            }
        });
    }

    /**
     * Confirm delete resource
     */
    function confirmDeleteResource(resourceId) {
        if (!isAdmin()) {
            showToast('You do not have permission to delete resources', 'error');
            return;
        }

        const resource = resources.find(r => r.id === resourceId);
        if (!resource) return;

        // Set confirmation modal content
        $('#confirm-title').text('Delete Resource');
        $('#confirm-message').text(`Are you sure you want to delete "${resource.name}"? This action cannot be undone.`);
        $('#confirm-icon').attr('class', 'bx bx-trash text-2xl');
        $('#confirm-icon-container').attr('class', 'inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 mb-4');
        $('#confirm-action').text('Delete').attr('class', 'px-4 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500');

        // Set action data
        $('#confirm-action').data('action', 'delete').data('id', resourceId);

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
     * Delete resource
     */
    function deleteResource(resourceId) {
        if (!isAdmin()) {
            showToast('You do not have permission to delete resources', 'error');
            return;
        }

        $.ajax({
            url: `${CONFIG.API_BASE_URL}/api/admin/alternative-resources/${resourceId}`,
            method: 'DELETE',
            headers: getAuthHeader(),
            success: function(response) {
                if (response.code === 200) {
                    showToast('Resource deleted successfully', 'success');
                    loadResources();
                } else {
                    showToast(`Error: ${response.message}`, 'error');
                }
            },
            error: function(xhr) {
                handleApiError(xhr, 'Failed to delete resource');
            }
        });
    }

    /**
     * Toggle resource status (activate/deactivate)
     */
    function toggleResourceStatus(resourceId, isActive) {
        if (!isAdmin()) {
            showToast('You do not have permission to change resource status', 'error');
            return;
        }

        const resource = resources.find(r => r.id === resourceId);
        if (!resource) return;

        // Clone the resource and update the active status
        const updatedResource = {...resource, active: isActive};

        $.ajax({
            url: `${CONFIG.API_BASE_URL}/api/admin/alternative-resources/${resourceId}`,
            method: 'PUT',
            contentType: 'application/json',
            headers: getAuthHeader(),
            data: JSON.stringify(updatedResource),
            success: function(response) {
                if (response.code === 200) {
                    const statusText = isActive ? 'activated' : 'deactivated';
                    showToast(`Resource ${statusText} successfully`, 'success');
                    loadResources();
                } else {
                    showToast(`Error: ${response.message}`, 'error');
                }
            },
            error: function(xhr) {
                handleApiError(xhr, 'Failed to update resource status');
            }
        });
    }

    /**
     * Helper function to get type badge class based on resource type
     */
    function getTypeBadgeClass(type) {
        switch(type) {
            case 'SOLAR':
                return 'solar';
            case 'GENERATOR':
                return 'generator';
            case 'BATTERY':
                return 'battery';
            default:
                return 'other';
        }
    }

    /**
     * Format resource type for display
     */
    function formatResourceType(type) {
        return type.charAt(0) + type.slice(1).toLowerCase();
    }

    /**
     * Show toast notification
     */
    function showToast(message, type = 'info') {
        const bgColor = type === 'success' ? '#10b981'
            : type === 'error' ? '#ef4444'
                : type === 'warning' ? '#f59e0b'
                    : '#6366f1';

        Toastify({
            text: message,
            duration: 3000,
            gravity: "bottom",
            position: 'right',
            backgroundColor: bgColor,
            stopOnFocus: true
        }).showToast();
    }

    /**
     * Handle API errors
     */
    function handleApiError(xhr, defaultMessage) {
        let errorMessage = defaultMessage;

        try {
            const response = JSON.parse(xhr.responseText);
            if (response.message) {
                errorMessage = response.message;
            }
        } catch (e) {
            // Use default message if response cannot be parsed
        }

        // Handle authentication errors
        if (xhr.status === 401) {
            showToast('Your session has expired. Please log in again.', 'error');
            setTimeout(() => {
                // Clear token and redirect to login
                localStorage.removeItem('auth_token');
                window.location.href = '../index.html';
            }, 2000);
        } else if (xhr.status === 403) {
            showToast('You do not have permission to perform this action', 'error');
        }

        showToast(`Error: ${errorMessage}`, 'error');
    }
});