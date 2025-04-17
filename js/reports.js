// reports.js - Power Alert Reports functionality with real server data

document.addEventListener('DOMContentLoaded', function() {
    // Initialize date pickers
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);

    flatpickr("#from-date", {
        dateFormat: "Y-m-d",
        defaultDate: oneMonthAgo,
        maxDate: today
    });

    flatpickr("#to-date", {
        dateFormat: "Y-m-d",
        defaultDate: today,
        maxDate: today
    });

    // Check if dark mode is enabled
    const isDarkMode = localStorage.getItem('setting-dark-mode') === 'true';
    if (isDarkMode) {
        document.documentElement.classList.add('dark');
    }

    // Load areas for dropdown
    loadAreas();

    // Generate report on button click
    document.getElementById('generate-report-btn').addEventListener('click', function() {
        generateReport();
    });
});

// Load areas for the dropdown from the server
function loadAreas() {
    fetch('http://localhost:8080/api/public/areas')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            const areaDropdown = document.getElementById('area-id');

            // Remove all options except the first one
            while (areaDropdown.options.length > 1) {
                areaDropdown.remove(1);
            }

            // Add areas to dropdown
            if (data && data.data && Array.isArray(data.data)) {
                data.data.forEach(area => {
                    const option = document.createElement('option');
                    option.value = area.id;
                    option.textContent = `${area.name} (${area.district})`;
                    areaDropdown.appendChild(option);
                });
            }
        })
        .catch(error => {
            console.error('Error loading areas:', error);
            showToast('Failed to load areas from server: ' + error.message, 'error');
        });
}

// Generate report based on selected filters
function generateReport() {
    const fromDate = document.getElementById('from-date').value;
    const toDate = document.getElementById('to-date').value;
    const outageType = document.getElementById('outage-type').value;
    const areaId = document.getElementById('area-id').value;

    // Validate date inputs
    if (!fromDate || !toDate) {
        showToast('Please select both start and end dates', 'error');
        return;
    }

    // Show loading indicator
    document.getElementById('loading-indicator').classList.remove('hidden');

    // Hide sections that might be visible from previous report
    document.querySelectorAll('#report-summary, #outage-breakdown, #recent-outages, #no-data-indicator')
        .forEach(el => el.classList.add('hidden'));

    // Build the request URL
    let url = `http://localhost:8080/api/admin/reports?fromDate=${fromDate}&toDate=${toDate}`;
    if (outageType) url += `&outageType=${outageType}`;
    if (areaId) url += `&areaId=${areaId}`;

    // Get the auth token
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json'
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Make the API request
    fetch(url, {
        method: 'GET',
        headers: headers
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            // Hide loading indicator
            document.getElementById('loading-indicator').classList.add('hidden');

            if (data && data.data) {
                // Update the UI with the real data
                updateUI(data.data);

                // Show report sections
                document.querySelectorAll('#report-summary, #outage-breakdown, #recent-outages')
                    .forEach(el => el.classList.remove('hidden'));
            } else {
                // Show no data indicator
                document.getElementById('no-data-indicator').classList.remove('hidden');
                showToast('No report data available for the selected criteria', 'warning');
            }
        })
        .catch(error => {
            // Hide loading indicator
            document.getElementById('loading-indicator').classList.add('hidden');

            // Show error message
            console.error('Error generating report:', error);
            document.getElementById('no-data-indicator').classList.remove('hidden');
            showToast('Error generating report: ' + error.message, 'error');
        });
}

// Update UI with data
function updateUI(data) {
    // Update summary cards
    document.getElementById('total-outages').textContent = data.totalOutages || 0;
    document.getElementById('avg-duration').textContent = formatDuration(data.averageDuration || 0);
    document.getElementById('areas-affected').textContent = data.areasAffected || 0;
    document.getElementById('customers-affected').textContent = formatNumber(data.customersAffected || 0);

    // Update outage types breakdown
    const outageTypesEl = document.getElementById('outage-types-list');
    outageTypesEl.innerHTML = '';

    if (data.outageTypes && Object.keys(data.outageTypes).length > 0) {
        document.getElementById('outage-types-count').textContent = Object.keys(data.outageTypes).length;

        Object.entries(data.outageTypes).forEach(([type, count]) => {
            const percentage = ((count / data.totalOutages) * 100).toFixed(1);
            const typeColor = getOutageTypeColor(type);

            const typeDiv = document.createElement('div');
            typeDiv.className = 'relative';
            typeDiv.innerHTML = `
                <div class="flex items-center justify-between mb-1">
                    <span class="text-sm font-medium text-gray-700 dark:text-gray-300">${formatOutageType(type)}</span>
                    <span class="text-sm font-medium text-gray-700 dark:text-gray-300">${count} (${percentage}%)</span>
                </div>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div class="bg-${typeColor}-500 h-2.5 rounded-full" style="width: ${percentage}%"></div>
                </div>
            `;
            outageTypesEl.appendChild(typeDiv);
        });
    } else {
        document.getElementById('outage-types-count').textContent = 0;
        const noDataMsg = document.createElement('p');
        noDataMsg.className = 'text-gray-500 dark:text-gray-400 text-sm';
        noDataMsg.textContent = 'No outage type data available';
        outageTypesEl.appendChild(noDataMsg);
    }

    // Update affected areas list
    const affectedAreasEl = document.getElementById('affected-areas-list');
    affectedAreasEl.innerHTML = '';

    if (data.affectedAreas && data.affectedAreas.length > 0) {
        document.getElementById('total-areas').textContent = data.affectedAreas.length;

        // Sort areas by outage count, take top 5
        const topAreas = data.affectedAreas
            .sort((a, b) => b.outageCount - a.outageCount)
            .slice(0, 5);

        topAreas.forEach(area => {
            const percentage = ((area.outageCount / data.totalOutages) * 100).toFixed(1);

            const areaDiv = document.createElement('div');
            areaDiv.className = 'relative';
            areaDiv.innerHTML = `
                <div class="flex items-center justify-between mb-1">
                    <span class="text-sm font-medium text-gray-700 dark:text-gray-300">${area.name} (${area.district})</span>
                    <span class="text-sm font-medium text-gray-700 dark:text-gray-300">${area.outageCount} (${percentage}%)</span>
                </div>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div class="bg-purple-500 h-2.5 rounded-full" style="width: ${percentage}%"></div>
                </div>
            `;
            affectedAreasEl.appendChild(areaDiv);
        });
    } else {
        document.getElementById('total-areas').textContent = 0;
        const noDataMsg = document.createElement('p');
        noDataMsg.className = 'text-gray-500 dark:text-gray-400 text-sm';
        noDataMsg.textContent = 'No area data available';
        affectedAreasEl.appendChild(noDataMsg);
    }

    // Update recent outages table
    const tableBodyEl = document.getElementById('outages-table-body');
    tableBodyEl.innerHTML = '';

    if (data.recentOutages && data.recentOutages.length > 0) {
        document.getElementById('outage-count-badge').textContent = `${data.recentOutages.length} outages`;

        data.recentOutages.forEach(outage => {
            const startDate = new Date(outage.startTime);
            const endDate = outage.endTime ? new Date(outage.endTime) : null;
            const duration = outage.duration || calculateDuration(startDate, endDate);

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${outage.id}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">${outage.area ? outage.area.name : 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-${getOutageTypeColor(outage.type)}-100 dark:bg-${getOutageTypeColor(outage.type)}-900 text-${getOutageTypeColor(outage.type)}-800 dark:text-${getOutageTypeColor(outage.type)}-200">
                        ${formatOutageType(outage.type)}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${formatDateTime(startDate)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${endDate ? formatDateTime(endDate) : 'Ongoing'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${formatDuration(duration)}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(outage.status)}">
                        ${formatStatus(outage.status)}
                    </span>
                </td>
            `;
            tableBodyEl.appendChild(tr);
        });
    } else {
        document.getElementById('outage-count-badge').textContent = '0 outages';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td colspan="7" class="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                No outages found for the selected criteria
            </td>
        `;
        tableBodyEl.appendChild(tr);
    }
}

// Helper functions
function formatOutageType(type) {
    if (!type) return 'Unknown';
    // Convert EMERGENCY to Emergency, etc.
    return type.charAt(0) + type.slice(1).toLowerCase();
}

function getOutageTypeColor(type) {
    switch (type) {
        case 'SCHEDULED': return 'blue';
        case 'EMERGENCY': return 'red';
        case 'WEATHER': return 'amber';
        case 'MAINTENANCE': return 'green';
        default: return 'gray';
    }
}

function formatDateTime(date) {
    if (!date) return 'N/A';
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDuration(minutes) {
    if (!minutes) return '0 hrs';

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours === 0) {
        return `${remainingMinutes} mins`;
    } else if (remainingMinutes === 0) {
        return `${hours} hrs`;
    } else {
        return `${hours} hrs ${remainingMinutes} mins`;
    }
}

function calculateDuration(startDate, endDate) {
    if (!startDate) return 0;

    const end = endDate || new Date();
    const diffMs = end - startDate;
    return Math.floor(diffMs / (1000 * 60)); // Minutes
}

function formatStatus(status) {
    if (!status) return 'Unknown';

    switch (status) {
        case 'ACTIVE': return 'Active';
        case 'RESOLVED': return 'Resolved';
        case 'PLANNED': return 'Planned';
        case 'DELAYED': return 'Delayed';
        default: return status.charAt(0) + status.slice(1).toLowerCase();
    }
}

function getStatusClass(status) {
    switch (status) {
        case 'ACTIVE':
            return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
        case 'RESOLVED':
            return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
        case 'PLANNED':
            return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
        case 'DELAYED':
            return 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200';
        default:
            return 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200';
    }
}

function formatNumber(num) {
    return new Intl.NumberFormat().format(num);
}

// Toast notification
function showToast(message, type = 'success') {
    const darkMode = document.documentElement.classList.contains('dark');
    let background;

    switch (type) {
        case 'error':
            background = darkMode
                ? "linear-gradient(to right, #ef4444, #dc2626)"
                : "linear-gradient(to right, #f87171, #ef4444)";
            break;
        case 'warning':
            background = darkMode
                ? "linear-gradient(to right, #f59e0b, #d97706)"
                : "linear-gradient(to right, #fbbf24, #f59e0b)";
            break;
        default: // success
            background = darkMode
                ? "linear-gradient(to right, #6366f1, #4f46e5)"
                : "linear-gradient(to right, #4f46e5, #6366f1)";
    }

    Toastify({
        text: message,
        duration: 3000,
        close: true,
        gravity: "top",
        position: "right",
        style: {
            background: background
        },
        stopOnFocus: true
    }).showToast();
}