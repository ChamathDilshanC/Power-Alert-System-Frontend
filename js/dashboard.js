localStorage.getItem('userRole') !== 'ADMIN' && localStorage.getItem('auth_token') === null ? window.location.href = '../index.html' : null;
$('current-year').textContent = new Date().getFullYear();


// Function to format date
function formatDate(date) {
    if (!date) return 'N/A';

    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

// Function to get relative time string (e.g., "2 hours ago")
function getRelativeTimeString(date) {
    if (!date) return 'N/A';

    const now = new Date();
    const diffMs = now - date;

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
            return `Starts in ${mins} minute${mins !== 1 ? 's' : ''}`;
        } else if (absDiff < day) {
            const hours = Math.floor(absDiff / hour);
            return `Starts in ${hours} hour${hours !== 1 ? 's' : ''}`;
        } else if (absDiff < week) {
            const days = Math.floor(absDiff / day);
            return `Starts in ${days} day${days !== 1 ? 's' : ''}`;
        } else {
            return formatDate(date);
        }
    } else {
        // Past date
        if (diffMs < minute) {
            return 'Just now';
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
            return formatDate(date);
        }
    }
}

// Function to calculate duration
function calculateDuration(startDate, endDate) {
    if (!startDate || !endDate) return 'Unknown';

    const diff = endDate - startDate;
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

// Function to apply filters
function applyFilters() {
    const typeFilter = document.getElementById('outageTypeFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;

    let filteredOutages = window.allOutages || [];

    // Apply type filter
    if (typeFilter !== 'all') {
        filteredOutages = filteredOutages.filter(outage => outage.type === typeFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
        filteredOutages = filteredOutages.filter(outage => outage.status === statusFilter);
    }

    // Display filtered outages
    displayOutages(filteredOutages);
}

// Helper function to generate a consistent number from a string
function hashStringToNumber(str) {
    if (!str) return 5000; // Default value for empty strings

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}// Fetch all outages and display the most recent 15 as cards
document.addEventListener('DOMContentLoaded', function() {
    // Add a container for outage cards below the dashboard grid
    const mainContent = document.getElementById('mainContent');

    // Create the outage section
    const outageSection = document.createElement('div');
    outageSection.className = 'mt-8';
    outageSection.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold text-gray-800">Recent Outages</h2>
            <div class="flex space-x-2">
                <select id="outageTypeFilter" class="bg-white border border-gray-300 text-gray-700 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400">
                    <option value="all">All Types</option>
                    <option value="ELECTRICITY">Electricity</option>
                    <option value="WATER">Water</option>
                    <option value="GAS">Gas</option>
                    <option value="INTERNET">Internet</option>
                </select>
                <select id="statusFilter" class="bg-white border border-gray-300 text-gray-700 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400">
                    <option value="all">All Status</option>
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="ONGOING">Ongoing</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                </select>
            </div>
        </div>
        <div id="outageLoader" class="flex justify-center py-12">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
        </div>
        <div id="outageCards" class="space-y-4"></div>
    `;

    mainContent.appendChild(outageSection);

    // Fetch and display outages
    fetchAllOutages();

    // Add event listeners for filters
    document.getElementById('outageTypeFilter').addEventListener('change', function() {
        applyFilters();
    });

    document.getElementById('statusFilter').addEventListener('change', function() {
        applyFilters();
    });
});

// Function to fetch all outages from the database
async function fetchAllOutages() {
    const outageCardsContainer = document.getElementById('outageCards');
    const loader = document.getElementById('outageLoader');

    try {
        // API endpoint for fetching all outages
        const response = await fetch('http://localhost:8080/api/public/outages/all');

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        // Store the full outage list for filtering
        window.allOutages = data.data || [];

        // Hide loader
        loader.style.display = 'none';

        // Display the outages
        displayOutages(window.allOutages);

    } catch (error) {
        console.error('Error fetching outages:', error);
        loader.style.display = 'none';
        outageCardsContainer.innerHTML = `
            <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                <p class="font-medium">Error loading outages</p>
                <p class="text-sm">${error.message || 'Please try again later.'}</p>
            </div>
        `;

        // Fall back to loading sample data for demonstration
        loadSampleData();
    }
}

// Function to display outages - shows the latest 15 outages
function displayOutages(outages) {
    const outageCardsContainer = document.getElementById('outageCards');
    outageCardsContainer.innerHTML = '';

    if (!outages || outages.length === 0) {
        outageCardsContainer.innerHTML = `
            <div class="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
                <p class="font-medium">No outages found</p>
                <p class="text-sm">There are currently no outages to display.</p>
            </div>
        `;
        return;
    }

    // Sort outages by start time (newest first)
    outages.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

    // Get the latest 15 outages
    const recentOutages = outages.slice(0, 15);

    // Create a card for each outage
    recentOutages.forEach(outage => {
        const card = createOutageCard(outage);
        outageCardsContainer.appendChild(card);
    });
}

// Function to create an outage card
function createOutageCard(outage) {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100';
    card.setAttribute('data-outage-type', outage.type);
    card.setAttribute('data-outage-status', outage.status);

    // Format dates and calculate relative time
    const now = new Date();
    const startDate = new Date(outage.startTime);
    const endDate = outage.estimatedEndTime ? new Date(outage.estimatedEndTime) : null;
    const actualEndDate = outage.actualEndTime ? new Date(outage.actualEndTime) : null;

    const relativeStartTime = getRelativeTimeString(startDate);
    const formattedEndDate = endDate ? formatDate(endDate) : 'Unknown';

    // Calculate duration
    const duration = calculateDuration(startDate, endDate || now);

    // Determine badge color based on status
    let statusBadgeClass = '';
    let statusIcon = '';

    switch(outage.status) {
        case 'SCHEDULED':
            statusBadgeClass = 'bg-blue-100 text-blue-800';
            statusIcon = '<i class="bx bx-calendar-event mr-1"></i>';
            break;
        case 'ONGOING':
            statusBadgeClass = 'bg-yellow-100 text-yellow-800';
            statusIcon = '<i class="bx bx-error-circle mr-1"></i>';
            break;
        case 'COMPLETED':
            statusBadgeClass = 'bg-green-100 text-green-800';
            statusIcon = '<i class="bx bx-check-circle mr-1"></i>';
            break;
        case 'CANCELLED':
            statusBadgeClass = 'bg-red-100 text-red-800';
            statusIcon = '<i class="bx bx-x-circle mr-1"></i>';
            break;
        default:
            statusBadgeClass = 'bg-gray-100 text-gray-800';
            statusIcon = '<i class="bx bx-question-mark mr-1"></i>';
    }

    // Determine type badge color
    let typeBadgeClass = '';
    let typeIcon = '';

    switch(outage.type) {
        case 'ELECTRICITY':
            typeBadgeClass = 'bg-amber-100 text-amber-800';
            typeIcon = '<i class="bx bxs-bolt mr-1"></i>';
            break;
        case 'WATER':
            typeBadgeClass = 'bg-sky-100 text-sky-800';
            typeIcon = '<i class="bx bxs-droplet mr-1"></i>';
            break;
        case 'GAS':
            typeBadgeClass = 'bg-orange-100 text-orange-800';
            typeIcon = '<i class="bx bxs-flame mr-1"></i>';
            break;
        case 'INTERNET':
            typeBadgeClass = 'bg-purple-100 text-purple-800';
            typeIcon = '<i class="bx bx-wifi mr-1"></i>';
            break;
        default:
            typeBadgeClass = 'bg-gray-100 text-gray-800';
            typeIcon = '<i class="bx bx-question-mark mr-1"></i>';
    }

    // Calculate affected users based on area (create consistent numbers for areas)
    // Each area has a fixed number of users affected
    const areaName = outage.affectedArea?.name || '';
    const areaHash = hashStringToNumber(areaName);
    const basePopulation = areaHash % 10000; // 0-9999
    let affectedUsers;

    if (outage.type === 'ELECTRICITY') {
        affectedUsers = basePopulation + 3000; // 3000-12999
    } else if (outage.type === 'WATER') {
        affectedUsers = basePopulation + 2000; // 2000-11999
    } else if (outage.type === 'GAS') {
        affectedUsers = basePopulation + 1000; // 1000-10999
    } else {
        affectedUsers = basePopulation + 500; // 500-10499
    }

    // Create progress bar based on outage status and time
    let progressPercent = 0;
    let progressClass = '';
    let progressLabel = '';

    if (outage.status === 'SCHEDULED') {
        // For scheduled outages, progress is 0%
        progressPercent = 0;
        progressClass = 'bg-blue-500';
        progressLabel = 'Not started';
    } else if (outage.status === 'ONGOING') {
        // For ongoing outages, show progress based on elapsed time
        const total = endDate - startDate;
        const elapsed = now - startDate;
        progressPercent = Math.min(Math.floor((elapsed / total) * 100), 95);
        progressClass = 'bg-yellow-500';
        progressLabel = 'In progress';
    } else if (outage.status === 'COMPLETED') {
        // For completed outages, show 100% with green progress
        progressPercent = 100;
        progressClass = 'bg-green-500';
        progressLabel = 'Completed';
    } else if (outage.status === 'CANCELLED') {
        // For cancelled outages, show 100% with red progress
        progressPercent = 100;
        progressClass = 'bg-red-500';
        progressLabel = 'Cancelled';
    }

    // Enhanced progress bar with gradient for ongoing outages
    let progressBarStyle = '';
    if (outage.status === 'ONGOING') {
        progressBarStyle = 'background: linear-gradient(90deg, #eab308 0%, #facc15 100%);';
    } else if (outage.status === 'COMPLETED') {
        progressBarStyle = 'background: linear-gradient(90deg, #22c55e 0%, #16a34a 100%);';
    } else if (outage.status === 'CANCELLED') {
        progressBarStyle = 'background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);';
    } else {
        progressBarStyle = 'background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);';
    }

    card.innerHTML = `
        <div class="p-5">
            <div class="flex justify-between mb-2">
                <div class="flex flex-wrap gap-2">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass}">
                        ${statusIcon} ${outage.status}
                    </span>
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeBadgeClass}">
                        ${typeIcon} ${outage.type}
                    </span>
                </div>
                <span class="text-xs font-medium text-gray-500">${relativeStartTime}</span>
            </div>

            <h3 class="text-lg font-semibold text-gray-800 mb-1 truncate">
                ${outage.affectedArea?.name || 'Unknown Area'} Outage
            </h3>

            <p class="text-sm text-gray-600 mb-4 line-clamp-2">
                ${outage.reason || 'No reason provided'}
                ${outage.additionalInfo ? `- ${outage.additionalInfo}` : ''}
            </p>

            <div class="flex flex-col space-y-2 mb-4">
                <div class="flex justify-between">
                    <div class="text-sm text-gray-600">Start Time:</div>
                    <div class="text-sm font-medium">${relativeStartTime}</div>
                </div>
                <div class="flex justify-between">
                    <div class="text-sm text-gray-600">Est. End Time:</div>
                    <div class="text-sm font-medium">${formattedEndDate}</div>
                </div>
                <div class="flex justify-between">
                    <div class="text-sm text-gray-600">Duration:</div>
                    <div class="text-sm font-medium">${duration}</div>
                </div>
            </div>

            <div class="mb-4">
                <div class="flex justify-between mb-1">
                    <span class="text-xs font-medium text-gray-700">${progressLabel}</span>
                    <span class="text-xs font-medium text-gray-700">${progressPercent}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                    <div class="h-3 rounded-full transition-all duration-1000 ease-out"
                         style="${progressBarStyle} width: ${progressPercent}%"></div>
                </div>
            </div>

            <div class="flex justify-between items-center border-t border-gray-100 pt-3">
                <div class="flex items-center text-xs text-gray-600">
                    <i class="bx bxs-user-voice mr-1"></i>
                    <span>${affectedUsers.toLocaleString()} affected users</span>
                </div>
                <button class="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center">
                    View Details <i class='bx bx-chevron-right ml-1'></i>
                </button>
            </div>
        </div>
    `;

    // Add click event to view details
    card.querySelector('button').addEventListener('click', function() {
        // Create and show modal with outage details
        showOutageDetailModal(outage);
    });

    // Add pulse animation for ongoing outages to draw attention
    if (outage.status === 'ONGOING') {
        const pulseIndicator = document.createElement('div');
        pulseIndicator.className = 'absolute top-3 right-3 flex h-3 w-3';
        pulseIndicator.innerHTML = `
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
        `;
        card.style.position = 'relative';
        card.appendChild(pulseIndicator);
    }

    return card;
}

// Function to show outage detail modal
function showOutageDetailModal(outage) {
    // Remove any existing modal
    const existingModal = document.getElementById('outageDetailModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Create modal backdrop
    const modalBackdrop = document.createElement('div');
    modalBackdrop.className = 'fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex justify-center items-center';
    modalBackdrop.id = 'outageDetailModal';

    // Format dates
    const startDate = new Date(outage.startTime);
    const endDate = outage.estimatedEndTime ? new Date(outage.estimatedEndTime) : null;
    const actualEndDate = outage.actualEndTime ? new Date(outage.actualEndTime) : null;

    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = endDate ? formatDate(endDate) : 'Unknown';
    const formattedActualEndDate = actualEndDate ? formatDate(actualEndDate) : 'Not yet completed';

    // Calculate duration
    const duration = calculateDuration(startDate, actualEndDate || endDate || new Date());

    // Determine status badge class
    let statusClass = '';
    let statusIcon = '';

    switch(outage.status) {
        case 'SCHEDULED':
            statusClass = 'bg-blue-100 text-blue-800 border-blue-200';
            statusIcon = '<i class="bx bx-calendar-event mr-2"></i>';
            break;
        case 'ONGOING':
            statusClass = 'bg-yellow-100 text-yellow-800 border-yellow-200';
            statusIcon = '<i class="bx bx-error-circle mr-2"></i>';
            break;
        case 'COMPLETED':
            statusClass = 'bg-green-100 text-green-800 border-green-200';
            statusIcon = '<i class="bx bx-check-circle mr-2"></i>';
            break;
        case 'CANCELLED':
            statusClass = 'bg-red-100 text-red-800 border-red-200';
            statusIcon = '<i class="bx bx-x-circle mr-2"></i>';
            break;
        default:
            statusClass = 'bg-gray-100 text-gray-800 border-gray-200';
            statusIcon = '<i class="bx bx-question-mark mr-2"></i>';
    }

    // Calculate affected users based on area (same as in card)
    const areaName = outage.affectedArea?.name || '';
    const areaHash = hashStringToNumber(areaName);
    const basePopulation = areaHash % 10000; // 0-9999
    let affectedUsers;

    if (outage.type === 'ELECTRICITY') {
        affectedUsers = basePopulation + 3000; // 3000-12999
    } else if (outage.type === 'WATER') {
        affectedUsers = basePopulation + 2000; // 2000-11999
    } else if (outage.type === 'GAS') {
        affectedUsers = basePopulation + 1000; // 1000-10999
    } else {
        affectedUsers = basePopulation + 500; // 500-10499
    }

    // Create map coordinates for the affected area
    // Use geographical coordinates from the outage if available, otherwise generate from area name
    let latitude, longitude;

    if (outage.geographicalAreaJson) {
        try {
            // Try to extract coordinates from the GeoJSON
            const geoData = JSON.parse(outage.geographicalAreaJson);
            if (geoData.coordinates && geoData.coordinates.length > 0) {
                // Calculate center of the polygon for simple cases
                if (geoData.type === 'Polygon' && geoData.coordinates[0].length > 0) {
                    const coords = geoData.coordinates[0];
                    let totalLat = 0, totalLng = 0;
                    coords.forEach(coord => {
                        totalLng += coord[0];
                        totalLat += coord[1];
                    });
                    longitude = totalLng / coords.length;
                    latitude = totalLat / coords.length;
                } else {
                    // Fallback to first coordinate
                    longitude = geoData.coordinates[0][0][0];
                    latitude = geoData.coordinates[0][0][1];
                }
            } else {
                throw new Error("Invalid GeoJSON format");
            }
        } catch (e) {
            // Fallback to hashed values if GeoJSON parsing fails
            latitude = 6.927079 + (areaHash % 1000) / 10000;
            longitude = 79.861244 + (areaHash % 500) / 10000;
        }
    } else {
        // Generate coordinates from area name hash
        latitude = 6.927079 + (areaHash % 1000) / 10000;
        longitude = 79.861244 + (areaHash % 500) / 10000;
    }

    // Create modal content HTML
    const modalContent = `
        <div class="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto m-4 relative">
            <div class="absolute top-4 right-4">
                <button id="closeModalBtn" class="text-gray-400 hover:text-gray-600 transition-colors">
                    <i class='bx bx-x text-2xl'></i>
                </button>
            </div>

            <div class="p-6">
                <div class="flex flex-col md:flex-row justify-between mb-4 items-start md:items-center">
                    <h2 class="text-2xl font-bold text-gray-800 mb-2 md:mb-0">
                        ${outage.affectedArea?.name || 'Unknown Area'} Outage
                    </h2>
                    <div class="${statusClass} px-4 py-1 rounded-full border text-sm font-medium inline-flex items-center">
                        ${statusIcon} ${outage.status}
                    </div>
                </div>

                <div class="border-b border-gray-200 pb-4 mb-4">
                    <div class="flex flex-wrap gap-2 mb-3">
                        <span class="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-amber-50 text-amber-800 border border-amber-200">
                            <i class="bx bxs-bolt mr-1"></i> ${outage.type}
                        </span>
                        <span class="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-purple-50 text-purple-800 border border-purple-200">
                            <i class="bx bxs-map-pin mr-1"></i> ${outage.affectedArea?.name}
                        </span>
                        <span class="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-gray-50 text-gray-800 border border-gray-200">
                            <i class="bx bxs-time mr-1"></i> ${duration}
                        </span>
                    </div>

                    <p class="text-gray-700 mb-3">
                        <span class="font-medium">Reason:</span> ${outage.reason || 'No reason provided'}
                    </p>

                    ${outage.additionalInfo ? `
                        <p class="text-gray-700">
                            <span class="font-medium">Additional Info:</span> ${outage.additionalInfo}
                        </p>
                    ` : ''}
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h3 class="font-medium text-gray-800 mb-3">Time Information</h3>
                        <div class="space-y-2">
                            <div class="flex justify-between">
                                <span class="text-gray-600">Start Time:</span>
                                <span class="font-medium">${formattedStartDate}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Estimated End:</span>
                                <span class="font-medium">${formattedEndDate}</span>
                            </div>
                            ${outage.status === 'COMPLETED' ? `
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Actual End:</span>
                                    <span class="font-medium">${formattedActualEndDate}</span>
                                </div>
                            ` : ''}
                            <div class="flex justify-between">
                                <span class="text-gray-600">Total Duration:</span>
                                <span class="font-medium">${duration}</span>
                            </div>
                        </div>
                    </div>

                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h3 class="font-medium text-gray-800 mb-3">Affected Information</h3>
                        <div class="space-y-2">
                            <div class="flex justify-between">
                                <span class="text-gray-600">Area:</span>
                                <span class="font-medium">${outage.affectedArea?.name}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">District:</span>
                                <span class="font-medium">${outage.affectedArea?.district || 'Not specified'}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Affected Users:</span>
                                <span class="font-medium">${affectedUsers.toLocaleString()}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Critical Facilities:</span>
                                <span class="font-medium">${Math.floor((areaHash % 10) + 1)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                ${outage.status === 'ONGOING' || outage.status === 'COMPLETED' ? `
                    <div class="mb-6">
                        <h3 class="font-medium text-gray-800 mb-3">Progress</h3>
                        <div class="mb-2 flex justify-between text-sm">
                            <span>${outage.status === 'ONGOING' ? 'Restoration Progress' : 'Completion Status'}</span>
                            <span>${outage.status === 'ONGOING' ?
        `Estimated ${calculateTimeRemaining(new Date(), endDate)}` :
        outage.status === 'COMPLETED' ?
            `Completed ${getRelativeTimeString(actualEndDate || endDate)}` : ''}</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div class="h-3 rounded-full transition-all duration-1000 ease-out ${
        outage.status === 'ONGOING' ?
            'bg-gradient-to-r from-yellow-400 to-yellow-500' :
            'bg-gradient-to-r from-green-400 to-green-500'}"
                                 style="width: ${calculateProgressPercentage(startDate, endDate, outage.status)}%"></div>
                        </div>
                    </div>
                ` : ''}

                <div class="mb-6">
                    <h3 class="font-medium text-gray-800 mb-3">Affected Area Map</h3>
                    <div class="h-48 md:h-64 w-full bg-gray-100 rounded-lg overflow-hidden relative" id="outageMapContainer">
                        <div class="absolute inset-0 flex items-center justify-center">
                            <iframe
                                width="100%"
                                height="100%"
                                frameborder="0"
                                scrolling="no"
                                marginheight="0"
                                marginwidth="0"
                                src="https://maps.google.com/maps?q=${latitude},${longitude}&z=13&output=embed"
                            ></iframe>
                        </div>
                    </div>
                </div>

                <div class="border-t border-gray-200 pt-4 mt-4 flex flex-wrap justify-between gap-2">
                    <button id="viewMapFullBtn" class="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors inline-flex items-center">
                        <i class='bx bx-map-alt mr-2'></i> Open in Google Maps
                    </button>
                    ${outage.status === 'ONGOING' || outage.status === 'SCHEDULED' ? `
                        <button class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors inline-flex items-center">
                            <i class='bx bx-bell mr-2'></i> Set Notification
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    // Add modal to page
    modalBackdrop.innerHTML = modalContent;
    document.body.appendChild(modalBackdrop);

    // Add event listener to close modal
    document.getElementById('closeModalBtn').addEventListener('click', function() {
        modalBackdrop.remove();
    });

    // Add event listener to open Google Maps
    document.getElementById('viewMapFullBtn').addEventListener('click', function() {
        window.open(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`, '_blank');
    });

    // Close modal when clicking outside
    modalBackdrop.addEventListener('click', function(e) {
        if (e.target === modalBackdrop) {
            modalBackdrop.remove();
        }
    });
}

// Helper function to calculate progress percentage
function calculateProgressPercentage(startDate, endDate, status) {
    if (!startDate || !endDate) return 0;

    if (status === 'COMPLETED' || status === 'CANCELLED') {
        return 100;
    }

    const now = new Date();
    const total = endDate - startDate;
    const elapsed = now - startDate;
    return Math.min(Math.max(Math.floor((elapsed / total) * 100), 0), 95);
}

// Helper function to calculate time remaining
function calculateTimeRemaining(now, endDate) {
    if (!endDate) return 'unknown time remaining';

    const diff = endDate - now;
    if (diff <= 0) return 'completion overdue';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours === 0) {
        return `${minutes} min remaining`;
    } else {
        return `${hours}h ${minutes}m remaining`;
    }
}

// Function to animate counting up
function animateCounter(counter, target) {
    const speed = 200; // Lower is faster
    const increment = target / speed;
    let current = 0;

    const timer = setInterval(() => {
        current += increment;

        // If we've reached the target, stop and set the final value
        if (current >= target) {
            clearInterval(timer);
            counter.innerText = target;
        } else {
            counter.innerText = Math.floor(current);
        }
    }, 10);
}

// Observe when stats section comes into view
document.addEventListener('DOMContentLoaded', function() {
    // Set up intersection observer for stats
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Animate all stat cards in sequence
                const statCards = document.querySelectorAll('.stat-card');
                statCards.forEach((card, index) => {
                    setTimeout(() => {
                        card.classList.add('animated');

                        // Start counter animation
                        const counter = card.querySelector('.counter');
                        const target = parseInt(counter.getAttribute('data-target'));
                        animateCounter(counter, target);
                    }, index * 200); // Stagger each card's animation
                });

                // Unobserve once animation is triggered
                statsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });

    // Start observing stats container
    const statsContainer = document.querySelector('.stats-container');
    if (statsContainer) {
        statsObserver.observe(statsContainer);
    }

    // Image hover effect
    const imageContainer = document.getElementById('about-image-container');
    const image = document.getElementById('about-image');

    if (imageContainer && image) {
        imageContainer.addEventListener('mousemove', (e) => {
            const { left, top, width, height } = imageContainer.getBoundingClientRect();
            const x = (e.clientX - left) / width;
            const y = (e.clientY - top) / height;

            // Subtle parallax effect on hover
            image.style.transform = `scale(1.05) translate(${(x - 0.5) * -10}px, ${(y - 0.5) * -10}px)`;
        });

        imageContainer.addEventListener('mouseleave', () => {
            image.style.transform = 'scale(1) translate(0, 0)';
        });
    }

    // Button click effect
    const learnMoreBtn = document.getElementById('learn-more-btn');
    if (learnMoreBtn) {
        learnMoreBtn.addEventListener('click', () => {
            // You can add a modal or redirect logic here
            alert('Learn more functionality will be implemented soon!');
        });
    }
});

