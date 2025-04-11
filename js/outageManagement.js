// ======================================
// INITIALIZATION AND GLOBAL VARIABLES
// ======================================
const MAPBOX_TOKEN = 'pk.eyJ1IjoiY2hhbWF0aDQ5OTciLCJhIjoiY204bXhqN2N2MGtuMDJscGw2bDk1N3RpNyJ9.tzXMf6U8UAd0GY1GR-iuTQ';
let map, editMap, reviewMap;
let draw, editDraw;
let currentStep = 1;
let currentOutages = [];
let areas = [];
let providers = [];
let currentOutage = null;
let filterStatus = 'all';
let filterType = 'all';
let historyData = [];
let outageChart = null;
let currentPage = 1;
const itemsPerPage = 10;

// Show spinner on page load
document.getElementById('spinner').style.display = 'flex';

// Initialize components when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeDateTimePickers();
    loadOutages();
    loadAreas();
    loadUtilityProviders();
    setupFormValidation();
    setupEventListeners();
    initializeHistoryTab();

    // Hide spinner when everything is loaded
    setTimeout(() => {
        document.getElementById('spinner').style.display = 'none';
    }, 1000);
});

// ======================================
// INITIALIZATION FUNCTIONS
// ======================================

// Initialize date/time pickers
function initializeDateTimePickers() {
    const defaultDateOptions = {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        minuteIncrement: 15,
        time_24hr: true
    };

    flatpickr("#start-time", defaultDateOptions);
    flatpickr("#end-time", defaultDateOptions);
    flatpickr("#edit-start-time", defaultDateOptions);
    flatpickr("#edit-end-time", defaultDateOptions);
    flatpickr("#updated-end-time", defaultDateOptions);
}

// Initialize Mapbox maps
function initializeMaps() {
    mapboxgl.accessToken = MAPBOX_TOKEN;

    // Main creation map
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [80.7718, 7.8731], // Sri Lanka center
        zoom: 7
    });

    // Add controls
    map.addControl(new mapboxgl.NavigationControl());
    map.addControl(new mapboxgl.FullscreenControl());

    // Add drawing tools
    draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
            polygon: true,
            trash: true
        }
    });
    map.addControl(draw);

    // Add geocoder for search
    const geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl,
        marker: false,
        placeholder: 'Search for a location...',
        bbox: [79.5, 5.9, 81.9, 9.9], // Sri Lanka boundaries
        proximity: {
            longitude: 80.7718,
            latitude: 7.8731
        }
    });
    document.getElementById('area-geocoder').appendChild(geocoder.onAdd(map));

    map.on('draw.create', updateCoordinates);
    map.on('draw.update', updateCoordinates);
    map.on('draw.delete', updateCoordinates);

    // Edit map
    editMap = new mapboxgl.Map({
        container: 'edit-map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [80.7718, 7.8731],
        zoom: 7
    });

    editMap.addControl(new mapboxgl.NavigationControl());
    editMap.addControl(new mapboxgl.FullscreenControl());

    editDraw = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
            polygon: true,
            trash: true
        }
    });
    editMap.addControl(editDraw);

    editMap.on('draw.create', function() {
        const data = editDraw.getAll();
        if (data.features.length > 0) {
            document.getElementById('edit-entire-area-check').checked = false;
        }
    });

    // Review map (read-only)
    reviewMap = new mapboxgl.Map({
        container: 'review-map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [80.7718, 7.8731],
        zoom: 7
    });

    reviewMap.addControl(new mapboxgl.NavigationControl());
}

// Set up form validation
function setupFormValidation() {
    // Create outage form validation
    const createForm = document.getElementById('create-outage-form');
    createForm.addEventListener('submit', function(e) {
        e.preventDefault();

        if (validateCreateForm()) {
            createOutage();
        }
    });

    // Edit outage form validation
    const editForm = document.getElementById('edit-outage-form');
    editForm.addEventListener('submit', function(e) {
        e.preventDefault();

        if (validateEditForm()) {
            updateOutage();
        }
    });

    // Update form validation
    const updateForm = document.getElementById('update-form');
    const submitUpdateBtn = document.getElementById('submit-update-btn');
    submitUpdateBtn.addEventListener('click', function() {
        if (updateForm.checkValidity()) {
            addOutageUpdate();
        } else {
            updateForm.reportValidity();
        }
    });
}

// Set up event listeners
function setupEventListeners() {
    // Tab change event
    document.querySelectorAll('.nav-link').forEach(tab => {
        tab.addEventListener('click', function(e) {
            // If switching to map tabs, initialize/resize maps
            if (e.target.id === 'create-tab' && !map) {
                setTimeout(() => initializeMaps(), 100);
            } else if (e.target.id === 'edit-tab' && editMap) {
                setTimeout(() => editMap.resize(), 100);
            }
        });
    });

    // Multi-step form navigation
    document.querySelectorAll('.next-step').forEach(button => {
        button.addEventListener('click', function() {
            goToNextStep();
        });
    });

    document.querySelectorAll('.prev-step').forEach(button => {
        button.addEventListener('click', function() {
            goToPrevStep();
        });
    });

    // Outage filter buttons
    document.querySelectorAll('.filter-btn').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            filterStatus = this.dataset.filter;
            filterOutages();
        });
    });

    // Outage type filter
    document.querySelectorAll('.type-filter').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelectorAll('.type-filter').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            document.getElementById('outageTypeDropdown').textContent = this.textContent;
            filterType = this.dataset.type;
            filterOutages();
        });
    });

    // Search box
    document.getElementById('search-btn').addEventListener('click', function() {
        searchOutages();
    });

    document.getElementById('outage-search').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchOutages();
        }
    });

    // Area checkbox
    document.getElementById('entire-area-check').addEventListener('change', function() {
        if (this.checked) {
            draw.deleteAll();
        }
    });

    document.getElementById('edit-entire-area-check').addEventListener('change', function() {
        if (this.checked) {
            editDraw.deleteAll();
        }
    });

    // Edit outage selection
    document.getElementById('edit-outage-select').addEventListener('change', function() {
        const outageId = this.value;
        if (outageId) {
            loadOutageForEdit(outageId);
        } else {
            document.getElementById('edit-outage-form-container').classList.add('d-none');
            document.getElementById('edit-outage-placeholder').classList.remove('d-none');
        }
    });

    // Cancel edit button
    document.getElementById('cancel-edit-btn').addEventListener('click', function() {
        document.getElementById('edit-outage-form-container').classList.add('d-none');
        document.getElementById('edit-outage-placeholder').classList.remove('d-none');
        document.getElementById('edit-outage-select').value = '';
    });

    // Edit button in modal
    document.getElementById('edit-outage-btn').addEventListener('click', function() {
        if (currentOutage) {
            // Switch to edit tab
            document.getElementById('edit-tab').click();

            // Select the outage in the dropdown
            const selectElement = document.getElementById('edit-outage-select');
            selectElement.value = currentOutage.id;

            // Load the outage for editing
            loadOutageForEdit(currentOutage.id);

            // Close the modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('outageDetailsModal'));
            modal.hide();
        }
    });

    // History tab filters
    document.getElementById('apply-history-filters').addEventListener('click', function() {
        loadOutageHistory();
    });

    // Export history button
    document.getElementById('export-history-btn').addEventListener('click', function() {
        exportHistoryToCSV();
    });
}

// Initialize history tab
function initializeHistoryTab() {
    // Populate year dropdown with the last 5 years
    const yearSelect = document.getElementById('history-year');
    const currentYear = new Date().getFullYear();

    for (let i = 0; i < 5; i++) {
        const year = currentYear - i;
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }

    // Initialize Chart.js
    const ctx = document.getElementById('outage-chart').getContext('2d');
    outageChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [{
                label: 'Total Outages',
                data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                backgroundColor: 'rgba(13, 110, 253, 0.5)',
                borderColor: 'rgba(13, 110, 253, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

// ======================================
// API CALLS AND DATA LOADING
// ======================================

// Load outage data from API
function loadOutages() {
    showSpinner();

    fetch(`${CONFIG.API_BASE_URL}/api/public/outages/active`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load outages');
            }
            return response.json();
        })
        .then(data => {
            if (data.code === 200 && data.data) {
                currentOutages = data.data;
                displayOutages(currentOutages);
                populateOutageDropdown(currentOutages);
            } else {
                showToast('Error', 'Failed to load outages data', 'error');
            }
        })
        .catch(error => {
            console.error('Error loading outages:', error);
            showToast('Error', 'Failed to load outages: ' + error.message, 'error');
        })
        .finally(() => {
            hideSpinner();
        });
}

// Load areas from API
function loadAreas() {
    fetch(`${CONFIG.API_BASE_URL}/api/public/areas`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load areas');
            }
            return response.json();
        })
        .then(data => {
            if (data.code === 200 && data.data) {
                areas = data.data;
                populateAreaDropdowns(areas);
            } else {
                showToast('Error', 'Failed to load areas data', 'error');
            }
        })
        .catch(error => {
            console.error('Error loading areas:', error);
            showToast('Error', 'Failed to load areas: ' + error.message, 'error');
        });
}

function loadUtilityProviders() {
    console.log("Loading utility providers from public endpoint");

    fetch(`${CONFIG.API_BASE_URL}/api/public/utility-providers`)
        .then(response => {
            console.log("Response status:", response.status);
            if (!response.ok) {
                throw new Error('Failed to load utility providers');
            }
            return response.json();
        })
        .then(data => {
            console.log("Utility provider data:", data);
            if (data && data.code === 200 && data.data) {
                providers = data.data;
                populateProviderDropdowns(providers);
                displayProviderCards(providers);
            } else {
                console.log("Using mock data due to invalid response");
                useMockProviderData();
            }
        })
        .catch(error => {
            console.error('Error loading utility providers:', error);
            useMockProviderData();
        });
}

// Load outage by ID for editing
function loadOutageForEdit(outageId) {
    showSpinner();

    fetch(`${CONFIG.API_BASE_URL}/api/public/outages/${outageId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load outage details');
            }
            return response.json();
        })
        .then(data => {
            if (data.code === 200 && data.data) {
                const outage = data.data;
                populateEditForm(outage);
                document.getElementById('edit-outage-placeholder').classList.add('d-none');
                document.getElementById('edit-outage-form-container').classList.remove('d-none');

                // Force map resize after showing container
                setTimeout(() => {
                    editMap.resize();
                    if (outage.geographicalAreaJson) {
                        displayOutageAreaOnMap(editMap, editDraw, outage.geographicalAreaJson);
                    }
                }, 100);
            } else {
                showToast('Error', 'Failed to load outage details', 'error');
            }
        })
        .catch(error => {
            console.error('Error loading outage details:', error);
            showToast('Error', 'Failed to load outage details: ' + error.message, 'error');
        })
        .finally(() => {
            hideSpinner();
        });
}

// Load outage history data
function loadOutageHistory() {
    showSpinner();

    // Get filter values
    const year = document.getElementById('history-year').value;
    const month = document.getElementById('history-month').value;
    const areaId = document.getElementById('history-area').value;
    const type = document.getElementById('history-type').value;

    // Construct URL with filters
    let url = `${CONFIG.API_BASE_URL}/api/public/outage-history`;
    const params = new URLSearchParams();

    if (year) params.append('year', year);
    if (month) params.append('month', month);

    if (params.toString()) {
        url += `?${params.toString()}`;
    }

    // If area filter is selected, use area endpoint
    if (areaId) {
        url = `${CONFIG.API_BASE_URL}/api/public/outage-history/area/${areaId}`;
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
    }

    // If type filter is selected, use type endpoint
    if (type) {
        url = `${CONFIG.API_BASE_URL}/api/public/outage-history/type/${type}`;
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
    }

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load outage history');
            }
            return response.json();
        })
        .then(data => {
            if (data.code === 200 && data.data) {
                historyData = data.data;
                displayHistoryData(historyData);
                updateHistoryChart(historyData, year);
            } else {
                showToast('Error', 'Failed to load outage history data', 'error');
            }
        })
        .catch(error => {
            console.error('Error loading outage history:', error);
            showToast('Error', 'Failed to load outage history: ' + error.message, 'error');
        })
        .finally(() => {
            hideSpinner();
        });

    // Load statistics for admin dashboard
    fetch(`${CONFIG.API_BASE_URL}/api/admin/dashboard/statistics`, {
        headers: {
            'Authorization': `Bearer ${getToken()}`
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load statistics');
            }
            return response.json();
        })
        .then(data => {
            if (data.code === 200 && data.data) {
                updateStatistics(data.data);
            }
        })
        .catch(error => {
            console.error('Error loading statistics:', error);
        });
}

// Create new outage
function createOutage() {
    showSpinner();

    // Get form values
    const outageType = document.getElementById('outage-type').value;
    const outageStatus = document.getElementById('outage-status').value;
    const startTime = document.getElementById('start-time').value;
    const endTime = document.getElementById('end-time').value;
    const reason = document.getElementById('reason').value;
    const additionalInfo = document.getElementById('additional-info').value;
    const areaId = document.getElementById('area-select').value;
    const providerId = document.getElementById('provider-select').value;

    // Get geographical area JSON
    let geographicalAreaJson = null;
    if (!document.getElementById('entire-area-check').checked) {
        const data = draw.getAll();
        if (data.features.length > 0) {
            geographicalAreaJson = JSON.stringify(data);
        }
    }

    // Create outage object
    const outageData = {
        type: outageType,
        status: outageStatus,
        startTime: new Date(startTime).toISOString(),
        estimatedEndTime: new Date(endTime).toISOString(),
        areaId: parseInt(areaId),
        geographicalAreaJson: geographicalAreaJson,
        reason: reason,
        additionalInfo: additionalInfo,
        utilityProviderId: parseInt(providerId)
    };

    // Send POST request
    fetch(`${CONFIG.API_BASE_URL}/api/provider/outages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(outageData)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to create outage');
            }
            return response.json();
        })
        .then(data => {
            if (data.code === 201 && data.data) {
                showToast('Success', 'Outage created successfully', 'success');
                resetCreateForm();
                // Reload outages
                loadOutages();
                // Switch to view tab
                document.getElementById('view-tab').click();
            } else {
                showToast('Error', 'Failed to create outage: ' + (data.message || 'Unknown error'), 'error');
            }
        })
        .catch(error => {
            console.error('Error creating outage:', error);
            showToast('Error', 'Failed to create outage: ' + error.message, 'error');
        })
        .finally(() => {
            hideSpinner();
        });
}

// Update existing outage
function updateOutage() {
    showSpinner();

    if (!currentOutage) {
        showToast('Error', 'No outage selected for update', 'error');
        hideSpinner();
        return;
    }

    // Get form values
    const outageType = document.getElementById('edit-outage-type').value;
    const outageStatus = document.getElementById('edit-outage-status').value;
    const startTime = document.getElementById('edit-start-time').value;
    const endTime = document.getElementById('edit-end-time').value;
    const reason = document.getElementById('edit-reason').value;
    const additionalInfo = document.getElementById('edit-additional-info').value;
    const areaId = document.getElementById('edit-area-select').value;
    const providerId = document.getElementById('edit-provider-select').value;

    // Get geographical area JSON
    let geographicalAreaJson = null;
    if (!document.getElementById('edit-entire-area-check').checked) {
        const data = editDraw.getAll();
        if (data.features.length > 0) {
            geographicalAreaJson = JSON.stringify(data);
        }
    }

    // Create outage object
    const outageData = {
        type: outageType,
        status: outageStatus,
        startTime: new Date(startTime).toISOString(),
        estimatedEndTime: new Date(endTime).toISOString(),
        areaId: parseInt(areaId),
        geographicalAreaJson: geographicalAreaJson,
        reason: reason,
        additionalInfo: additionalInfo,
        utilityProviderId: parseInt(providerId)
    };

    // Send PUT request
    fetch(`${CONFIG.API_BASE_URL}/api/provider/outages/${currentOutage.id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(outageData)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to update outage');
            }
            return response.json();
        })
        .then(data => {
            if (data.code === 200 && data.data) {
                showToast('Success', 'Outage updated successfully', 'success');
                // Reset form and UI
                document.getElementById('edit-outage-form-container').classList.add('d-none');
                document.getElementById('edit-outage-placeholder').classList.remove('d-none');
                document.getElementById('edit-outage-select').value = '';

                // Reload outages
                loadOutages();
                // Switch to view tab
                document.getElementById('view-tab').click();
            } else {
                showToast('Error', 'Failed to update outage: ' + (data.message || 'Unknown error'), 'error');
            }
        })
        .catch(error => {
            console.error('Error updating outage:', error);
            showToast('Error', 'Failed to update outage: ' + error.message, 'error');
        })
        .finally(() => {
            hideSpinner();
        });
}

// Add update to an outage
function addOutageUpdate() {
    showSpinner();

    if (!currentOutage) {
        showToast('Error', 'No outage selected for update', 'error');
        hideSpinner();
        return;
    }

    // Get form values
    const updateInfo = document.getElementById('update-info').value;
    const newStatus = document.getElementById('new-status').value;
    const updatedEndTime = document.getElementById('updated-end-time').value;
    const updateReason = document.getElementById('update-reason').value;

    // Create update object
    const updateData = {
        outageId: currentOutage.id,
        updateInfo: updateInfo,
        reason: updateReason || null
    };

    if (newStatus) {
        updateData.newStatus = newStatus;
    }

    if (updatedEndTime) {
        updateData.updatedEstimatedEndTime = new Date(updatedEndTime).toISOString();
    }

    // Send POST request
    fetch(`${CONFIG.API_BASE_URL}/api/provider/outages/${currentOutage.id}/updates`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(updateData)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to add update');
            }
            return response.json();
        })
        .then(data => {
            if (data.code === 200 && data.data) {
                showToast('Success', 'Update added successfully', 'success');

                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('addUpdateModal'));
                modal.hide();

                // Reset form
                document.getElementById('update-form').reset();

                // Reload outage for edit to get latest data
                loadOutageForEdit(currentOutage.id);

                // Also reload all outages
                loadOutages();
            } else {
                showToast('Error', 'Failed to add update: ' + (data.message || 'Unknown error'), 'error');
            }
        })
        .catch(error => {
            console.error('Error adding update:', error);
            showToast('Error', 'Failed to add update: ' + error.message, 'error');
        })
        .finally(() => {
            hideSpinner();
        });
}

// ======================================
// UI DISPLAY FUNCTIONS
// ======================================

// Display outages in the main view
function displayOutages(outages) {
    const container = document.getElementById('outages-container');
    const noOutagesMessage = document.getElementById('no-outages-message');

    // Clear container
    container.innerHTML = '';

    if (outages.length === 0) {
        noOutagesMessage.classList.remove('d-none');
        return;
    }

    noOutagesMessage.classList.add('d-none');

    // Sort outages by status and start time
    outages.sort((a, b) => {
        // Priority: ONGOING > SCHEDULED > COMPLETED > CANCELLED
        const statusPriority = {
            'ONGOING': 0,
            'SCHEDULED': 1,
            'COMPLETED': 2,
            'CANCELLED': 3
        };

        if (statusPriority[a.status] !== statusPriority[b.status]) {
            return statusPriority[a.status] - statusPriority[b.status];
        }

        // Then sort by start time (newest first)
        return new Date(b.startTime) - new Date(a.startTime);
    });

    // Create cards for each outage
    outages.forEach(outage => {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4 mb-4';

        // Format dates
        const startDate = new Date(outage.startTime);
        const endDate = outage.estimatedEndTime ? new Date(outage.estimatedEndTime) : null;
        const actualEndDate = outage.actualEndTime ? new Date(outage.actualEndTime) : null;

        col.innerHTML = `
            <div class="card outage-card h-100">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <div>
                        <span class="badge badge-${outage.type.toLowerCase()}">${formatOutageType(outage.type)}</span>
                        <span class="badge badge-${outage.status.toLowerCase()} ms-2">${formatOutageStatus(outage.status)}</span>
                    </div>
                    <div class="text-muted small">#${outage.id}</div>
                </div>
                <div class="card-body">
                    <h5 class="card-title">${outage.affectedArea.name}</h5>
                    <p class="card-text text-truncate">${outage.reason || 'No reason provided'}</p>
                    <div class="d-flex justify-content-between mb-2">
                        <div class="small text-muted">Start:</div>
                        <div class="small fw-bold">${formatDate(startDate)}</div>
                    </div>
                    <div class="d-flex justify-content-between mb-2">
                        <div class="small text-muted">End (Est.):</div>
                        <div class="small fw-bold">${endDate ? formatDate(endDate) : 'N/A'}</div>
                    </div>
                    ${outage.status === 'COMPLETED' ? `
                    <div class="d-flex justify-content-between mb-2">
                        <div class="small text-muted">End (Actual):</div>
                        <div class="small fw-bold">${actualEndDate ? formatDate(actualEndDate) : 'N/A'}</div>
                    </div>
                    ` : ''}
                    <div class="text-end mt-3">
                        <button class="btn btn-sm btn-outline-primary view-details-btn" data-outage-id="${outage.id}">
                            <i class='bx bx-info-circle'></i> View Details
                        </button>
                    </div>
                </div>
                <div class="card-footer text-muted d-flex justify-content-between">
                    <div>Provider: ${outage.utilityProvider.name}</div>
                    <div>${outage.updates ? outage.updates.length : 0} updates</div>
                </div>
            </div>
        `;

        container.appendChild(col);
    });

    // Add click event to view details buttons
    document.querySelectorAll('.view-details-btn').forEach(button => {
        button.addEventListener('click', function() {
            const outageId = this.dataset.outageId;
            viewOutageDetails(outageId);
        });
    });
}

// View outage details in modal
function viewOutageDetails(outageId) {
    showSpinner();

    fetch(`${CONFIG.API_BASE_URL}/api/public/outages/${outageId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load outage details');
            }
            return response.json();
        })
        .then(data => {
            if (data.code === 200 && data.data) {
                currentOutage = data.data;
                displayOutageDetailsInModal(currentOutage);

                // Open modal
                const modal = new bootstrap.Modal(document.getElementById('outageDetailsModal'));
                modal.show();
            } else {
                showToast('Error', 'Failed to load outage details', 'error');
            }
        })
        .catch(error => {
            console.error('Error loading outage details:', error);
            showToast('Error', 'Failed to load outage details: ' + error.message, 'error');
        })
        .finally(() => {
            hideSpinner();
        });
}

// Display outage details in modal
function displayOutageDetailsInModal(outage) {
    const container = document.getElementById('outage-details-content');

    // Format dates
    const startDate = new Date(outage.startTime);
    const endDate = outage.estimatedEndTime ? new Date(outage.estimatedEndTime) : null;
    const actualEndDate = outage.actualEndTime ? new Date(outage.actualEndTime) : null;

    // Check if edit button should be enabled
    const editButton = document.getElementById('edit-outage-btn');
    if (outage.status === 'COMPLETED' || outage.status === 'CANCELLED') {
        editButton.disabled = true;
        editButton.title = 'Completed or cancelled outages cannot be edited';
    } else {
        editButton.disabled = false;
        editButton.title = '';
    }

    // Build details HTML
    let html = `
        <div class="row">
            <div class="col-md-6">
                <h5>Basic Information</h5>
                <table class="table table-sm">
                    <tr>
                        <th>ID:</th>
                        <td>${outage.id}</td>
                    </tr>
                    <tr>
                        <th>Type:</th>
                        <td><span class="badge badge-${outage.type.toLowerCase()}">${formatOutageType(outage.type)}</span></td>
                    </tr>
                    <tr>
                        <th>Status:</th>
                        <td><span class="badge badge-${outage.status.toLowerCase()}">${formatOutageStatus(outage.status)}</span></td>
                    </tr>
                    <tr>
                        <th>Area:</th>
                        <td>${outage.affectedArea.name}, ${outage.affectedArea.district}</td>
                    </tr>
                    <tr>
                        <th>Provider:</th>
                        <td>${outage.utilityProvider.name}</td>
                    </tr>
                    <tr>
                        <th>Start Time:</th>
                        <td>${formatDate(startDate)}</td>
                    </tr>
                    <tr>
                        <th>Est. End Time:</th>
                        <td>${endDate ? formatDate(endDate) : 'N/A'}</td>
                    </tr>
                    ${outage.actualEndTime ? `
                    <tr>
                        <th>Actual End Time:</th>
                        <td>${formatDate(actualEndDate)}</td>
                    </tr>
                    ` : ''}
                </table>
                
                <h5 class="mt-4">Reason</h5>
                <p>${outage.reason || 'No reason provided'}</p>
                
                ${outage.additionalInfo ? `
                <h5 class="mt-4">Additional Information</h5>
                <p>${outage.additionalInfo}</p>
                ` : ''}
            </div>
            
            <div class="col-md-6">
                <h5>Affected Area</h5>
                <div id="detail-map" class="map-container mb-3"></div>
                
                <h5 class="mt-3">Updates</h5>
                ${outage.updates && outage.updates.length > 0 ? `
                <div class="outage-details-container">
                    <div class="list-group">
                        ${outage.updates.map(update => {
        const updateDate = new Date(update.createdAt);
        return `
                            <div class="list-group-item list-group-item-action flex-column align-items-start">
                                <div class="d-flex w-100 justify-content-between">
                                    <h6 class="mb-1">${update.updateInfo}</h6>
                                    <small>${formatDate(updateDate)}</small>
                                </div>
                                ${update.newStatus ? `
                                <p class="mb-1 small">Status changed to: <span class="badge badge-${update.newStatus.toLowerCase()}">${formatOutageStatus(update.newStatus)}</span></p>
                                ` : ''}
                                ${update.updatedEstimatedEndTime ? `
                                <p class="mb-1 small">End time updated to: ${formatDate(new Date(update.updatedEstimatedEndTime))}</p>
                                ` : ''}
                                ${update.reason ? `
                                <p class="mb-1 small text-muted">Reason: ${update.reason}</p>
                                ` : ''}
                            </div>
                            `;
    }).join('')}
                    </div>
                </div>
                ` : `
                <div class="alert alert-info">
                    No updates available for this outage
                </div>
                `}
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Initialize map
    setTimeout(() => {
        const detailMap = new mapboxgl.Map({
            container: 'detail-map',
            style: 'mapbox://styles/mapbox/streets-v11',
            center: [80.7718, 7.8731], // Sri Lanka center
            zoom: 7
        });

        detailMap.addControl(new mapboxgl.NavigationControl());

        // Add geographical area to map if available
        if (outage.geographicalAreaJson) {
            detailMap.on('load', function() {
                displayOutageAreaOnMap(detailMap, null, outage.geographicalAreaJson, true);
            });
        } else {
            // If no specific area, zoom to the affected area's center
            if (outage.affectedArea && outage.affectedArea.boundaryJson) {
                detailMap.on('load', function() {
                    try {
                        const boundary = JSON.parse(outage.affectedArea.boundaryJson);
                        displayOutageAreaOnMap(detailMap, null, JSON.stringify(boundary), true);
                    } catch (e) {
                        console.error('Error parsing area boundary:', e);
                    }
                });
            }
        }
    }, 100);
}

// Populate outage dropdown for editing
function populateOutageDropdown(outages) {
    const select = document.getElementById('edit-outage-select');

    // Clear existing options except the first one
    while (select.options.length > 1) {
        select.remove(1);
    }

    // Add only active outages (SCHEDULED or ONGOING)
    const activeOutages = outages.filter(outage =>
        outage.status === 'SCHEDULED' || outage.status === 'ONGOING'
    );

    // Sort by newest first
    activeOutages.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

    activeOutages.forEach(outage => {
        const option = document.createElement('option');
        option.value = outage.id;
        option.textContent = `#${outage.id} - ${formatOutageType(outage.type)} - ${outage.affectedArea.name}`;
        select.appendChild(option);
    });
}

// Populate area dropdowns
function populateAreaDropdowns(areas) {
    const createSelect = document.getElementById('area-select');
    const editSelect = document.getElementById('edit-area-select');
    const historySelect = document.getElementById('history-area');

    // Sort areas by name
    areas.sort((a, b) => a.name.localeCompare(b.name));

    // Clear existing options except the first one
    while (createSelect.options.length > 1) {
        createSelect.remove(1);
    }

    while (editSelect.options.length > 1) {
        editSelect.remove(1);
    }

    while (historySelect.options.length > 1) {
        historySelect.remove(1);
    }

    // Add areas to dropdowns
    areas.forEach(area => {
        // Create select
        const createOption = document.createElement('option');
        createOption.value = area.id;
        createOption.textContent = `${area.name} (${area.district})`;
        createSelect.appendChild(createOption);

        // Edit select
        const editOption = document.createElement('option');
        editOption.value = area.id;
        editOption.textContent = `${area.name} (${area.district})`;
        editSelect.appendChild(editOption);

        // History select
        const historyOption = document.createElement('option');
        historyOption.value = area.id;
        historyOption.textContent = `${area.name} (${area.district})`;
        historySelect.appendChild(historyOption);
    });
}

// Populate provider dropdowns
function populateProviderDropdowns(providers) {
    const createSelect = document.getElementById('provider-select');
    const editSelect = document.getElementById('edit-provider-select');

    // Sort providers by name
    providers.sort((a, b) => a.name.localeCompare(b.name));

    // Clear existing options except the first one
    while (createSelect.options.length > 1) {
        createSelect.remove(1);
    }

    while (editSelect.options.length > 1) {
        editSelect.remove(1);
    }

    // Add providers to dropdowns
    providers.forEach(provider => {
        // Create select
        const createOption = document.createElement('option');
        createOption.value = provider.id;
        createOption.textContent = `${provider.name} (${formatOutageType(provider.type)})`;
        createSelect.appendChild(createOption);

        // Edit select
        const editOption = document.createElement('option');
        editOption.value = provider.id;
        editOption.textContent = `${provider.name} (${formatOutageType(provider.type)})`;
        editSelect.appendChild(editOption);
    });
}

// Display provider cards for selection
function displayProviderCards(providers) {
    const container = document.getElementById('provider-cards-container');

    // Clear container
    container.innerHTML = '';

    // Group providers by type
    const providersByType = {};
    providers.forEach(provider => {
        if (!providersByType[provider.type]) {
            providersByType[provider.type] = [];
        }
        providersByType[provider.type].push(provider);
    });

    // Create cards by type
    Object.keys(providersByType).forEach(type => {
        const typeProviders = providersByType[type];

        // Create type header
        const typeRow = document.createElement('div');
        typeRow.className = 'row mb-3';
        typeRow.innerHTML = `
            <div class="col-12">
                <h6><span class="badge badge-${type.toLowerCase()}">${formatOutageType(type)}</span> Providers</h6>
            </div>
        `;
        container.appendChild(typeRow);

        // Create provider cards
        const cardsRow = document.createElement('div');
        cardsRow.className = 'row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3 mb-4';

        typeProviders.forEach(provider => {
            const col = document.createElement('div');
            col.className = 'col';
            col.innerHTML = `
                <div class="card utility-provider-card h-100" data-provider-id="${provider.id}">
                    <div class="card-body">
                        <h6 class="card-title">${provider.name}</h6>
                        ${provider.contactPhone ? `<p class="card-text small mb-1"><i class='bx bx-phone'></i> ${provider.contactPhone}</p>` : ''}
                        ${provider.contactEmail ? `<p class="card-text small mb-1"><i class='bx bx-envelope'></i> ${provider.contactEmail}</p>` : ''}
                        ${provider.website ? `<p class="card-text small mb-1"><i class='bx bx-globe'></i> ${provider.website}</p>` : ''}
                    </div>
                </div>
            `;
            cardsRow.appendChild(col);
        });

        container.appendChild(cardsRow);
    });

    // Add click event to provider cards
    document.querySelectorAll('.utility-provider-card').forEach(card => {
        card.addEventListener('click', function() {
            const providerId = this.dataset.providerId;
            document.getElementById('provider-select').value = providerId;

            // Remove selected class from all cards
            document.querySelectorAll('.utility-provider-card').forEach(c => {
                c.classList.remove('selected');
            });

            // Add selected class to clicked card
            this.classList.add('selected');
        });
    });
}

// Display outage area on map
function displayOutageAreaOnMap(mapInstance, drawInstance, geoJsonString, fitBounds = false) {
    if (!geoJsonString) return;

    try {
        const geoJson = JSON.parse(geoJsonString);

        // If using Draw control
        if (drawInstance) {
            drawInstance.deleteAll();

            // Add features to draw
            if (geoJson.features && geoJson.features.length > 0) {
                drawInstance.add(geoJson);
            }
        }
        // Otherwise just add as a layer
        else {
            // Check if the source already exists
            if (mapInstance.getSource('outage-area')) {
                mapInstance.removeLayer('outage-fill');
                mapInstance.removeLayer('outage-outline');
                mapInstance.removeSource('outage-area');
            }

            // Add source and layers
            mapInstance.addSource('outage-area', {
                type: 'geojson',
                data: geoJson
            });

            mapInstance.addLayer({
                id: 'outage-fill',
                type: 'fill',
                source: 'outage-area',
                paint: {
                    'fill-color': '#0d6efd',
                    'fill-opacity': 0.3
                }
            });

            mapInstance.addLayer({
                id: 'outage-outline',
                type: 'line',
                source: 'outage-area',
                paint: {
                    'line-color': '#0d6efd',
                    'line-width': 2
                }
            });
        }

        // Fit bounds if requested
        if (fitBounds && geoJson.features && geoJson.features.length > 0) {
            try {
                // Calculate bounds
                const bounds = new mapboxgl.LngLatBounds();

                // Process all features
                geoJson.features.forEach(feature => {
                    if (feature.geometry && feature.geometry.coordinates) {
                        // For polygons
                        if (feature.geometry.type === 'Polygon') {
                            feature.geometry.coordinates[0].forEach(coord => {
                                bounds.extend(coord);
                            });
                        }
                        // For points
                        else if (feature.geometry.type === 'Point') {
                            bounds.extend(feature.geometry.coordinates);
                        }
                    }
                });

                // Fit map to bounds with padding
                mapInstance.fitBounds(bounds, {
                    padding: 50,
                    maxZoom: 15
                });
            } catch (e) {
                console.error('Error fitting bounds:', e);
            }
        }
    } catch (e) {
        console.error('Error displaying GeoJSON on map:', e);
    }
}

// Populate edit form with outage data
function populateEditForm(outage) {
    document.getElementById('edit-outage-type').value = outage.type;
    document.getElementById('edit-outage-status').value = outage.status;
    document.getElementById('edit-start-time').value = outage.startTime ? formatDateForInput(new Date(outage.startTime)) : '';
    document.getElementById('edit-end-time').value = outage.estimatedEndTime ? formatDateForInput(new Date(outage.estimatedEndTime)) : '';
    document.getElementById('edit-area-select').value = outage.affectedArea.id;
    document.getElementById('edit-provider-select').value = outage.utilityProvider.id;
    document.getElementById('edit-reason').value = outage.reason || '';
    document.getElementById('edit-additional-info').value = outage.additionalInfo || '';

    // Clear any existing drawings
    if (editDraw) {
        editDraw.deleteAll();
    }

    // Set the current outage for reference
    currentOutage = outage;
}

// Display history data in table
function displayHistoryData(historyData) {
    const tableBody = document.getElementById('history-table-body');
    const countInfo = document.getElementById('history-count-info');

    // Clear table
    tableBody.innerHTML = '';

    // Update count info
    countInfo.textContent = `Showing ${historyData.length} outage history records`;

    // Sort data by date (newest first)
    historyData.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
    });

    // Paginate data
    const totalPages = Math.ceil(historyData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, historyData.length);
    const paginatedData = historyData.slice(startIndex, endIndex);

    // Add rows
    paginatedData.forEach(history => {
        const row = document.createElement('tr');

        // Get month name
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        const monthName = monthNames[history.month - 1];

        // Find area name
        const area = areas.find(a => a.id === history.areaId);
        const areaName = area ? area.name : 'Unknown';

        row.innerHTML = `
            <td><span class="badge badge-${history.type.toLowerCase()}">${formatOutageType(history.type)}</span></td>
            <td>${areaName}</td>
            <td>${monthName} ${history.year}</td>
            <td>${history.outageCount}</td>
            <td>${history.totalOutageHours.toFixed(1)} hrs</td>
            <td>${history.averageRestorationTime.toFixed(1)} hrs</td>
            <td>
                <button class="btn btn-sm btn-outline-info">
                    <i class='bx bx-bar-chart-alt-2'></i>
                </button>
            </td>
        `;

        tableBody.appendChild(row);
    });

    // Update pagination
    updatePagination(totalPages);
}

// Update pagination controls
function updatePagination(totalPages) {
    const pagination = document.getElementById('history-pagination');
    pagination.innerHTML = '';

    // Don't show pagination if only one page
    if (totalPages <= 1) return;

    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage - 1}"><i class='bx bx-chevron-left'></i></a>`;
    pagination.appendChild(prevLi);

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        // Only show limited number of pages
        if (totalPages > 7) {
            if (i !== 1 && i !== totalPages && (i < currentPage - 1 || i > currentPage + 1)) {
                if (i === currentPage - 2 || i === currentPage + 2) {
                    const ellipsisLi = document.createElement('li');
                    ellipsisLi.className = 'page-item disabled';
                    ellipsisLi.innerHTML = '<span class="page-link">...</span>';
                    pagination.appendChild(ellipsisLi);
                }
                continue;
            }
        }

        const pageLi = document.createElement('li');
        pageLi.className = `page-item ${i === currentPage ? 'active' : ''}`;
        pageLi.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
        pagination.appendChild(pageLi);
    }

    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage + 1}"><i class='bx bx-chevron-right'></i></a>`;
    pagination.appendChild(nextLi);

    // Add click events to pagination links
    document.querySelectorAll('.page-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = parseInt(this.dataset.page);
            if (page >= 1 && page <= totalPages) {
                currentPage = page;
                displayHistoryData(historyData);
            }
        });
    });
}

// Update history chart
function updateHistoryChart(historyData, year) {
    if (!outageChart) return;

    // Filter by selected year if provided
    const filteredData = year ? historyData.filter(h => h.year == year) : historyData;

    // Initialize data array for all months
    const monthData = new Array(12).fill(0);

    // Sum outage counts by month
    filteredData.forEach(history => {
        monthData[history.month - 1] += history.outageCount;
    });

    // Update chart data
    outageChart.data.datasets[0].data = monthData;
    outageChart.update();
}

// Update statistics
function updateStatistics(statistics) {
    document.getElementById('electricity-outage-count').textContent = statistics.electricityOutages || 0;
    document.getElementById('water-outage-count').textContent = statistics.waterOutages || 0;
    document.getElementById('avg-restoration-time').textContent = statistics.averageRestorationTime ?
        `${statistics.averageRestorationTime.toFixed(1)}h` : '0h';
}

// ======================================
// UTILITY FUNCTIONS
// ======================================

// Format outage type for display
function formatOutageType(type) {
    const typeMap = {
        'ELECTRICITY': 'Electricity',
        'WATER': 'Water',
        'GAS': 'Gas',
        'INTERNET': 'Internet'
    };
    return typeMap[type] || type;
}

// Format outage status for display
function formatOutageStatus(status) {
    const statusMap = {
        'SCHEDULED': 'Scheduled',
        'ONGOING': 'Ongoing',
        'COMPLETED': 'Completed',
        'CANCELLED': 'Cancelled'
    };
    return statusMap[status] || status;
}

// Format date for display
function formatDate(date) {
    if (!date) return 'N/A';

    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };

    return date.toLocaleDateString('en-US', options);
}

// Format date for input fields
function formatDateForInput(date) {
    if (!date) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// Show toast notification
function showToast(title, message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container');

    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'toast show';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    // Set icon and background based on type
    let iconClass = 'bx-info-circle';
    let bgClass = 'bg-info';

    if (type === 'success') {
        iconClass = 'bx-check-circle';
        bgClass = 'bg-success';
    } else if (type === 'error') {
        iconClass = 'bx-x-circle';
        bgClass = 'bg-danger';
    } else if (type === 'warning') {
        iconClass = 'bx-error';
        bgClass = 'bg-warning';
    }

    // Create toast content
    toast.innerHTML = `
        <div class="toast-header ${bgClass} text-white">
            <i class='bx ${iconClass} me-2'></i>
            <strong class="me-auto">${title}</strong>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;

    // Add to container
    toastContainer.appendChild(toast);

    // Add close button functionality
    toast.querySelector('.btn-close').addEventListener('click', function() {
        toast.remove();
    });

    // Auto-remove after delay
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// Show spinner
function showSpinner() {
    document.getElementById('spinner').style.display = 'flex';
}

// Hide spinner
function hideSpinner() {
    document.getElementById('spinner').style.display = 'none';
}

// Get token from local storage
function getToken() {
    return localStorage.getItem('auth_token');
}

// Filter outages based on current filters
function filterOutages() {
    let filtered = [...currentOutages];

    // Filter by status
    if (filterStatus !== 'all') {
        filtered = filtered.filter(outage => outage.status.toLowerCase() === filterStatus);
    }

    // Filter by type
    if (filterType !== 'all') {
        filtered = filtered.filter(outage => outage.type === filterType);
    }

    // Display filtered outages
    displayOutages(filtered);
}

// Search outages
function searchOutages() {
    const searchTerm = document.getElementById('outage-search').value.toLowerCase().trim();

    if (!searchTerm) {
        filterOutages();
        return;
    }

    let filtered = currentOutages.filter(outage => {
        return (
            outage.affectedArea.name.toLowerCase().includes(searchTerm) ||
            outage.affectedArea.district.toLowerCase().includes(searchTerm) ||
            outage.reason?.toLowerCase().includes(searchTerm) ||
            outage.id.toString().includes(searchTerm) ||
            outage.utilityProvider.name.toLowerCase().includes(searchTerm)
        );
    });

    displayOutages(filtered);
}

// Update coordinates display
function updateCoordinates() {
    const data = draw.getAll();
    const coordinatesElement = document.getElementById('coordinates');

    if (data.features.length > 0) {
        const polygons = data.features.filter(f => f.geometry.type === 'Polygon');
        if (polygons.length > 0) {
            // Show area in square kilometers
            const area = turf.area(polygons[0]);
            const rounded = Math.round(area * 100) / 100;
            coordinatesElement.innerHTML = `Selected area: ${rounded} square meters (${(rounded / 1000000).toFixed(4)} sq km)`;
        } else {
            coordinatesElement.innerHTML = 'Selected area: N/A';
        }

        // Uncheck entire area checkbox
        document.getElementById('entire-area-check').checked = false;
    } else {
        coordinatesElement.innerHTML = '';
    }
}

// Go to next step in create form
function goToNextStep() {
    // Validate current step before proceeding
    if (!validateStep(currentStep)) {
        return;
    }

    // Hide current step
    document.getElementById(`step-${currentStep}`).classList.add('d-none');

    // Mark current step as completed
    document.querySelector(`.progress-step[data-step="${currentStep}"]`).classList.add('completed');

    // Increment step counter
    currentStep++;

    // Show next step
    document.getElementById(`step-${currentStep}`).classList.remove('d-none');

    // Mark new step as active
    document.querySelector(`.progress-step[data-step="${currentStep}"]`).classList.add('active');

    // Special handling for step 4 (review)
    if (currentStep === 4) {
        populateReviewStep();
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Go to previous step in create form
function goToPrevStep() {
    // Hide current step
    document.getElementById(`step-${currentStep}`).classList.add('d-none');

    // Remove active class from current step
    document.querySelector(`.progress-step[data-step="${currentStep}"]`).classList.remove('active');

    // Decrement step counter
    currentStep--;

    // Show previous step
    document.getElementById(`step-${currentStep}`).classList.remove('d-none');

    // Remove completed class from previous step
    document.querySelector(`.progress-step[data-step="${currentStep}"]`).classList.remove('completed');

    // Mark previous step as active
    document.querySelector(`.progress-step[data-step="${currentStep}"]`).classList.add('active');

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Validate the current step
function validateStep(step) {
    switch (step) {
        case 1:
            // Basic information validation
            if (!document.getElementById('outage-type').value) {
                showToast('Error', 'Please select an outage type', 'error');
                return false;
            }
            if (!document.getElementById('start-time').value) {
                showToast('Error', 'Please select a start time', 'error');
                return false;
            }
            if (!document.getElementById('end-time').value) {
                showToast('Error', 'Please select an end time', 'error');
                return false;
            }
            if (!document.getElementById('reason').value.trim()) {
                showToast('Error', 'Please enter a reason for the outage', 'error');
                return false;
            }

            // Check that end time is after start time
            const startTime = new Date(document.getElementById('start-time').value);
            const endTime = new Date(document.getElementById('end-time').value);
            if (endTime <= startTime) {
                showToast('Error', 'End time must be after start time', 'error');
                return false;
            }

            return true;

        case 2:
            // Location validation
            if (!document.getElementById('area-select').value) {
                showToast('Error', 'Please select an area', 'error');
                return false;
            }

            // Either draw an area or use entire area
            const data = draw.getAll();
            if (data.features.length === 0 && !document.getElementById('entire-area-check').checked) {
                showToast('Error', 'Please draw an affected area or check "Apply to entire area"', 'error');
                return false;
            }

            return true;

        case 3:
            // Provider validation
            if (!document.getElementById('provider-select').value) {
                showToast('Error', 'Please select a utility provider', 'error');
                return false;
            }

            return true;

        default:
            return true;
    }
}

// Populate the review step with form data
function populateReviewStep() {
    // Basic info
    document.getElementById('review-type').textContent = formatOutageType(document.getElementById('outage-type').value);
    document.getElementById('review-status').textContent = formatOutageStatus(document.getElementById('outage-status').value);
    document.getElementById('review-start-time').textContent = formatDate(new Date(document.getElementById('start-time').value));
    document.getElementById('review-end-time').textContent = formatDate(new Date(document.getElementById('end-time').value));
    document.getElementById('review-reason').textContent = document.getElementById('reason').value;
    document.getElementById('review-additional-info').textContent = document.getElementById('additional-info').value || 'None';

    // Area and provider
    const areaSelect = document.getElementById('area-select');
    const providerSelect = document.getElementById('provider-select');
    document.getElementById('review-area').textContent = areaSelect.options[areaSelect.selectedIndex].text;
    document.getElementById('review-provider').textContent = providerSelect.options[providerSelect.selectedIndex].text;

    // Map
    setTimeout(() => {
        reviewMap.resize();

        // Add area to review map
        if (!document.getElementById('entire-area-check').checked) {
            const data = draw.getAll();
            if (data.features.length > 0) {
                displayOutageAreaOnMap(reviewMap, null, JSON.stringify(data), true);
            }
        } else {
            // If entire area is selected, try to show area boundary
            const areaId = areaSelect.value;
            const area = areas.find(a => a.id == areaId);
            if (area && area.boundaryJson) {
                try {
                    const boundary = JSON.parse(area.boundaryJson);
                    displayOutageAreaOnMap(reviewMap, null, JSON.stringify(boundary), true);
                } catch (e) {
                    console.error('Error parsing area boundary:', e);
                }
            }
        }
    }, 100);
}

// Reset create form
function resetCreateForm() {
    // Reset form fields
    document.getElementById('create-outage-form').reset();

    // Reset map
    if (draw) {
        draw.deleteAll();
    }

    // Reset step counter
    currentStep = 1;

    // Hide all steps except first
    document.querySelectorAll('.create-outage-step').forEach((step, index) => {
        if (index === 0) {
            step.classList.remove('d-none');
        } else {
            step.classList.add('d-none');
        }
    });

    // Reset progress tracker
    document.querySelectorAll('.progress-step').forEach((step, index) => {
        step.classList.remove('active', 'completed');
        if (index === 0) {
            step.classList.add('active');
        }
    });
}

// Validate create form
function validateCreateForm() {
    // All steps must be valid
    for (let i = 1; i <= 3; i++) {
        if (!validateStep(i)) {
            return false;
        }
    }

    return true;
}

// Validate edit form
function validateEditForm() {
    if (!document.getElementById('edit-outage-type').value) {
        showToast('Error', 'Please select an outage type', 'error');
        return false;
    }

    if (!document.getElementById('edit-start-time').value) {
        showToast('Error', 'Please select a start time', 'error');
        return false;
    }

    if (!document.getElementById('edit-end-time').value) {
        showToast('Error', 'Please select an end time', 'error');
        return false;
    }

    if (!document.getElementById('edit-area-select').value) {
        showToast('Error', 'Please select an area', 'error');
        return false;
    }

    if (!document.getElementById('edit-provider-select').value) {
        showToast('Error', 'Please select a utility provider', 'error');
        return false;
    }

    if (!document.getElementById('edit-reason').value.trim()) {
        showToast('Error', 'Please enter a reason for the outage', 'error');
        return false;
    }

    // Check that end time is after start time
    const startTime = new Date(document.getElementById('edit-start-time').value);
    const endTime = new Date(document.getElementById('edit-end-time').value);
    if (endTime <= startTime) {
        showToast('Error', 'End time must be after start time', 'error');
        return false;
    }

    return true;
}

// Export history data to CSV
function exportHistoryToCSV() {
    if (historyData.length === 0) {
        showToast('Warning', 'No data to export', 'warning');
        return;
    }

    // Create CSV content
    let csvContent = 'data:text/csv;charset=utf-8,';

    // Add header row
    csvContent += 'Type,Area,Year,Month,Outage Count,Total Hours,Avg. Restoration Time\n';

    // Add data rows
    historyData.forEach(history => {
        // Find area name
        const area = areas.find(a => a.id === history.areaId);
        const areaName = area ? area.name : 'Unknown';

        // Get month name
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        const monthName = monthNames[history.month - 1];

        csvContent += `${formatOutageType(history.type)},${areaName},${history.year},${monthName},${history.outageCount},${history.totalOutageHours.toFixed(1)},${history.averageRestorationTime.toFixed(1)}\n`;
    });

    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'outage_history.csv');
    document.body.appendChild(link);

    // Click link to download
    link.click();

    // Remove link
    document.body.removeChild(link);
}

document.addEventListener('DOMContentLoaded', function() {
    // Calendar element
    const calendarEl = document.getElementById('calendar');
    const calendarLoader = document.getElementById('calendarLoader');

    // Initialize calendar with empty events array
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next',
            center: 'title',
            right: ''
        },
        height: 'auto',
        events: [], // Will be populated from server
        eventTimeFormat: {
            hour: '2-digit',
            minute: '2-digit',
            meridiem: 'short'
        },
        eventClick: function(info) {
            showOutageDetailModal(info.event.extendedProps.outage);
        },
        eventDidMount: function(info) {
            // Add tooltip
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip-content';

            const outage = info.event.extendedProps.outage;
            tooltip.innerHTML = `
        <div class="p-2">
          <div class="font-medium">${info.event.title}</div>
          <div class="text-xs text-gray-600">Status: ${outage.status}</div>
          <div class="text-xs text-gray-600">Type: ${outage.type}</div>
          <div class="text-xs text-gray-600">Area: ${outage.affectedArea?.name || 'Unknown'}</div>
        </div>
      `;

            // Use tippy.js if available (not included here), or a simple title
            info.el.title = `${info.event.title}\nStatus: ${outage.status}\nType: ${outage.type}`;
        }
    });

    // Function to fetch outages from server
    async function fetchOutages() {
        try {
            // Show loader
            calendarLoader.style.display = 'flex';
            calendarEl.style.display = 'none';

            // Fetch data from API
            const response = await fetch('http://localhost:8080/api/public/outages/all');

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();

            // Store all outages for filtering
            window.allOutages = data.data || [];

            // Convert outages to calendar events
            const calendarEvents = window.allOutages.map(outage => {
                return createCalendarEvent(outage);
            });

            // Remove existing events
            const existingEvents = calendar.getEvents();
            existingEvents.forEach(event => event.remove());

            // Add new events
            calendarEvents.forEach(event => {
                calendar.addEvent(event);
            });

            // Hide loader and show calendar
            calendarLoader.style.display = 'none';
            calendarEl.style.display = 'block';

            // Refresh the calendar view
            calendar.render();

        } catch (error) {
            console.error('Error fetching outages for calendar:', error);

            // Hide loader
            calendarLoader.style.display = 'none';
            calendarEl.style.display = 'block';

            // Show error message on calendar
            calendarEl.innerHTML = `
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p class="font-medium">Error loading calendar data</p>
          <p class="text-sm">${error.message || 'Please try again later.'}</p>
        </div>
      `;

            // Load fallback data for demonstration
            loadSampleCalendarData();
        }
    }

    // Function to create a calendar event from an outage
    function createCalendarEvent(outage) {
        let backgroundColor, borderColor;

        // Set colors based on outage type
        switch(outage.type) {
            case 'ELECTRICITY':
                backgroundColor = '#4f46e5';
                borderColor = '#4338ca';
                break;
            case 'WATER':
                backgroundColor = '#0ea5e9';
                borderColor = '#0284c7';
                break;
            case 'GAS':
                backgroundColor = '#f97316';
                borderColor = '#ea580c';
                break;
            case 'INTERNET':
                backgroundColor = '#a855f7';
                borderColor = '#9333ea';
                break;
            default:
                backgroundColor = '#6b7280';
                borderColor = '#4b5563';
        }

        // Add status indication to color
        if (outage.status === 'ONGOING') {
            // Make it slightly transparent for ongoing
            backgroundColor = backgroundColor + 'e6'; // 90% opacity
        } else if (outage.status === 'COMPLETED') {
            // More transparent for completed
            backgroundColor = backgroundColor + '99'; // 60% opacity
        } else if (outage.status === 'CANCELLED') {
            // Grey out for cancelled
            backgroundColor = '#9ca3af';
            borderColor = '#6b7280';
        }

        return {
            id: outage.id,
            title: `${outage.type} - ${outage.affectedArea?.name || 'Unknown Area'}`,
            start: outage.startTime,
            end: outage.estimatedEndTime || outage.actualEndTime,
            backgroundColor: backgroundColor,
            borderColor: borderColor,
            textColor: '#ffffff',
            extendedProps: {
                outage: outage,
                type: outage.type,
                status: outage.status,
                area: outage.affectedArea?.name
            }
        };
    }

    // Add refresh button event listener
    const refreshCalendar = () => {
        fetchOutages();
    };

    // Add button event listeners
    document.getElementById('today-btn').addEventListener('click', function() {
        calendar.today();
    });

    document.getElementById('month-view-btn').addEventListener('click', function() {
        calendar.changeView('dayGridMonth');
        toggleActiveViewButton(this);
    });

    document.getElementById('week-view-btn').addEventListener('click', function() {
        calendar.changeView('timeGridWeek');
        toggleActiveViewButton(this);
    });

    document.getElementById('day-view-btn').addEventListener('click', function() {
        calendar.changeView('timeGridDay');
        toggleActiveViewButton(this);
    });

    // Helper function to toggle active view button
    function toggleActiveViewButton(activeBtn) {
        const viewButtons = [
            document.getElementById('month-view-btn'),
            document.getElementById('week-view-btn'),
            document.getElementById('day-view-btn')
        ];

        viewButtons.forEach(btn => {
            if (btn === activeBtn) {
                btn.classList.remove('bg-white', 'text-gray-700', 'border', 'border-gray-300');
                btn.classList.add('bg-primary-600', 'text-white');
            } else {
                btn.classList.remove('bg-primary-600', 'text-white');
                btn.classList.add('bg-white', 'text-gray-700', 'border', 'border-gray-300');
            }
        });
    }

    // Initial fetch of outage data
    fetchOutages();

    // Set up periodic refresh (every 5 minutes)
    setInterval(refreshCalendar, 5 * 60 * 1000);
});