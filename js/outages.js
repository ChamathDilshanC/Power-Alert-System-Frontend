/**
 * outageManagement.js - Handles the outage management functionality
 * This script manages the user interface for the outage management page,
 * including loading outages, filtering, CRUD operations, map integration,
 * and notifications.
 */

// Set base configuration if not already defined globally
if (typeof CONFIG === 'undefined') {
    const CONFIG = {
        API_BASE_URL: 'http://localhost:8080',
        API_VERSION: 'v1',
        API_TIMEOUT: 30000,
        MAPBOX_TOKEN: 'pk.eyJ1IjoiY2hhbWF0aDQ5OTciLCJhIjoiY204bXhqN2N2MGtuMDJscGw2bDk1N3RpNyJ9.tzXMf6U8UAd0GY1GR-iuTQ',
        DEFAULT_MAP_CENTER: [80.6337, 7.8731], // Sri Lanka center coordinates
        DEFAULT_MAP_ZOOM: 7
    };
    window.CONFIG = CONFIG;
}

// State variables
let outages = [];
let filteredOutages = [];
let currentPage = 1;
const pageSize = 10;
let editingOutageId = null;
let confirmationCallback = null;
let areas = [];
let utilityProviders = [];
let currentRole = '';
let currentProviderId = null;
let map = null;
let draw = null;
let selectedAreaId = null;
let currentTab = 'active-outages';
let utilityProvidersLoaded = false;

// DOM ready
$(document).ready(function() {
    // Check user role and permissions
    checkUserRole();

    // Initialize the UI
    initOutageManagement();

    // Set up event listeners
    setupEventListeners();
});

function checkUserRole() {
    // Get token from localStorage
    const token = localStorage.getItem('auth_token');

    if (!token) {
        // Redirect to login if no token
        window.location.href = 'login.html';
        return;
    }

    try {
        // Decode token to get user role and provider ID if applicable
        const tokenData = parseJwt(token);
        currentRole = tokenData.role || '';

        // For utility providers, we need their provider ID
        if (currentRole === 'ROLE_UTILITY_PROVIDER') {
            // This would depend on your JWT structure
            currentProviderId = tokenData.providerId || null;

            // If provider ID is missing, fetch it from the API
            if (!currentProviderId) {
                fetchCurrentProviderInfo();
            }

            // Auto-hide the utility provider dropdown for provider users
            // as they can only create outages for their own provider
            $('#utility-provider').closest('div').hide();
        }
    } catch (error) {
        console.error('Error checking user role:', error);
    }
}

/**
 * Parse JWT token
 */
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error('Error parsing JWT:', e);
        return {};
    }
}

/**
 * Fetch provider information for utility provider user
 */
function fetchCurrentProviderInfo() {
    $.ajax({
        url: `${CONFIG.API_BASE_URL}/api/provider/current`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        success: function(response) {
            if (response && response.code === 200 && response.data) {
                currentProviderId = response.data.id;
            }
        },
        error: function(xhr, status, error) {
            console.error('Error fetching provider info:', error);
        }
    });
}

/**
 * Initialize the outage management interface
 */
function initOutageManagement() {
    // Load outages for the selected tab
    loadOutages();

    // Load reference data
    loadAreas();
    loadUtilityProviders();

    // Set up UI components
    setupModals();
    initializeDatepickers();
}

/**
 * Load areas from the API
 */
function loadAreas() {
    $.ajax({
        url: `${CONFIG.API_BASE_URL}/api/public/areas`,
        method: 'GET',
        success: function(response) {
            if (response && response.code === 200 && response.data) {
                areas = response.data;

                // Populate area dropdowns
                populateAreaDropdowns();
            }
        },
        error: function(xhr, status, error) {
            console.error('Error loading areas:', error);
            showError('Failed to load areas. Please try again.');
        }
    });
}

function loadUtilityProviders() {
    $.ajax({
        url: `${CONFIG.API_BASE_URL}/api/public/utility-providers`,
        method: 'GET',
        success: function(response) {
            if (response && response.code === 200 && response.data) {
                utilityProviders = response.data;
                utilityProvidersLoaded = true;
                console.log("Successfully loaded utility providers:", utilityProviders);
                populateUtilityProviderDropdown();
            }
        },
        error: function(xhr, status, error) {
            console.error('Error loading utility providers:', error);
            // Fall back to default providers
            $('#utility-provider').find('option:not(:first)').remove();
            $('#utility-provider').append('<option value="1">Ceylon Electricity Board (ELECTRICITY)</option>');
            $('#utility-provider').append('<option value="2">National Water Supply and Drainage Board (WATER)</option>');
            $('#utility-provider').val("1"); // Set default
            utilityProvidersLoaded = false;
        }
    });
}

/**
 * Populate area dropdowns with loaded areas
 */
function populateAreaDropdowns() {
    // Clear existing options except for the default
    $('#area-select, #filter-area').find('option:not(:first)').remove();

    // Add areas to dropdowns
    areas.forEach(area => {
        const option = `<option value="${area.id}">${area.name} (${area.district})</option>`;
        $('#area-select, #filter-area').append(option);
    });
}

/**
 * Set up event listeners for the user interface
 */
function setupEventListeners() {
    // Tab switching
    $('.tab-item').on('click', function() {
        // Remove active class from all tabs
        $('.tab-item').removeClass('tab-active').addClass('border-transparent text-gray-500');

        // Add active class to clicked tab
        $(this).addClass('tab-active').removeClass('border-transparent text-gray-500');

        // Get tab ID
        currentTab = $(this).attr('id');

        // Load outages for the selected tab
        loadOutages();
    });

    // Search and filters
    $('#search-outages').on('input', function() {
        applyFilters();
    });

    $('#filter-type, #filter-area').on('change', function() {
        applyFilters();
    });

    // Reset filters button
    $('#reset-filters').on('click', function() {
        resetFilters();
    });

    // Create outage button
    $('#create-outage-btn').on('click', function() {
        showCreateOutageModal();
    });

    // Area selection tab switching
    $('#select-area-tab').on('click', function(e) {
        e.preventDefault();
        switchAreaTab('select');
    });

    $('#draw-area-tab').on('click', function(e) {
        e.preventDefault();
        switchAreaTab('draw');
    });

    // Area selection change
    $('#area-select').on('change', function() {
        const areaId = $(this).val();
        if (areaId) {
            selectedAreaId = areaId;
            const area = areas.find(a => a.id == areaId);

            if (area && area.boundaryJson) {
                // Show area preview map
                $('#area-preview-map').removeClass('hidden');
                showAreaPreview(area);
            } else {
                $('#area-preview-map').addClass('hidden');
            }
        } else {
            selectedAreaId = null;
            $('#area-preview-map').addClass('hidden');
        }
    });

    // Form submissions
    $('#outage-form').on('submit', function(e) {
        e.preventDefault();
        saveOutage();
    });

    $('#update-form').on('submit', function(e) {
        e.preventDefault();
        saveOutageUpdate();
    });

    // Modal close buttons
    $('#close-modal, #cancel-form').on('click', function() {
        hideOutageModal();
    });

    $('#close-view-modal').on('click', function() {
        $('#view-outage-modal').addClass('hidden');
    });

    $('#close-update-modal, #cancel-update').on('click', function() {
        $('#add-update-modal').addClass('hidden');
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
        const totalPages = Math.ceil(filteredOutages.length / pageSize);
        if (currentPage < totalPages) {
            navigateToPage(currentPage + 1);
        }
    });
}

/**
 * Initialize date pickers
 */
function initializeDatepickers() {
    // Initialize flatpickr for date/time inputs
    flatpickr('.datepicker', {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        time_24hr: true,
        minDate: "today"
    });
}

/**
 * Switch between area selection tabs
 */
function switchAreaTab(tabType) {
    // Update tab styling
    $('.area-tab-item').removeClass('border-primary-500 text-primary-600').addClass('border-transparent text-gray-500');

    if (tabType === 'select') {
        $('#select-area-tab').removeClass('border-transparent text-gray-500').addClass('border-primary-500 text-primary-600');
        $('#select-area-container').removeClass('hidden');
        $('#draw-area-container').addClass('hidden');
    } else {
        $('#draw-area-tab').removeClass('border-transparent text-gray-500').addClass('border-primary-500 text-primary-600');
        $('#draw-area-container').removeClass('hidden');
        $('#select-area-container').addClass('hidden');

        // Initialize map if not already done
        if (!map) {
            initializeMap();
        }
    }
}

/**
 * Initialize Mapbox map for drawing areas
 */
function initializeMap() {
    // Initialize map
    mapboxgl.accessToken = CONFIG.MAPBOX_TOKEN;

    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: CONFIG.DEFAULT_MAP_CENTER,
        zoom: CONFIG.DEFAULT_MAP_ZOOM
    });

    // Add navigation controls
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add drawing controls
    draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
            polygon: true,
            trash: true
        }
    });

    map.addControl(draw);

    // Events for drawing
    map.on('draw.create', updateAreaGeoJson);
    map.on('draw.update', updateAreaGeoJson);
    map.on('draw.delete', function() {
        // Clear the hidden input when polygons are deleted
        $('#area-geojson').val('');
    });
}

/**
 * Update the hidden geojson input when a polygon is drawn
 */
function updateAreaGeoJson() {
    const data = draw.getAll();

    if (data.features.length > 0) {
        const geoJson = JSON.stringify(data);
        $('#area-geojson').val(geoJson);

        // Try to get center point for the polygon
        try {
            const bounds = new mapboxgl.LngLatBounds();
            data.features[0].geometry.coordinates[0].forEach(coord => {
                bounds.extend(coord);
            });

            // Set center coordinates in hidden fields for future use
            const center = bounds.getCenter();
            $('#area-center-lat').val(center.lat);
            $('#area-center-lng').val(center.lng);
        } catch (e) {
            console.error('Error calculating polygon center:', e);
        }
    } else {
        $('#area-geojson').val('');
    }
}

/**
 * Show area preview on a map
 */
function showAreaPreview(area) {
    // Initialize preview map if not exists
    if (!$('#area-preview-map').hasClass('mapbox-initialized')) {
        mapboxgl.accessToken = CONFIG.MAPBOX_TOKEN;

        const previewMap = new mapboxgl.Map({
            container: 'area-preview-map',
            style: 'mapbox://styles/mapbox/streets-v11',
            center: [area.longitude || CONFIG.DEFAULT_MAP_CENTER[0], area.latitude || CONFIG.DEFAULT_MAP_CENTER[1]],
            zoom: 10,
            interactive: false // Disable interactions for preview
        });

        $('#area-preview-map').data('map', previewMap).addClass('mapbox-initialized');

        // Wait for map to load before adding data
        previewMap.on('load', function() {
            addAreaToMap(previewMap, area);
        });
    } else {
        // Update existing map
        const previewMap = $('#area-preview-map').data('map');

        // Remove existing area layers
        if (previewMap.getLayer('area-fill')) {
            previewMap.removeLayer('area-fill');
        }
        if (previewMap.getLayer('area-outline')) {
            previewMap.removeLayer('area-outline');
        }
        if (previewMap.getSource('area')) {
            previewMap.removeSource('area');
        }

        // Add new area
        addAreaToMap(previewMap, area);

        // Update center
        if (area.latitude && area.longitude) {
            previewMap.setCenter([area.longitude, area.latitude]);
        }
    }
}

/**
 * Add area polygon to map
 */
function addAreaToMap(mapInstance, area) {
    if (!area.boundaryJson) return;

    try {
        // Parse GeoJSON
        const geojson = JSON.parse(area.boundaryJson);

        // Add source
        mapInstance.addSource('area', {
            type: 'geojson',
            data: geojson
        });

        // Add fill layer
        mapInstance.addLayer({
            id: 'area-fill',
            type: 'fill',
            source: 'area',
            paint: {
                'fill-color': '#4f46e5',
                'fill-opacity': 0.2
            }
        });

        // Add outline layer
        mapInstance.addLayer({
            id: 'area-outline',
            type: 'line',
            source: 'area',
            paint: {
                'line-color': '#4f46e5',
                'line-width': 2
            }
        });

        // Fit bounds to the polygon
        if (geojson.features && geojson.features[0] && geojson.features[0].geometry) {
            const coordinates = geojson.features[0].geometry.coordinates[0];
            const bounds = coordinates.reduce((bounds, coord) => {
                return bounds.extend(coord);
            }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

            mapInstance.fitBounds(bounds, { padding: 50 });
        }
    } catch (e) {
        console.error('Error adding area to map:', e);
    }
}

/**
 * Load outages from the API
 */
function loadOutages() {
    // Show loading indicator
    $('#loading-row').show();
    $('#empty-state').hide();

    // Get outage status based on selected tab
    let statusFilter = '';
    let endpoint = '';

    switch(currentTab) {
        case 'active-outages-tab':
            endpoint = '/api/public/outages/active';
            break;
        case 'scheduled-outages-tab':
            statusFilter = 'SCHEDULED';
            endpoint = '/api/public/outages/all';
            break;
        case 'completed-outages-tab':
            statusFilter = 'COMPLETED';
            endpoint = '/api/public/outages/all';
            break;
        case 'cancelled-outages-tab':
            statusFilter = 'CANCELLED';
            endpoint = '/api/public/outages/all';
            break;
        default:
            endpoint = '/api/public/outages/active';
    }

    // Modify endpoint based on user role
    if (currentRole === 'ROLE_UTILITY_PROVIDER' && currentProviderId) {
        endpoint = '/api/provider/outages';
    }

    // Call the API
    $.ajax({
        url: `${CONFIG.API_BASE_URL}${endpoint}`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        success: function(response) {
            // Process the response
            if (response && response.data) {
                outages = response.data;

                // Filter by status if needed
                if (statusFilter) {
                    outages = outages.filter(outage => outage.status === statusFilter);
                }

                // Apply filters and display outages
                applyFilters();
            } else {
                // Show empty state
                showEmptyState("No outages found", "There are no outages in the system.");
            }
        },
        error: function(xhr, status, error) {
            console.error('Error loading outages:', error);
            showError('Failed to load outages. Please try again.');
            showEmptyState("Error loading outages", "Could not load outages from the server.");
        },
        complete: function() {
            // Hide loading indicator
            $('#loading-row').hide();
        }
    });
}

/**
 * Apply filters to the outage list
 */
function applyFilters() {
    const searchText = $('#search-outages').val().toLowerCase();
    const typeFilter = $('#filter-type').val();
    const areaFilter = $('#filter-area').val();

    // Filter outages
    filteredOutages = outages.filter(outage => {
        // Search text filter
        const areaName = outage.affectedArea ? outage.affectedArea.name.toLowerCase() : '';
        const reason = outage.reason ? outage.reason.toLowerCase() : '';
        const providerName = outage.utilityProvider ? outage.utilityProvider.name.toLowerCase() : '';

        const matchesSearch = !searchText ||
            areaName.includes(searchText) ||
            reason.includes(searchText) ||
            providerName.includes(searchText);

        // Type filter
        const matchesType = !typeFilter || outage.type === typeFilter;

        // Area filter
        const matchesArea = !areaFilter || (outage.affectedArea && outage.affectedArea.id == areaFilter);

        return matchesSearch && matchesType && matchesArea;
    });

    // Reset to first page
    currentPage = 1;

    // Render the outage table
    renderOutageTable();
}

/**
 * Reset all filters
 */
function resetFilters() {
    $('#search-outages').val('');
    $('#filter-type').val('');
    $('#filter-area').val('');

    applyFilters();
}

/**
 * Render the outage table with current filtered outages
 */
function renderOutageTable() {
    const tableBody = $('#outages-table-body');

    // Clear existing table content (except loading row)
    tableBody.find('tr:not(#loading-row)').remove();

    // Check if we have outages to display
    if (filteredOutages.length === 0) {
        // Show empty state
        showEmptyState("No outages found", "No outages match your search criteria.");
        $('#pagination-container').hide();
        return;
    }

    // Show pagination
    $('#pagination-container').show();

    // Calculate pagination
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredOutages.length);
    const pageOutages = filteredOutages.slice(startIndex, endIndex);

    // Render each outage
    pageOutages.forEach(outage => {
        const row = $(`
            <tr>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="outage-type-badge ${getOutageTypeBadgeClass(outage.type)}">
                        ${formatOutageType(outage.type)}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${outage.affectedArea ? outage.affectedArea.name : 'N/A'}</div>
                    <div class="text-xs text-gray-500">${outage.affectedArea ? outage.affectedArea.district : ''}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${formatDateTime(outage.startTime)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${formatDateTime(outage.estimatedEndTime)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="outage-status-badge ${getOutageStatusBadgeClass(outage.status)}">
                        ${formatOutageStatus(outage.status)}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${outage.utilityProvider ? outage.utilityProvider.name : 'N/A'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div class="flex space-x-2 justify-end">
                        <button class="view-outage-btn text-blue-600 hover:text-blue-900" data-outage-id="${outage.id}" title="View Details">
                            <i class='bx bx-show'></i>
                        </button>
                        ${canEditOutage(outage) ? `
                        <button class="edit-outage-btn text-indigo-600 hover:text-indigo-900" data-outage-id="${outage.id}" title="Edit Outage">
                            <i class='bx bx-edit'></i>
                        </button>
                        ` : ''}
                        ${canCancelOutage(outage) ? `
                        <button class="cancel-outage-btn text-red-600 hover:text-red-900" data-outage-id="${outage.id}" title="Cancel Outage">
                            <i class='bx bx-x-circle'></i>
                        </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `);

        // Add event listeners
        row.find('.view-outage-btn').on('click', function() {
            showOutageDetails(outage.id);
        });

        row.find('.edit-outage-btn').on('click', function() {
            showEditOutageModal(outage.id);
        });

        row.find('.cancel-outage-btn').on('click', function() {
            showCancelOutageConfirmation(outage.id);
        });

        tableBody.append(row);
    });

    // Update pagination
    updatePagination();
}

/**
 * Check if user can edit an outage
 */
function canEditOutage(outage) {
    if (currentRole === 'ROLE_ADMIN') {
        return true;
    }

    if (currentRole === 'ROLE_UTILITY_PROVIDER' &&
        outage.utilityProvider &&
        outage.utilityProvider.id === currentProviderId &&
        (outage.status === 'SCHEDULED' || outage.status === 'ONGOING')) {
        return true;
    }

    return false;
}

/**
 * Check if user can cancel an outage
 */
function canCancelOutage(outage) {
    if (outage.status === 'COMPLETED' || outage.status === 'CANCELLED') {
        return false;
    }

    return canEditOutage(outage);
}

/**
 * Show outage details
 */
function showOutageDetails(outageId) {
    // Get outage data
    const outage = outages.find(o => o.id === outageId);
    if (!outage) return;

    // Fill outage details
    $('#view-outage-type').text(formatOutageType(outage.type)).removeClass().addClass(`outage-type-badge ${getOutageTypeBadgeClass(outage.type)}`);
    $('#view-outage-status').text(formatOutageStatus(outage.status)).removeClass().addClass(`outage-status-badge ${getOutageStatusBadgeClass(outage.status)} ml-2`);
    $('#view-outage-area').text(outage.affectedArea ? outage.affectedArea.name : 'N/A');
    $('#view-outage-reason').text(outage.reason || 'Not specified');
    $('#view-outage-provider').text(outage.utilityProvider ? outage.utilityProvider.name : 'N/A');

    // Times and duration
    $('#view-outage-start').text(formatDateTime(outage.startTime));
    $('#view-outage-end').text(formatDateTime(outage.estimatedEndTime));

    // Calculate duration
    const duration = calculateDuration(outage.startTime, outage.estimatedEndTime);
    $('#view-outage-duration').text(duration);

    // Additional info
    $('#view-outage-info').text(outage.additionalInfo || 'No additional information provided.');

    // Show map if geographical data is available
    if (outage.geographicalAreaJson) {
        $('#view-outage-map').removeClass('hidden');
        initializeViewMap(outage);
    } else if (outage.affectedArea && outage.affectedArea.boundaryJson) {
        $('#view-outage-map').removeClass('hidden');
        initializeViewMap(outage.affectedArea);
    } else {
        $('#view-outage-map').addClass('hidden');
    }

    // Load outage updates
    loadOutageUpdates(outageId);

    // Load notification stats
    loadNotificationStats(outageId);

    // Set up action buttons based on permissions
    setupActionButtons(outage);

    // Show modal
    $('#view-outage-modal').removeClass('hidden');
}

/**
 * Initialize map for viewing outage details
 */
function initializeViewMap(outage) {
    // If map already initialized, remove it and recreate
    if ($('#view-outage-map').hasClass('mapbox-initialized')) {
        $('#view-outage-map').removeClass('mapbox-initialized').empty();
    }

    mapboxgl.accessToken = CONFIG.MAPBOX_TOKEN;

    const viewMap = new mapboxgl.Map({
        container: 'view-outage-map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: CONFIG.DEFAULT_MAP_CENTER,
        zoom: CONFIG.DEFAULT_MAP_ZOOM
    });

    viewMap.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add area to map when loaded
    viewMap.on('load', function() {
        // Determine which GeoJSON to use
        let geojson;

        if (outage.geographicalAreaJson) {
            // Use outage-specific area if available
            try {
                geojson = JSON.parse(outage.geographicalAreaJson);
            } catch (e) {
                console.error('Error parsing outage GeoJSON:', e);
            }
        } else if (outage.boundaryJson) {
            // Use area's boundary if available (when passing the area object directly)
            try {
                geojson = JSON.parse(outage.boundaryJson);
            } catch (e) {
                console.error('Error parsing area boundary JSON:', e);
            }
        }

        if (geojson) {
            // Add source
            viewMap.addSource('outage-area', {
                type: 'geojson',
                data: geojson
            });

            // Add fill layer
            viewMap.addLayer({
                id: 'outage-area-fill',
                type: 'fill',
                source: 'outage-area',
                paint: {
                    'fill-color': outage.type === 'ELECTRICITY' ? '#eab308' :
                        outage.type === 'WATER' ? '#3b82f6' : '#10b981',
                    'fill-opacity': 0.3
                }
            });

            // Add outline layer
            viewMap.addLayer({
                id: 'outage-area-outline',
                type: 'line',
                source: 'outage-area',
                paint: {
                    'line-color': outage.type === 'ELECTRICITY' ? '#ca8a04' :
                        outage.type === 'WATER' ? '#2563eb' : '#059669',
                    'line-width': 2
                }
            });

            // Fit bounds to the polygon
            try {
                if (geojson.features && geojson.features[0] && geojson.features[0].geometry) {
                    const coordinates = geojson.features[0].geometry.coordinates[0];
                    const bounds = coordinates.reduce((bounds, coord) => {
                        return bounds.extend(coord);
                    }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

                    viewMap.fitBounds(bounds, { padding: 50 });
                }
            } catch (e) {
                console.error('Error fitting bounds:', e);

                // Use center coordinates if available
                if (outage.affectedArea && outage.affectedArea.latitude && outage.affectedArea.longitude) {
                    viewMap.setCenter([outage.affectedArea.longitude, outage.affectedArea.latitude]);
                    viewMap.setZoom(12);
                }
            }
        }
    });

    $('#view-outage-map').addClass('mapbox-initialized');
}

/**
 * Load outage updates
 */
function loadOutageUpdates(outageId) {
    // Clear existing updates
    $('#outage-updates').empty();

    // Get outage data
    const outage = outages.find(o => o.id === outageId);
    if (!outage || !outage.updates || outage.updates.length === 0) {
        $('#outage-updates').html('<p class="text-sm text-gray-500">No updates available.</p>');
        return;
    }

    // Sort updates by createdAt (newest first)
    const sortedUpdates = [...outage.updates].sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // Render each update
    sortedUpdates.forEach(update => {
        let updateTitle = 'Update';

        if (update.newStatus) {
            updateTitle = `Status changed to ${formatOutageStatus(update.newStatus)}`;
        } else if (update.updatedEstimatedEndTime) {
            updateTitle = 'End time updated';
        }

        const updateElement = $(`
            <div class="p-3 border border-gray-200 rounded-lg bg-white">
                <div class="flex justify-between mb-1">
                    <div class="text-sm font-medium text-gray-900">${updateTitle}</div>
                    <div class="text-xs text-gray-500">${formatDateTime(update.createdAt)}</div>
                </div>
                <p class="text-sm text-gray-600">${update.updateInfo}</p>
                ${update.reason ? `<p class="text-xs text-gray-500 mt-1">Reason: ${update.reason}</p>` : ''}
                ${update.updatedEstimatedEndTime ? `<p class="text-xs text-gray-500 mt-1">New estimated end time: ${formatDateTime(update.updatedEstimatedEndTime)}</p>` : ''}
            </div>
        `);

        $('#outage-updates').append(updateElement);
    });
}

/**
 * Load notification statistics
 */
function loadNotificationStats(outageId) {
    // This would typically make an API call to get real notification stats
    // For now, we'll just display placeholder values
    $('#email-notification-count').text('0');
    $('#sms-notification-count').text('0');
    $('#push-notification-count').text('0');
    $('#users-affected-count').text('0');

    // In a real implementation, you would call your notification stats API
    // and update the UI with the real values
    $.ajax({
        url: `${CONFIG.API_BASE_URL}/api/admin/outages/${outageId}/notification-stats`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        success: function(response) {
            if (response && response.code === 200 && response.data) {
                const stats = response.data;
                $('#email-notification-count').text(stats.emailCount || '0');
                $('#sms-notification-count').text(stats.smsCount || '0');
                $('#push-notification-count').text(stats.pushCount || '0');
                $('#users-affected-count').text(stats.affectedUsers || '0');
            }
        },
        error: function(xhr, status, error) {
            console.error('Error loading notification stats:', error);
            // We don't need to show an error message here
            // Just leave the placeholder values
        }
    });
}

/**
 * Set up action buttons based on user permissions
 */
function setupActionButtons(outage) {
    // Hide all buttons by default
    $('#update-status-btn, #add-update-btn, #send-notifications-btn, #cancel-outage-btn, #edit-outage-btn').hide();

    // Enable buttons based on permissions
    if (canEditOutage(outage)) {
        if (outage.status === 'SCHEDULED' || outage.status === 'ONGOING') {
            $('#update-status-btn').show().off('click').on('click', function() {
                showAddUpdateModal(outage.id);
            });

            $('#add-update-btn').show().off('click').on('click', function() {
                showAddUpdateModal(outage.id, false);
            });

            $('#send-notifications-btn').show().off('click').on('click', function() {
                showSendNotificationsModal(outage.id);
            });
        }

        if (outage.status !== 'COMPLETED' && outage.status !== 'CANCELLED') {
            $('#cancel-outage-btn').show().off('click').on('click', function() {
                showCancelOutageConfirmation(outage.id);
            });
        }

        $('#edit-outage-btn').show().off('click').on('click', function() {
            $('#view-outage-modal').addClass('hidden');
            showEditOutageModal(outage.id);
        });
    }
}

/**
 * Show the add update modal
 */
function showAddUpdateModal(outageId, includeStatusChange = true) {
    const outage = outages.find(o => o.id === outageId);
    if (!outage) return;

    // Reset form
    $('#update-form')[0].reset();
    $('#update-outage-id').val(outageId);

    // Show/hide status dropdown based on parameter
    if (includeStatusChange) {
        $('#update-status').closest('.mb-4').show();

        // Set available status options based on current status
        $('#update-status').find('option:not(:first)').remove();

        if (outage.status === 'SCHEDULED') {
            $('#update-status').append('<option value="ONGOING">Ongoing</option>');
            $('#update-status').append('<option value="COMPLETED">Completed</option>');
            $('#update-status').append('<option value="CANCELLED">Cancelled</option>');
        } else if (outage.status === 'ONGOING') {
            $('#update-status').append('<option value="COMPLETED">Completed</option>');
            $('#update-status').append('<option value="CANCELLED">Cancelled</option>');
        }
    } else {
        $('#update-status').closest('.mb-4').hide();
    }

    // Initialize the date picker
    flatpickr('#update-end-time', {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        time_24hr: true,
        minDate: "today"
    });

    // Show modal
    $('#add-update-modal').removeClass('hidden');
}

/**
 * Show send notifications modal
 */
function showSendNotificationsModal(outageId) {
    // This would be implemented based on your notification system
    // For now, we'll just simulate sending notifications
    showSuccess('Notifications sent successfully');
}

/**
 * Show cancel outage confirmation
 */
function showCancelOutageConfirmation(outageId) {
    const outage = outages.find(o => o.id === outageId);
    if (!outage) return;

    // Set confirmation message
    $('#confirm-title').text('Cancel Outage');
    $('#confirm-message').text(`Are you sure you want to cancel the ${formatOutageType(outage.type)} outage in ${outage.affectedArea ? outage.affectedArea.name : 'the selected area'}? This will send cancellation notifications to all affected users.`);

    // Set icon
    $('#confirm-icon').removeClass().addClass('bx bx-x-circle text-2xl');
    $('#confirm-icon-container').removeClass().addClass('inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 mb-4');

    // Set button text
    $('#confirm-action').text('Confirm Cancel').removeClass().addClass('px-4 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500');

    // Set callback
    confirmationCallback = function() {
        cancelOutage(outageId);
    };

    // Show modal
    $('#confirm-modal').removeClass('hidden');
}

/**
 * Cancel an outage
 */
function cancelOutage(outageId) {
    // Show loading state
    const confirmButton = $('#confirm-action');
    const originalText = confirmButton.text();
    confirmButton.prop('disabled', true).html('<i class="bx bx-loader-alt bx-spin mr-2"></i> Cancelling...');

    $.ajax({
        url: `${CONFIG.API_BASE_URL}/api/admin/outages/${outageId}/cancel`,
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        success: function(response) {
            if (response && response.code === 200) {
                // Close all modals
                $('#confirm-modal').addClass('hidden');
                $('#view-outage-modal').addClass('hidden');

                // Show success message
                showSuccess('Outage cancelled successfully');

                // Refresh outages list
                loadOutages();
            } else {
                showError(response?.message || 'Failed to cancel outage');
            }
        },
        error: function(xhr, status, error) {
            console.error('Error cancelling outage:', error);
            showError('Failed to cancel outage. Please try again.');
        },
        complete: function() {
            // Restore button state
            confirmButton.prop('disabled', false).text(originalText);
        }
    });
}

/**
 * Save outage update
 */
function saveOutageUpdate() {
    const outageId = $('#update-outage-id').val();

    // Validate form
    if (!$('#update-info').val().trim()) {
        showError('Please provide update information');
        return;
    }

    // Create update data
    const updateData = {
        outageId: outageId,
        updateInfo: $('#update-info').val().trim(),
        newStatus: $('#update-status').val() || null,
        updatedEstimatedEndTime: $('#update-end-time').val() || null,
        reason: $('#update-reason').val() || null
    };

    // Show loading state
    const saveButton = $('#save-update');
    const originalText = saveButton.text();
    saveButton.prop('disabled', true).html('<i class="bx bx-loader-alt bx-spin mr-2"></i> Saving...');

    $.ajax({
        url: `${CONFIG.API_BASE_URL}/api/provider/outages/${outageId}/updates`,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify(updateData),
        success: function(response) {
            if (response && response.code === 200) {
                // Close update modal
                $('#add-update-modal').addClass('hidden');

                // Show success message
                showSuccess('Outage update added successfully');

                // Update outage data
                if (response.data) {
                    // Find and update the outage in the local array
                    const index = outages.findIndex(o => o.id == outageId);
                    if (index !== -1) {
                        outages[index] = response.data;
                    }

                    // Refresh outage details
                    showOutageDetails(outageId);
                } else {
                    // Refresh outages list if we didn't get updated data
                    loadOutages();
                }
            } else {
                showError(response?.message || 'Failed to add update');
            }
        },
        error: function(xhr, status, error) {
            console.error('Error adding outage update:', error);
            showError('Failed to add update. Please try again.');
        },
        complete: function() {
            // Restore button state
            saveButton.prop('disabled', false).text(originalText);
        }
    });
}

/**
 * Show create outage modal
 */
function showCreateOutageModal() {
    // Reset form
    $('#outage-form')[0].reset();
    $('#outage-id').val('');
    editingOutageId = null;

    // Clear map if it exists
    if (map && draw) {
        draw.deleteAll();
    }

// Reset area selection
    selectedAreaId = null;
    $('#area-select').val('');
    $('#area-preview-map').addClass('hidden');

    // Set defaults
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Set default start and end times (tomorrow)
    flatpickr('#start-time', {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        time_24hr: true,
        minDate: "today",
        defaultDate: tomorrow
    });

    flatpickr('#end-time', {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        time_24hr: true,
        minDate: "today",
        defaultDate: new Date(tomorrow.getTime() + 4 * 60 * 60 * 1000) // 4 hours after start time
    });

    // Default select area tab
    switchAreaTab('select');

    // Set modal title
    $('#modal-title').text('Create New Outage');

    // Show modal
    $('#outage-modal').removeClass('hidden');
}

/**
 * Show edit outage modal
 */
function showEditOutageModal(outageId) {
    // Get outage data
    const outage = outages.find(o => o.id === outageId);
    if (!outage) return;

    // Reset form and set outage ID
    $('#outage-form')[0].reset();
    $('#outage-id').val(outageId);
    editingOutageId = outageId;

    // Fill form with outage data
    $('#outage-type').val(outage.type);
    $('#outage-status').val(outage.status);
    $('#reason').val(outage.reason);
    $('#additional-info').val(outage.additionalInfo);

    // Set start and end times
    if (outage.startTime) {
        flatpickr('#start-time', {
            enableTime: true,
            dateFormat: "Y-m-d H:i",
            time_24hr: true,
            minDate: "today",
            defaultDate: new Date(outage.startTime)
        });
    }

    if (outage.estimatedEndTime) {
        flatpickr('#end-time', {
            enableTime: true,
            dateFormat: "Y-m-d H:i",
            time_24hr: true,
            minDate: "today",
            defaultDate: new Date(outage.estimatedEndTime)
        });
    }
    // Add this check with the other required field validations
    if (!$('#utility-provider').val()) {
        showError('Please select a utility provider');
        return false;
    }

    // Set area
    if (outage.affectedArea) {
        $('#area-select').val(outage.affectedArea.id);
        selectedAreaId = outage.affectedArea.id;

        // Show area preview if boundary available
        if (outage.affectedArea.boundaryJson) {
            $('#area-preview-map').removeClass('hidden');
            showAreaPreview(outage.affectedArea);
        } else {
            $('#area-preview-map').addClass('hidden');
        }

        // Default to select area tab
        switchAreaTab('select');
    } else if (outage.geographicalAreaJson) {
        // If there's a custom area, switch to draw tab
        switchAreaTab('draw');

        // Load GeoJSON into the map
        try {
            const geoJson = JSON.parse(outage.geographicalAreaJson);

            // Clear previous drawings
            if (draw) {
                draw.deleteAll();
            }

            // Add features to the map
            if (geoJson.features && geoJson.features.length > 0) {
                if (map && draw) {
                    // Wait for map to be fully loaded
                    if (map.loaded()) {
                        draw.add(geoJson);
                    } else {
                        map.on('load', function() {
                            draw.add(geoJson);
                        });
                    }
                }
            }

            // Set area details
            if (outage.customAreaName) {
                $('#area-name').val(outage.customAreaName);
            }

            if (outage.customAreaDistrict) {
                $('#area-district').val(outage.customAreaDistrict);
            }

            if (outage.customAreaCity) {
                $('#area-city').val(outage.customAreaCity);
            }

            if (outage.customAreaPostalCode) {
                $('#area-postal-code').val(outage.customAreaPostalCode);
            }

            // Update hidden geojson field
            $('#area-geojson').val(outage.geographicalAreaJson);
        } catch (e) {
            console.error('Error parsing GeoJSON for editing:', e);
        }
    }

    // Set notification options
    // These would typically be retrieved from the outage or notification settings
    $('#send-email').prop('checked', true);
    $('#send-sms').prop('checked', true);
    $('#send-push').prop('checked', true);
    $('#send-whatsapp').prop('checked', false);

    // Set modal title
    $('#modal-title').text('Edit Outage');

    // Show modal
    $('#outage-modal').removeClass('hidden');
}

/**
 * Hide outage modal
 */
function hideOutageModal() {
    $('#outage-modal').addClass('hidden');
}

async function saveOutage() {
    // Validate form
    if (!validateOutageForm()) {
        return;
    }

    // Show loading state - define this early to avoid reference issues
    const saveButton = $('#save-outage');
    const originalButtonText = saveButton.text();
    saveButton.prop('disabled', true).html('<i class="bx bx-loader-alt bx-spin"></i> Saving...');

    // Get form data
    const outageId = $('#outage-id').val();
    const isEditing = outageId !== '';

    // Create outage data object
    let outageData = {
        type: $('#outage-type').val(),
        status: $('#outage-status').val(),
        startTime: $('#start-time').val(),
        estimatedEndTime: $('#end-time').val(),
        reason: $('#reason').val(),
        additionalInfo: $('#additional-info').val() || null
    };

    // Add utility provider ID - ensuring it's not an empty string
    const selectedProviderId = $('#utility-provider').val();
    if (selectedProviderId && selectedProviderId !== "") {
        outageData.utilityProviderId = parseInt(selectedProviderId, 10);
    } else {
        // Use default ID if none is selected or available
        outageData.utilityProviderId = 1; // Default to ID 1 for emergencies
        console.log("Using default utility provider ID: 1");
    }

    // Add area information
    const activeTab = $('.area-tab-item.border-primary-500').attr('id');

    if (activeTab === 'select-area-tab') {
        // Using existing area
        outageData.areaId = parseInt($('#area-select').val(), 10);
        outageData.geographicalAreaJson = null;
    } else {
        // Using custom drawn area
        outageData.geographicalAreaJson = $('#area-geojson').val();

        // Add custom area details
        outageData.customAreaName = $('#area-name').val();
        outageData.customAreaDistrict = $('#area-district').val();
        outageData.customAreaCity = $('#area-city').val() || null;
        outageData.customAreaPostalCode = $('#area-postal-code').val() || null;
    }

    // Add notification settings
    outageData.sendEmail = $('#send-email').is(':checked');
    outageData.sendSMS = $('#send-sms').is(':checked');
    outageData.sendPush = $('#send-push').is(':checked');
    outageData.sendWhatsApp = $('#send-whatsapp').is(':checked');

    // For utility provider users, override with their provider ID
    if (currentRole === 'ROLE_UTILITY_PROVIDER' && currentProviderId) {
        outageData.utilityProviderId = currentProviderId;
        console.log("Setting utilityProviderId from current provider:", currentProviderId);
    }

    // Determine the API endpoint
    let endpoint, method;
    if (isEditing) {
        endpoint = `${CONFIG.API_BASE_URL}/api/admin/outages/${outageId}`;
        method = 'PUT';
    } else {
        endpoint = `${CONFIG.API_BASE_URL}/api/admin/outages`;
        method = 'POST';
    }

    // Log the data being sent
    console.log("Sending outage data:", JSON.stringify(outageData));
    console.log("Endpoint:", endpoint);

    $.ajax({
        url: endpoint,
        method: method,
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify(outageData),
        success: function(response) {
            console.log("Outage save response:", response);
            if (response && (response.code === 200 || response.code === 201)) {
                showSuccess(isEditing ? 'Outage updated successfully' : 'Outage created successfully');
                hideOutageModal();
                loadOutages();
            } else {
                showError(response?.message || 'Failed to save outage');
            }
        },
        error: function(xhr, status, error) {
            console.error('Error saving outage:', error);
            console.error('Status code:', xhr.status);
            console.error('Status text:', xhr.statusText);
            console.error('Response:', xhr.responseText);

            // More detailed error handling
            try {
                const errorObj = JSON.parse(xhr.responseText);
                showError(errorObj.message || 'Failed to save outage');
            } catch (e) {
                showError('Failed to save outage. Server error: ' + xhr.status + ' - ' + error);
            }
        },
        complete: function() {
            saveButton.prop('disabled', false).text(originalButtonText);
        }
    });
}


function fetchCurrentUserUtilityProvider() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `${CONFIG.API_BASE_URL}/api/user/profile`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            success: function(response) {
                if (response && response.code === 200 && response.data) {
                    if (response.data.role === 'UTILITY_PROVIDER' && response.data.utilityProvider) {
                        resolve(response.data.utilityProvider.id);
                    } else {
                        resolve(null);
                    }
                } else {
                    resolve(null);
                }
            },
            error: function(xhr, status, error) {
                console.error('Error fetching user utility provider:', error);
                // Don't reject - just return null
                resolve(null);
            }
        });
    });
}

function validateOutageForm() {
    // Check required fields
    if (!$('#outage-type').val()) {
        showError('Please select an outage type');
        return false;
    }

    if (!$('#outage-status').val()) {
        showError('Please select an outage status');
        return false;
    }

    if (!$('#start-time').val()) {
        showError('Please select a start time');
        return false;
    }

    if (!$('#end-time').val()) {
        showError('Please select an estimated end time');
        return false;
    }

    if (!$('#reason').val()) {
        showError('Please provide a reason for the outage');
        return false;
    }

    // Only check utility provider if they were successfully loaded
    if (utilityProvidersLoaded && !$('#utility-provider').val()) {
        showError('Please select a utility provider');
        return false;
    }

    // Check dates are valid
    const startTime = new Date($('#start-time').val());
    const endTime = new Date($('#end-time').val());

    if (isNaN(startTime.getTime())) {
        showError('Invalid start time format');
        return false;
    }

    if (isNaN(endTime.getTime())) {
        showError('Invalid end time format');
        return false;
    }

    if (endTime <= startTime) {
        showError('End time must be after start time');
        return false;
    }

    // Check area is selected or drawn
    const activeTab = $('.area-tab-item.border-primary-500').attr('id');

    if (activeTab === 'select-area-tab') {
        if (!$('#area-select').val()) {
            showError('Please select an area');
            return false;
        }
    } else {
        if (!$('#area-geojson').val()) {
            showError('Please draw an area on the map');
            return false;
        }

        if (!$('#area-name').val()) {
            showError('Please enter a name for the custom area');
            return false;
        }

        if (!$('#area-district').val()) {
            showError('Please select a district for the custom area');
            return false;
        }
    }

    return true;
}

function populateUtilityProviderDropdown() {
    // Clear existing options except for the default
    $('#utility-provider').find('option:not(:first)').remove();

    // Add utility providers to dropdown
    utilityProviders.forEach(provider => {
        const option = `<option value="${provider.id}">${provider.name} (${provider.type})</option>`;
        $('#utility-provider').append(option);
    });
}


/**
 * Update pagination controls
 */
function updatePagination() {
    const totalItems = filteredOutages.length;
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
    renderOutageTable();
}

/**
 * Show empty state message
 */
function showEmptyState(title, message) {
    $('#empty-state h3').text(title);
    $('#empty-state-message').text(message);
    $('#empty-state').removeClass('hidden');
    $('#pagination-container').hide();
}

/**
 * Setup modal behavior
 */
function setupModals() {
    // Close modals when clicking outside
    $('.modal').on('click', function(e) {
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
 * Format outage type for display
 */
function formatOutageType(type) {
    if (!type) return 'Unknown';

    return type.charAt(0) + type.slice(1).toLowerCase();
}

/**
 * Get outage type badge CSS class
 */
function getOutageTypeBadgeClass(type) {
    switch(type) {
        case 'ELECTRICITY':
            return 'electricity';
        case 'WATER':
            return 'water';
        case 'GAS':
            return 'gas';
        default:
            return '';
    }
}

/**
 * Format outage status for display
 */
function formatOutageStatus(status) {
    if (!status) return 'Unknown';

    return status.charAt(0) + status.slice(1).toLowerCase();
}

/**
 * Get outage status badge CSS class
 */
function getOutageStatusBadgeClass(status) {
    switch(status) {
        case 'SCHEDULED':
            return 'scheduled';
        case 'ONGOING':
            return 'ongoing';
        case 'COMPLETED':
            return 'completed';
        case 'CANCELLED':
            return 'cancelled';
        default:
            return '';
    }
}

/**
 * Format date and time for display
 */
function formatDateTime(dateString) {
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
 * Calculate duration between two dates
 */
function calculateDuration(startDateString, endDateString) {
    if (!startDateString || !endDateString) return 'N/A';

    const startDate = new Date(startDateString);
    const endDate = new Date(endDateString);

    // Check if dates are valid
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 'N/A';

    // Calculate duration in hours
    const durationMs = endDate - startDate;
    const durationHours = durationMs / (1000 * 60 * 60);

    if (durationHours < 24) {
        // Less than a day
        return `${Math.round(durationHours * 10) / 10} hours`;
    } else {
        // More than a day
        const days = Math.floor(durationHours / 24);
        const hours = Math.round((durationHours % 24) * 10) / 10;

        if (hours > 0) {
            return `${days} day${days > 1 ? 's' : ''} ${hours} hour${hours !== 1 ? 's' : ''}`;
        } else {
            return `${days} day${days > 1 ? 's' : ''}`;
        }
    }
}