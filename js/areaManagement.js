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
let areas = [];
let filteredAreas = [];
let currentPage = 1;
const pageSize = 10;
let editingAreaId = null;
let confirmationCallback = null;
let map = null;
let viewMap = null;
let draw = null;
let providers = [];
let currentAreaId = null;

// DOM ready
$(document).ready(function() {
    // Initialize the UI
    initAreaManagement();

    // Set up event listeners
    setupEventListeners();

    // Initialize Mapbox GL
    mapboxgl.accessToken = CONFIG.MAPBOX_TOKEN;
});

/**
 * Initialize the area management interface
 */
function initAreaManagement() {
    // Load areas and utility providers
    loadAreas();
    loadUtilityProviders();

    // Initialize mapbox
    mapboxgl.accessToken = CONFIG.MAPBOX_TOKEN;

    // Set up UI components
    setupModals();
}

function loadAreas(callback) {
    // Show loading indicator
    $('#loading-row').show();
    $('#empty-state').hide();

    // Call the API
    $.ajax({
        url: `${CONFIG.API_BASE_URL}/api/public/areas`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        success: function(response) {
            // Process the response
            if (response && response.code === 200 && response.data) {
                console.log('Areas loaded from API:', response.data);

                // Ensure areas have utility providers array
                areas = response.data.map(area => {
                    if (!area.utilityProviders) {
                        area.utilityProviders = [];
                    }
                    return area;
                });

                // Populate district and province filters
                populateFilters();

                // Apply filters and display areas
                applyFilters();

                // Execute callback if provided
                if (typeof callback === 'function') {
                    callback();
                }
            } else {
                // Show empty state
                showEmptyState("No areas found", "There are no areas in the system.");
            }
        },
        error: function(xhr, status, error) {
            console.error('Error loading areas:', error);
            showError('Failed to load areas. Please try again.');
            showEmptyState("Error loading areas", "Could not load areas from the server.");
        },
        complete: function() {
            // Hide loading indicator
            $('#loading-row').hide();
        }
    });
}


function loadUtilityProviders() {
    $.ajax({
        url: `${CONFIG.API_BASE_URL}/api/provider/all`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        success: function(response) {
            if (response && response.code === 200 && response.data) {
                providers = response.data;
                console.log('Utility providers loaded successfully:', providers.length);
            } else {
                console.error('No providers found or invalid response');
            }
        },
        error: function(xhr, status, error) {
            console.error('Error loading utility providers:', error);
            // Don't throw an error here, just log it
        }
    });
}

function getAreaWithProviders(areaId) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `${CONFIG.API_BASE_URL}/api/public/areas/${areaId}/utility-providers`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            success: function(response) {
                if (response && response.code === 200) {
                    console.log(`Utility providers for area ${areaId}:`, response.data);
                    resolve(response.data);
                } else {
                    console.error('Failed to get providers for area:', response);
                    resolve([]);
                }
            },
            error: function(xhr, status, error) {
                console.error(`Error getting providers for area ${areaId}:`, error);
                resolve([]);
            }
        });
    });
}


/**
 * Populate district and province filter dropdowns
 */
function populateFilters() {
    const districts = new Set();
    const provinces = new Set();
    const cities = new Set();

    // Extract unique districts, provinces, and cities
    areas.forEach(area => {
        if (area.district) districts.add(area.district);
        if (area.province) provinces.add(area.province);
        if (area.city) cities.add(area.city);
    });

    // Populate district filter
    const districtFilter = $('#filter-district');
    districtFilter.find('option:not(:first)').remove();

    Array.from(districts).sort().forEach(district => {
        districtFilter.append(`<option value="${district}">${district}</option>`);
    });

    // Populate province filter
    const provinceFilter = $('#filter-province');
    provinceFilter.find('option:not(:first)').remove();

    Array.from(provinces).sort().forEach(province => {
        provinceFilter.append(`<option value="${province}">${province}</option>`);
    });

    // Populate city filter
    const cityFilter = $('#filter-city');
    cityFilter.find('option:not(:first)').remove();

    Array.from(cities).sort().forEach(city => {
        cityFilter.append(`<option value="${city}">${city}</option>`);
    });
}

/**
 * Apply filters to the area list
 */
function applyFilters() {
    const searchText = $('#search-areas').val().toLowerCase();
    const districtFilter = $('#filter-district').val();
    const provinceFilter = $('#filter-province').val();
    const cityFilter = $('#filter-city').val();

    // Filter areas
    filteredAreas = areas.filter(area => {
        // Search text filter
        const matchesSearch =
            !searchText ||
            (area.name && area.name.toLowerCase().includes(searchText)) ||
            (area.district && area.district.toLowerCase().includes(searchText)) ||
            (area.province && area.province.toLowerCase().includes(searchText)) ||
            (area.city && area.city.toLowerCase().includes(searchText)) ||
            (area.postalCode && area.postalCode.toLowerCase().includes(searchText));

        // District filter
        const matchesDistrict = !districtFilter || (area.district === districtFilter);

        // Province filter
        const matchesProvince = !provinceFilter || (area.province === provinceFilter);

        // City filter
        const matchesCity = !cityFilter || (area.city === cityFilter);

        return matchesSearch && matchesDistrict && matchesProvince && matchesCity;
    });

    // Reset to first page
    currentPage = 1;

    // Render the area table
    renderAreaTable();
}

/**
 * Reset all filters
 */
function resetFilters() {
    $('#search-areas').val('');
    $('#filter-district').val('');
    $('#filter-province').val('');
    $('#filter-city').val('');

    applyFilters();
}

function renderAreaTable() {
    const tableBody = $('#areas-table-body');

    // Clear existing table content (except loading row)
    tableBody.find('tr:not(#loading-row)').remove();

    // Check if we have areas to display
    if (filteredAreas.length === 0) {
        showEmptyState("No areas found", "No areas match your search criteria.");
        return;
    }

    // Hide empty state
    $('#empty-state').removeClass('hidden');

    // Show pagination
    $('#pagination-container').show();

    // Calculate pagination
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredAreas.length);
    const pageAreas = filteredAreas.slice(startIndex, endIndex);

    // Log the areas being rendered for debugging
    console.log('Rendering areas:', pageAreas);

    // Render each area
    pageAreas.forEach(area => {
        // Format utility providers
        let providerHtml = 'None';

        // Debug log for this specific area's providers
        console.log(`Rendering area ${area.id}: ${area.name} with providers:`, area.utilityProviders);

        if (area.utilityProviders && area.utilityProviders.length > 0) {
            providerHtml = area.utilityProviders.map(provider => {
                const typeClass = getProviderTypeClass(provider.type);
                return `<span class="provider-badge ${typeClass}">${provider.name}</span>`;
            }).join('');
        }

        const row = $(`
            <tr>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
                            <i class="bx bx-map"></i>
                        </div>
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">${area.name}</div>
                            <div class="text-sm text-gray-500">${area.postalCode || 'N/A'}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${area.city || 'N/A'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${area.district}</div>
                    <div class="text-sm text-gray-500">${area.province}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="flex flex-wrap">
                        ${providerHtml}
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div class="flex space-x-2 justify-end">
                        <button class="view-area-btn text-blue-600 hover:text-blue-900" data-area-id="${area.id}" title="View Details">
                            <i class='bx bx-show'></i>
                        </button>
                        <button class="edit-area-btn text-indigo-600 hover:text-indigo-900" data-area-id="${area.id}" title="Edit Area">
                            <i class='bx bx-edit'></i>
                        </button>
                        <button class="delete-area-btn text-red-600 hover:text-red-900" data-area-id="${area.id}" title="Delete Area">
                            <i class='bx bx-trash'></i>
                        </button>
                    </div>
                </td>
            </tr>
        `);

        // Add event listeners
        row.find('.view-area-btn').on('click', function() {
            showAreaDetails(area.id);
        });

        row.find('.edit-area-btn').on('click', function() {
            showEditAreaModal(area.id);
        });

        row.find('.delete-area-btn').on('click', function() {
            showDeleteConfirmation(area.id);
        });

        tableBody.append(row);
    });

    // Update pagination
    updatePagination();
}

function handleMapSelection(coordinates) {
    // Show loading state
    const loadingIndicator = $('<div class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10"><div class="loading-spinner"></div></div>');
    $('#map').parent().css('position', 'relative').append(loadingIndicator);

    // Use Mapbox Geocoding API to reverse geocode the coordinates
    const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${coordinates[0]},${coordinates[1]}.json?access_token=${CONFIG.MAPBOX_TOKEN}`;

    $.ajax({
        url: geocodingUrl,
        method: 'GET',
        success: function(response) {
            if (response && response.features && response.features.length > 0) {
                // Extract place information
                let name = '';
                let city = '';
                let district = '';
                let province = '';
                let postalCode = '';

                // Find the most appropriate name for the area
                const placeFeature = response.features.find(f => f.place_type.includes('place'));
                const neighborhoodFeature = response.features.find(f => f.place_type.includes('neighborhood'));

                if (neighborhoodFeature) {
                    name = neighborhoodFeature.text;
                } else if (placeFeature) {
                    name = placeFeature.text;
                } else if (response.features[0]) {
                    name = response.features[0].text;
                }

                // Parse all features for relevant information
                response.features.forEach(feature => {
                    if (feature.place_type.includes('place')) {
                        city = city || feature.text;
                    } else if (feature.place_type.includes('district')) {
                        district = district || feature.text;
                    } else if (feature.place_type.includes('region')) {
                        province = province || feature.text;
                    } else if (feature.place_type.includes('postcode')) {
                        postalCode = postalCode || feature.text;
                    }

                    // Also check context for additional information
                    if (feature.context) {
                        feature.context.forEach(context => {
                            const id = context.id.split('.')[0];
                            if (id === 'place') {
                                city = city || context.text;
                            } else if (id === 'district') {
                                district = district || context.text;
                            } else if (id === 'region') {
                                province = province || context.text;
                            } else if (id === 'postcode') {
                                postalCode = postalCode || context.text;
                            }
                        });
                    }
                });

                // Fill form fields if they're empty or overwrite based on user preference
                if (!$('#area-name').val() || confirm('Update area name with: ' + name + '?')) {
                    $('#area-name').val(name);
                }

                $('#city').val(city);
                $('#postal-code').val(postalCode);
                $('#district').val(district);
                $('#province').val(province);

                // If some fields are still empty, try to fetch more details
                if (!district || !province) {
                    fetchAdditionalDetails(coordinates);
                }
            }
        },
        error: function(xhr, status, error) {
            console.error('Error reverse geocoding:', error);
            showError('Failed to get location details. Please fill the form manually.');
        },
        complete: function() {
            // Remove loading indicator
            loadingIndicator.remove();
        }
    });
}

/**
 * Initialize the province and district dropdowns
 */
function initProvinceDistrictDropdowns() {
    // Define the districts for each province
    const districtsByProvince = {
        'Central': ['Kandy', 'Matale', 'Nuwara Eliya'],
        'Eastern': ['Ampara', 'Batticaloa', 'Trincomalee'],
        'North Central': ['Anuradhapura', 'Polonnaruwa'],
        'Northern': ['Jaffna', 'Kilinochchi', 'Mannar', 'Mullaitivu', 'Vavuniya'],
        'North Western': ['Kurunegala', 'Puttalam'],
        'Sabaragamuwa': ['Kegalle', 'Ratnapura'],
        'Southern': ['Galle', 'Hambantota', 'Matara'],
        'Uva': ['Badulla', 'Monaragala'],
        'Western': ['Colombo', 'Gampaha', 'Kalutara']
    };

    // Handle province change
    $('#province').on('change', function() {
        const province = $(this).val();
        const districtDropdown = $('#district');

        // Clear current options
        districtDropdown.empty();

        // Add default option
        districtDropdown.append('<option value="">Select District</option>');

        // If a province is selected, add its districts
        if (province && districtsByProvince[province]) {
            districtsByProvince[province].forEach(district => {
                districtDropdown.append(`<option value="${district}">${district}</option>`);
            });
        }
    });
}

/**
 * Get CSS class for provider type
 */
function getProviderTypeClass(type) {
    switch (type) {
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
 * Show empty state message
 */
function showEmptyState(title, message) {
    $('#empty-state h3').text(title);
    $('#empty-state-message').text(message);
    $('#empty-state').removeClass('hidden');
    $('#pagination-container').hide();
}

/**
 * Update pagination controls
 */
function updatePagination() {
    const totalItems = filteredAreas.length;
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
    renderAreaTable();
}

/**
 * Initialize map for adding/editing area
 */
function initMap() {
    if (map) {
        map.remove();
    }

    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: CONFIG.DEFAULT_MAP_CENTER,
        zoom: CONFIG.DEFAULT_MAP_ZOOM
    });

    // Add navigation control
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add geocoder control for searching locations
    const geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl,
        countries: 'lk', // Limit to Sri Lanka
        placeholder: 'Search for places',
        marker: false
    });

    map.addControl(geocoder, 'top-left');

    // Handle geocoder result
    geocoder.on('result', function(e) {
        // Get place data
        const place = e.result;
        const coordinates = place.center; // [longitude, latitude]

        // Extract place information
        let city = '';
        let district = '';
        let province = '';
        let postalCode = '';

        // Extract place name
        if (place.place_name) {
            const parts = place.place_name.split(',');
            if (parts.length > 0) {
                // First part is usually the name of the place
                if (!$('#area-name').val()) {
                    $('#area-name').val(parts[0].trim());
                }
            }
        }

        // Extract context information
        if (place.context) {
            place.context.forEach(context => {
                const id = context.id.split('.')[0];
                if (id === 'place') {
                    city = context.text;
                } else if (id === 'district') {
                    district = context.text;
                } else if (id === 'region') {
                    province = context.text;
                } else if (id === 'postcode') {
                    postalCode = context.text;
                }
            });
        }

        // Fill form fields if they're empty
        if (!$('#city').val() && city) {
            $('#city').val(city);
        }
        if (!$('#district').val() && district) {
            $('#district').val(district);
        }
        if (!$('#province').val() && province) {
            $('#province').val(province);
        }
        if (!$('#postal-code').val() && postalCode) {
            $('#postal-code').val(postalCode);
        }

        // Add marker
        new mapboxgl.Marker()
            .setLngLat(coordinates)
            .addTo(map);

        // Draw a circle around the selected place
        // First, clear any existing drawings
        if (draw) {
            draw.deleteAll();
        }

        // Create a circle feature
        const center = turf.point(coordinates);
        const radius = 1; // 1 km radius
        const options = {
            steps: 64,
            units: 'kilometers'
        };
        const circle = turf.circle(center, radius, options);

        // Add circle to draw
        draw.add(circle);

        // Update boundary JSON field
        $('#area-boundary-json').val(JSON.stringify(circle.geometry));
    });

    // Add drawing tools
    draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
            polygon: true,
            trash: true
        }
    });
    map.addControl(draw);

    // Listen for draw events
    map.on('draw.create', updateAreaBoundary);
    map.on('draw.update', updateAreaBoundary);
    map.on('draw.delete', function() {
        $('#area-boundary-json').val('');
    });
}

/**
 * Update area boundary when drawing changes
 */
function updateAreaBoundary() {
    const data = draw.getAll();

    if (data.features.length > 0) {
        // Get the first polygon
        const polygon = data.features[0];

        // Store GeoJSON in hidden field
        $('#area-boundary-json').val(JSON.stringify(polygon.geometry));
    } else {
        $('#area-boundary-json').val('');
    }
}

/**
 * Initialize view map for displaying area
 */
function initViewMap(areaId) {
    if (viewMap) {
        viewMap.remove();
    }

    viewMap = new mapboxgl.Map({
        container: 'view-map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: CONFIG.DEFAULT_MAP_CENTER,
        zoom: CONFIG.DEFAULT_MAP_ZOOM
    });

    // Add navigation control
    viewMap.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Load area boundary if available
    const area = areas.find(a => a.id === areaId);
    if (area && area.boundaryJson) {
        viewMap.on('load', function() {
            try {
                const boundary = JSON.parse(area.boundaryJson);

                viewMap.addSource('area-boundary', {
                    type: 'geojson',
                    data: {
                        type: 'Feature',
                        geometry: boundary
                    }
                });

                // Add fill layer
                viewMap.addLayer({
                    id: 'area-fill',
                    type: 'fill',
                    source: 'area-boundary',
                    paint: {
                        'fill-color': '#4338ca',
                        'fill-opacity': 0.2
                    }
                });

                // Add outline layer
                viewMap.addLayer({
                    id: 'area-outline',
                    type: 'line',
                    source: 'area-boundary',
                    paint: {
                        'line-color': '#4338ca',
                        'line-width': 2
                    }
                });

                // Fit map to boundary
                if (boundary.coordinates && boundary.coordinates[0] && boundary.coordinates[0].length > 0) {
                    const bounds = boundary.coordinates[0].reduce((bounds, coord) => {
                        return bounds.extend(coord);
                    }, new mapboxgl.LngLatBounds(boundary.coordinates[0][0], boundary.coordinates[0][0]));

                    viewMap.fitBounds(bounds, {
                        padding: 50
                    });
                }
            } catch (e) {
                console.error('Error parsing boundary JSON:', e);
            }
        });
    }
}

/**
 * Show add area modal
 */
function showAddAreaModal() {
    // Reset form
    $('#area-form')[0].reset();
    $('#area-id').val('');
    $('#area-boundary-json').val('');
    editingAreaId = null;

    // Hide providers section
    $('#no-providers').show();
    $('#providers-container').find('.provider-item').remove();

    // Set modal title
    $('#modal-title').text('Add New Area');

    // Initialize map
    setTimeout(() => {
        initMap();
    }, 100);

    // Show modal
    $('#area-modal').removeClass('hidden');
}

function showEditAreaModal(areaId) {
    // Get area data
    const area = areas.find(a => a.id === areaId);
    if (!area) return;

    // Reset form and set area ID
    $('#area-form')[0].reset();
    $('#area-id').val(areaId);
    editingAreaId = areaId;

    // Fill form with area data
    $('#area-name').val(area.name);
    $('#city').val(area.city || '');
    $('#postal-code').val(area.postalCode || '');

    // Set province first - make sure it's properly selected
    if (area.province) {
        $('#province').val(area.province);

        // Trigger change to load districts
        $('#province').trigger('change');

        // Then set district after districts are loaded
        setTimeout(() => {
            if (area.district) {
                $('#district').val(area.district);
            }
        }, 300); // Increased timeout to ensure districts load
    }

    $('#area-boundary-json').val(area.boundaryJson || '');

    // Display utility providers
    renderProvidersInForm(area.utilityProviders || []);

    // Set modal title
    $('#modal-title').text('Edit Area');

    // Initialize map
    setTimeout(() => {
        initMap();

        // Draw existing boundary if available
        if (area.boundaryJson) {
            try {
                const boundary = JSON.parse(area.boundaryJson);

                map.on('load', function() {
                    const feature = {
                        type: 'Feature',
                        properties: {},
                        geometry: boundary
                    };

                    draw.add(feature);

                    // Fit map to boundary
                    if (boundary.coordinates && boundary.coordinates[0] && boundary.coordinates[0].length > 0) {
                        const bounds = boundary.coordinates[0].reduce((bounds, coord) => {
                            return bounds.extend(coord);
                        }, new mapboxgl.LngLatBounds(boundary.coordinates[0][0], boundary.coordinates[0][0]));

                        map.fitBounds(bounds, {
                            padding: 50
                        });
                    }
                });
            } catch (e) {
                console.error('Error rendering existing boundary:', e);
            }
        }
    }, 100);

    // Show modal
    $('#area-modal').removeClass('hidden');
}

function showAreaDetails(areaId) {
    // Get area data
    const area = areas.find(a => a.id === areaId);
    if (!area) return;

    // Store current area ID for adding providers
    currentAreaId = areaId;

    // Fill area details
    $('#view-area-name').text(area.name);
    $('#view-city').text(area.city || 'N/A');
    $('#view-postal-code').text(area.postalCode || 'N/A');
    $('#view-district').text(area.district);
    $('#view-province').text(area.province);

    // First load up-to-date providers for this area
    getUpToDateAreaProviders(areaId)
        .then(providers => {
            console.log(`Got ${providers.length} providers for area ${areaId}:`, providers);

            // Update the providers in our local data
            const areaIndex = areas.findIndex(a => a.id === areaId);
            if (areaIndex !== -1) {
                areas[areaIndex].utilityProviders = providers;

                // Also update in filtered areas if needed
                const filteredIndex = filteredAreas.findIndex(a => a.id === areaId);
                if (filteredIndex !== -1) {
                    filteredAreas[filteredIndex].utilityProviders = providers;
                }
            }

            // Display utility providers with the latest data
            renderProvidersInView(providers);

            // Initialize map
            setTimeout(() => {
                initViewMap(areaId);
            }, 100);
        })
        .catch(error => {
            console.error('Error fetching providers:', error);
            // Fall back to using the providers we already have
            renderProvidersInView(area.utilityProviders || []);

            // Initialize map
            setTimeout(() => {
                initViewMap(areaId);
            }, 100);
        });

    // Set up action buttons
    $('#delete-area-btn').off('click').on('click', function() {
        $('#view-area-modal').addClass('hidden');
        showDeleteConfirmation(areaId);
    });

    $('#edit-area-btn').off('click').on('click', function() {
        $('#view-area-modal').addClass('hidden');
        showEditAreaModal(areaId);
    });

    // Show modal
    $('#view-area-modal').removeClass('hidden');
}

function getUpToDateAreaProviders(areaId) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `${CONFIG.API_BASE_URL}/api/public/areas/${areaId}/utility-providers`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            success: function(response) {
                if (response && response.code === 200) {
                    console.log(`Retrieved ${response.data.length} providers for area ${areaId}:`, response.data);
                    resolve(response.data);
                } else {
                    console.error('Failed to get utility providers:', response);
                    resolve([]);
                }
            },
            error: function(xhr, status, error) {
                console.error(`Error getting utility providers for area ${areaId}:`, error);
                reject(error);
            }
        });
    });
}

/**
 * Render providers in form
 */
function renderProvidersInForm(providers) {
    const container = $('#providers-container');
    container.find('.provider-item').remove();

    if (providers.length === 0) {
        $('#no-providers').show();
        return;
    }

    $('#no-providers').hide();

    providers.forEach(provider => {
        const typeClass = getProviderTypeClass(provider.type);

        const item = $(`
            <div class="provider-item flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200 mb-2">
                <div>
                    <span class="provider-badge ${typeClass}">${provider.type}</span>
                    <span class="font-medium">${provider.name}</span>
                </div>
                <button type="button" class="remove-provider-btn text-red-600 hover:text-red-800" data-provider-id="${provider.id}">
                    <i class='bx bx-x-circle'></i>
                </button>
            </div>
        `);

        item.find('.remove-provider-btn').on('click', function() {
            const providerId = $(this).data('provider-id');
            showRemoveProviderConfirmation(providerId);
        });

        container.append(item);
    });
}

/**
 * Render providers in view modal
 */
function renderProvidersInView(providers) {
    const container = $('#view-providers-container');
    container.empty();

    if (providers.length === 0) {
        container.append(`
            <p id="view-no-providers" class="text-sm text-gray-500">
                No utility providers assigned to this area.
            </p>
        `);
        return;
    }

    providers.forEach(provider => {
        const typeClass = getProviderTypeClass(provider.type);

        const item = $(`
            <div class="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200 mb-2">
                <div>
                    <span class="provider-badge ${typeClass}">${provider.type}</span>
                    <span class="font-medium">${provider.name}</span>
                </div>
                <button type="button" class="remove-provider-btn text-red-600 hover:text-red-800" data-provider-id="${provider.id}">
                    <i class='bx bx-trash'></i>
                </button>
            </div>
        `);

        item.find('.remove-provider-btn').on('click', function() {
            const providerId = $(this).data('provider-id');
            showRemoveProviderConfirmation(providerId);
        });

        container.append(item);
    });
}

/**
 * Show provider modal
 */
function showProviderModal() {
    // Populate provider select
    const select = $('#provider-select');
    select.empty();
    select.append('<option value="">Select a utility provider</option>');

    // Filter out providers already linked to this area
    const area = areas.find(a => a.id === currentAreaId);
    const areaProviderIds = area?.utilityProviders?.map(p => p.id) || [];

    const availableProviders = providers.filter(p => !areaProviderIds.includes(p.id));

    availableProviders.forEach(provider => {
        select.append(`<option value="${provider.id}">${provider.name} (${provider.type})</option>`);
    });

    // Show modal
    $('#provider-modal').removeClass('hidden');
}

function addProviderToArea() {
    const providerId = $('#provider-select').val();

    if (!providerId) {
        showError('Please select a utility provider');
        return;
    }

    // Show loading state
    const addButton = $('#add-provider');
    const originalText = addButton.text();
    addButton.prop('disabled', true).html('<i class="bx bx-loader-alt bx-spin"></i> Adding...');

    $.ajax({
        url: `${CONFIG.API_BASE_URL}/api/admin/areas/${currentAreaId}/utility-providers`,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        data: {
            providerId: providerId
        },
        success: function(response) {
            if (response && response.code === 200) {
                showSuccess('Utility provider added successfully');
                console.log('Provider added response:', response);

                // Close provider modal
                $('#provider-modal').addClass('hidden');

                // Get fresh providers data for the area
                getUpToDateAreaProviders(currentAreaId)
                    .then(providers => {
                        console.log(`After adding, got ${providers.length} providers for area ${currentAreaId}:`, providers);

                        // Update local data
                        const areaIndex = areas.findIndex(a => a.id === currentAreaId);
                        if (areaIndex !== -1) {
                            areas[areaIndex].utilityProviders = providers;

                            // Update filtered areas as well
                            const filteredIndex = filteredAreas.findIndex(a => a.id === currentAreaId);
                            if (filteredIndex !== -1) {
                                filteredAreas[filteredIndex].utilityProviders = providers;
                            }
                        }

                        // Refresh the area details view
                        renderProvidersInView(providers);

                        // Refresh the table to show updated data
                        renderAreaTable();
                    })
                    .catch(error => {
                        console.error('Error fetching updated providers:', error);
                        // Refresh the page as a fallback
                        window.location.reload();
                    });
            } else {
                showError(response?.message || 'Failed to add utility provider');
            }
        },
        error: function(xhr, status, error) {
            console.error('Error adding utility provider:', error);
            showError('Failed to add utility provider. Please try again.');
        },
        complete: function() {
            // Restore button state
            addButton.prop('disabled', false).text(originalText);
        }
    });
}




/**
 * Show confirmation for removing provider
 */
function showRemoveProviderConfirmation(providerId) {
    const provider = providers.find(p => p.id === providerId);
    if (!provider) return;

    // Set confirmation message
    $('#confirm-title').text('Remove Utility Provider');
    $('#confirm-message').text(`Are you sure you want to remove ${provider.name} from this area?`);

    // Set icon
    $('#confirm-icon').removeClass().addClass('bx bx-unlink text-2xl');
    $('#confirm-icon-container').removeClass().addClass('inline-flex items-center justify-center w-12 h-12 rounded-full bg-orange-100 text-orange-600 mb-4');

    // Set button text
    $('#confirm-action').text('Remove').removeClass().addClass('px-4 py-2 bg-orange-600 text-white rounded-md font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500');

    // Set callback
    confirmationCallback = function() {
        removeProviderFromArea(providerId);
    };

    // Show modal
    $('#confirm-modal').removeClass('hidden');
}

function removeProviderFromArea(providerId) {
    // Show loading state
    const confirmButton = $('#confirm-action');
    const originalText = confirmButton.text();
    confirmButton.prop('disabled', true).html('<i class="bx bx-loader-alt bx-spin"></i> Removing...');

    $.ajax({
        url: `${CONFIG.API_BASE_URL}/api/admin/areas/${currentAreaId}/utility-providers/${providerId}`,
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        success: function(response) {
            if (response && response.code === 200) {
                showSuccess('Utility provider removed successfully');
                console.log('Provider removed response:', response);

                // Close confirmation modal
                $('#confirm-modal').addClass('hidden');

                // Get fresh providers data
                getUpToDateAreaProviders(currentAreaId)
                    .then(providers => {
                        // Update local data
                        const areaIndex = areas.findIndex(a => a.id === currentAreaId);
                        if (areaIndex !== -1) {
                            areas[areaIndex].utilityProviders = providers;

                            // Update filtered areas as well
                            const filteredIndex = filteredAreas.findIndex(a => a.id === currentAreaId);
                            if (filteredIndex !== -1) {
                                filteredAreas[filteredIndex].utilityProviders = providers;
                            }
                        }

                        // Refresh the area details view
                        renderProvidersInView(providers);

                        // Refresh the table
                        renderAreaTable();
                    })
                    .catch(error => {
                        console.error('Error fetching updated providers after removal:', error);
                        // Refresh the page as a fallback
                        window.location.reload();
                    });
            } else {
                showError(response?.message || 'Failed to remove utility provider');
            }
        },
        error: function(xhr, status, error) {
            console.error('Error removing utility provider:', error);
            showError('Failed to remove utility provider. Please try again.');
        },
        complete: function() {
            // Restore button state
            confirmButton.prop('disabled', false).text(originalText);
        }
    });
}


/**
 * Show delete confirmation
 */
function showDeleteConfirmation(areaId) {
    const area = areas.find(a => a.id === areaId);
    if (!area) return;

    // Set confirmation message
    $('#confirm-title').text('Delete Area');
    $('#confirm-message').text(`Are you sure you want to delete ${area.name}? This action cannot be undone.`);

    // Set icon
    $('#confirm-icon').removeClass().addClass('bx bx-trash text-2xl');
    $('#confirm-icon-container').removeClass().addClass('inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 mb-4');

    // Set button text
    $('#confirm-action').text('Delete').removeClass().addClass('px-4 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500');

    // Set callback
    confirmationCallback = function() {
        deleteArea(areaId);
    };

    // Show modal
    $('#confirm-modal').removeClass('hidden');
}

/**
 * Delete an area
 */
function deleteArea(areaId) {
    // Show loading state
    const confirmButton = $('#confirm-action');
    const originalText = confirmButton.text();
    confirmButton.prop('disabled', true).html('<i class="bx bx-loader-alt bx-spin"></i> Deleting...');

    $.ajax({
        url: `${CONFIG.API_BASE_URL}/api/admin/areas/${areaId}`,
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        success: function(response) {
            if (response && response.code === 200) {
                showSuccess('Area deleted successfully');

                // Remove area from local array
                areas = areas.filter(a => a.id !== areaId);

                // Close confirmation modal
                $('#confirm-modal').addClass('hidden');

                // Reload the area list
                applyFilters();
            } else {
                showError(response?.message || 'Failed to delete area');
            }
        },
        error: function(xhr, status, error) {
            console.error('Error deleting area:', error);
            showError('Failed to delete area. Please try again.');
        },
        complete: function() {
            // Restore button state
            confirmButton.prop('disabled', false).text(originalText);
        }
    });
}

/**
 * Save area from form data
 */
function saveArea() {
    // Get form data
    const areaId = $('#area-id').val();
    const isEditing = areaId !== '';
    const areaName = $('#area-name').val();
    const city = $('#city').val();
    const postalCode = $('#postal-code').val();
    const district = $('#district').val();
    const province = $('#province').val();
    const boundaryJson = $('#area-boundary-json').val();

    // Validate boundary
    if (!boundaryJson) {
        showError('Please draw the area boundary on the map or use postal code lookup');
        return;
    }

    // Prepare area data
    const areaData = {
        name: areaName,
        city: city,
        postalCode: postalCode,
        district: district,
        province: province,
        boundaryJson: boundaryJson
    };

    // If editing, add ID
    if (isEditing) {
        areaData.id = parseInt(areaId);
    }

    // Show loading state
    const saveButton = $('#save-area');
    const originalText = saveButton.text();
    saveButton.prop('disabled', true).html('<i class="bx bx-loader-alt bx-spin"></i> Saving...');

    // Determine the API endpoint based on whether we're editing or creating
    const endpoint = isEditing
        ? `${CONFIG.API_BASE_URL}/api/admin/areas/${areaId}`
        : `${CONFIG.API_BASE_URL}/api/admin/areas`;

    const method = isEditing ? 'PUT' : 'POST';

    // Save area
    $.ajax({
        url: endpoint,
        method: method,
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify(areaData),
        success: function(response) {
            if (response && (response.code === 200 || response.code === 201)) {
                showSuccess(isEditing ? 'Area updated successfully' : 'Area created successfully');

                // Reload areas and hide modal
                loadAreas();
                hideAreaModal();
            } else {
                showError(response?.message || 'Failed to save area');
            }
        },
        error: function(xhr, status, error) {
            console.error('Error saving area:', error);
            showError('Failed to save area. Please try again.');
        },
        complete: function() {
            // Restore button state
            saveButton.prop('disabled', false).text(originalText);
        }
    });
}

/**
 * Hide area modal
 */
function hideAreaModal() {
    $('#area-modal').addClass('hidden');

    // Clean up map
    if (map) {
        map.remove();
        map = null;
    }

    if (draw) {
        draw = null;
    }
}

/**
 * Setup modal behavior
 */
function setupModals() {
    // Close modals when clicking outside
    $('.modal').on('click', function(e) {
        if (e.target === this) {
            $(this).addClass('hidden');

            // Clean up maps if necessary
            if ($(this).attr('id') === 'area-modal' && map) {
                map.remove();
                map = null;
            }

            if ($(this).attr('id') === 'view-area-modal' && viewMap) {
                viewMap.remove();
                viewMap = null;
            }
        }
    });

    // Close modals with Escape key
    $(document).on('keydown', function(e) {
        if (e.key === 'Escape') {
            $('.modal').addClass('hidden');

            // Clean up maps if necessary
            if ($('#area-modal').hasClass('hidden') && map) {
                map.remove();
                map = null;
            }

            if ($('#view-area-modal').hasClass('hidden') && viewMap) {
                viewMap.remove();
                viewMap = null;
            }
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

/**
 * Set up event listeners for the user interface
 */
function setupEventListeners() {
    // Search input
    $('#search-areas').on('input', function() {
        applyFilters();
    });

    // District, province, and city filters
    $('#filter-district, #filter-province, #filter-city').on('change', function() {
        applyFilters();
    });

    initProvinceDistrictDropdowns();

    // Reset filters button
    $('#reset-filters').on('click', function() {
        resetFilters();
    });

    // Add area button
    $('#add-area-btn').on('click', function() {
        showAddAreaModal();
    });

    // Postal code lookup
    $('#lookup-postal-code').on('click', function() {
        lookupPostalCode();
    });

    // Enter key on postal code field
    $('#postal-code').on('keypress', function(e) {
        if (e.which === 13) {
            e.preventDefault();
            lookupPostalCode();
        }
    });

    // Form submission
    $('#area-form').on('submit', function(e) {
        e.preventDefault();
        saveArea();
    });

    // Modal close buttons
    $('#close-modal, #cancel-form').on('click', function() {
        hideAreaModal();
    });

    $('#close-view-modal').on('click', function() {
        $('#view-area-modal').addClass('hidden');
    });

    $('#close-provider-modal, #cancel-provider').on('click', function() {
        $('#provider-modal').addClass('hidden');
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

    // Add utility provider to area button
    $('#add-provider-btn').on('click', function() {
        showProviderModal();
    });

    // Add provider button in modal
    $('#add-provider').on('click', function() {
        addProviderToArea();
    });

    // Clear drawing button
    $('#clear-drawing').on('click', function() {
        if (draw) {
            draw.deleteAll();
        }
    });

    // Page navigation
    $('#prev-page').on('click', function() {
        if (currentPage > 1) {
            navigateToPage(currentPage - 1);
        }
    });

    $('#next-page').on('click', function() {
        const totalPages = Math.ceil(filteredAreas.length / pageSize);
        if (currentPage < totalPages) {
            navigateToPage(currentPage + 1);
        }
    });
}

/**
 * Lookup postal code and update map
 */
function lookupPostalCode() {
    const postalCode = $('#postal-code').val().trim();

    if (!postalCode) {
        showError('Please enter a postal code');
        return;
    }

    // Show loading state
    const lookupButton = $('#lookup-postal-code');
    lookupButton.prop('disabled', true).html('<i class="bx bx-loader-alt bx-spin"></i>');

    // Use Mapbox Geocoding API to fetch location data
    const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${postalCode}.json?country=lk&types=postcode&access_token=${CONFIG.MAPBOX_TOKEN}`;

    $.ajax({
        url: geocodingUrl,
        method: 'GET',
        success: function(response) {
            if (response && response.features && response.features.length > 0) {
                const feature = response.features[0];
                const coordinates = feature.center; // [longitude, latitude]

                // Extract place information
                let city = '';
                let district = '';
                let province = '';

                // Parse context for city, district, and province
                if (feature.context) {
                    feature.context.forEach(context => {
                        const id = context.id.split('.')[0];
                        if (id === 'place') {
                            city = context.text;
                        } else if (id === 'district') {
                            district = context.text;
                        } else if (id === 'region') {
                            province = context.text;
                        }
                    });
                }

                // Extract place name if city is empty
                if (!city && feature.place_name) {
                    const parts = feature.place_name.split(',');
                    if (parts.length > 0) {
                        city = parts[0].trim();
                    }
                }

                // Fill form fields
                $('#city').val(city);
                $('#district').val(district);
                $('#province').val(province);

                // Update map if it exists
                if (map) {
                    // Center map on coordinates
                    map.flyTo({
                        center: coordinates,
                        zoom: 12
                    });

                    // Add marker
                    new mapboxgl.Marker()
                        .setLngLat(coordinates)
                        .addTo(map);

                    // Draw a circle around the postal code as a default boundary
                    // First, clear any existing drawings
                    if (draw) {
                        draw.deleteAll();
                    }

                    // Wait for map to finish flying to location
                    map.once('moveend', function() {
                        // Create a circle feature
                        const center = turf.point(coordinates);
                        const radius = 1; // 1 km radius
                        const options = {
                            steps: 64,
                            units: 'kilometers'
                        };
                        const circle = turf.circle(center, radius, options);

                        // Add circle to draw
                        draw.add(circle);

                        // Update boundary JSON field
                        $('#area-boundary-json').val(JSON.stringify(circle.geometry));
                    });
                }

                showSuccess('Postal code location found');
            } else {
                showError('No location found for this postal code');
            }
        },
        error: function(xhr, status, error) {
            console.error('Error looking up postal code:', error);
            showError('Failed to lookup postal code. Please try again.');
        },
        complete: function() {
            // Restore button state
            lookupButton.prop('disabled', false).html('<i class="bx bx-search-alt-2"></i>');
        }
    });
}