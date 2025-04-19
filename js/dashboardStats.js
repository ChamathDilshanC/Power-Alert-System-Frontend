/**
 * Dashboard Statistics
 *
 * This script handles fetching and displaying system statistics for the Power Alert dashboard
 * using existing backend APIs without requiring new backend endpoints.
 */

$(document).ready(function() {
    // Initialize the dashboard
    loadDashboardStats();

    // Set up refresh button
    $('#refresh-stats-btn').on('click', function() {
        loadDashboardStats();
    });

    /**
     * Load all dashboard statistics
     */
    function loadDashboardStats() {
        // Show loading state
        showLoadingState();

        // Fetch all required data using existing APIs
        Promise.all([
            fetchUserStats(),
            fetchAreaStats(),
            fetchOutageStats(),
            fetchAlternativeResourceStats(),
            fetchSystemStatus()
        ]).catch(error => {
            console.error('Error loading dashboard stats:', error);
            showToast('Failed to load dashboard statistics', 'error');
        });
    }

    /**
     * Show loading state for all statistic elements
     */
    function showLoadingState() {
        // Main stats cards
        $('#users-count, #areas-count, #outages-count, #ongoing-count').html('<div class="skeleton h-8 w-16"></div>');
        $('#active-users-count, #districts-count, #monthly-outages-count, #affected-areas-count').text('...');
        $('#users-growth, #areas-details, #outages-trend, #estimated-resolution').text('...');

        // Alternative resources
        $('#solar-count, #generator-count, #battery-count, #other-count').html('<div class="skeleton h-8 w-12"></div>');

        // System status
        $('#last-updated').text('Loading...');
    }

    /**
     * Format numbers with commas for thousands
     */
    function formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    /**
     * Animate count up effect
     */
    function animateCount(element, targetValue, duration = 1000) {
        const startValue = 0;
        const increment = targetValue / (duration / 16);
        let currentValue = startValue;

        const animateStep = () => {
            currentValue += increment;

            if (currentValue >= targetValue) {
                element.text(formatNumber(targetValue));
            } else {
                element.text(formatNumber(Math.floor(currentValue)));
                requestAnimationFrame(animateStep);
            }
        };

        animateStep();
    }

    /**
     * Fetch user statistics using existing API endpoints
     */
    function fetchUserStats() {
        return $.ajax({
            url: `${CONFIG.API_BASE_URL}/api/admin/users`,
            method: 'GET',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
            success: function(response) {
                if (response.code === 200 && response.data) {
                    const users = response.data;

                    // Calculate user statistics from the user list
                    const totalUsers = users.length;
                    const activeUsers = users.filter(user => user.active).length;

                    // Calculate user growth (this is an estimate based on creation dates)
                    const now = new Date();
                    const currentMonth = now.getMonth();
                    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
                    const thisYear = now.getFullYear();
                    const lastYear = currentMonth === 0 ? thisYear - 1 : thisYear;

                    const thisMonthUsers = users.filter(user => {
                        if (!user.createdAt) return false;
                        const date = new Date(user.createdAt);
                        return date.getMonth() === currentMonth && date.getFullYear() === thisYear;
                    }).length;

                    const lastMonthUsers = users.filter(user => {
                        if (!user.createdAt) return false;
                        const date = new Date(user.createdAt);
                        return date.getMonth() === lastMonth && date.getFullYear() === lastYear;
                    }).length;

                    const growthPercent = lastMonthUsers > 0
                        ? ((thisMonthUsers - lastMonthUsers) / lastMonthUsers) * 100
                        : (thisMonthUsers > 0 ? 100 : 0);

                    // Update user stats
                    $('#users-count').html(''); // Clear skeleton
                    animateCount($('#users-count'), totalUsers);
                    $('#active-users-count').text(formatNumber(activeUsers));

                    // Display growth percentage
                    $('#users-growth').html(`
                        <i class='bx ${growthPercent >= 0 ? 'bx-up-arrow-alt text-green-600' : 'bx-down-arrow-alt text-red-600'}'></i>
                        <span class="${growthPercent >= 0 ? 'text-green-600' : 'text-red-600'}">${Math.abs(growthPercent.toFixed(1))}% this month</span>
                    `);
                }
            },
            error: function(xhr) {
                handleApiError(xhr, 'Failed to load user statistics');
                $('#users-count').text('N/A');
                $('#active-users-count').text('N/A');
                $('#users-growth').html('<span class="text-gray-500">No data</span>');
            }
        });
    }

    /**
     * Fetch area statistics using existing API endpoints
     */
    function fetchAreaStats() {
        return $.ajax({
            url: `${CONFIG.API_BASE_URL}/api/public/areas`,
            method: 'GET',
            success: function(response) {
                if (response.code === 200 && response.data) {
                    const areas = response.data;

                    // Calculate area statistics
                    const totalAreas = areas.length;

                    // Count unique districts and provinces
                    const districts = new Set();
                    const provinces = new Set();

                    areas.forEach(area => {
                        if (area.district) districts.add(area.district);
                        if (area.province) provinces.add(area.province);
                    });

                    // Update area stats
                    $('#areas-count').html(''); // Clear skeleton
                    animateCount($('#areas-count'), totalAreas);
                    $('#districts-count').text(formatNumber(districts.size));

                    // Display province coverage
                    $('#areas-details').text(`${provinces.size} provinces`);
                }
            },
            error: function(xhr) {
                handleApiError(xhr, 'Failed to load area statistics');
                $('#areas-count').text('N/A');
                $('#districts-count').text('N/A');
                $('#areas-details').text('No data');
            }
        });
    }

    /**
     * Fetch outage statistics using existing API endpoints
     */
    function fetchOutageStats() {
        // First, get all outages
        return $.ajax({
            url: `${CONFIG.API_BASE_URL}/api/public/outages/all`,
            method: 'GET',
            success: function(response) {
                if (response.code === 200 && response.data) {
                    const outages = response.data;

                    // Calculate outage statistics
                    const totalOutages = outages.length;
                    const ongoingOutages = outages.filter(outage => outage.status === 'ONGOING').length;

                    // Calculate monthly outages
                    const now = new Date();
                    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

                    const monthlyOutages = outages.filter(outage => {
                        if (!outage.createdAt) return false;
                        const date = new Date(outage.createdAt);
                        return date >= startOfMonth;
                    }).length;

                    // Calculate trend
                    const lastMonthOutages = outages.filter(outage => {
                        if (!outage.createdAt) return false;
                        const date = new Date(outage.createdAt);
                        return date >= lastMonth && date < startOfMonth;
                    }).length;

                    const trendPercent = lastMonthOutages > 0
                        ? ((monthlyOutages - lastMonthOutages) / lastMonthOutages) * 100
                        : (monthlyOutages > 0 ? 100 : 0);

                    // Count affected areas by ongoing outages
                    const affectedAreas = new Set();
                    outages.filter(outage => outage.status === 'ONGOING')
                        .forEach(outage => {
                            if (outage.affectedArea && outage.affectedArea.id) {
                                affectedAreas.add(outage.affectedArea.id);
                            }
                        });

                    // Calculate next resolution time
                    let nextResolutionHours = 0;
                    const ongoingOutagesList = outages.filter(outage => outage.status === 'ONGOING');
                    if (ongoingOutagesList.length > 0) {
                        // Find the outage with the earliest estimated end time
                        let earliestEndTime = null;

                        ongoingOutagesList.forEach(outage => {
                            if (outage.estimatedEndTime) {
                                const endTime = new Date(outage.estimatedEndTime);
                                if (endTime > now && (!earliestEndTime || endTime < earliestEndTime)) {
                                    earliestEndTime = endTime;
                                }
                            }
                        });

                        if (earliestEndTime) {
                            // Calculate hours until resolution
                            const diffMs = earliestEndTime - now;
                            nextResolutionHours = Math.round(diffMs / 1000 / 60 / 60);
                        } else {
                            nextResolutionHours = 24; // Default
                        }
                    }

                    // Update outage stats
                    $('#outages-count').html(''); // Clear skeleton
                    animateCount($('#outages-count'), totalOutages);
                    $('#monthly-outages-count').text(formatNumber(monthlyOutages));

                    // Set trend indicator
                    const trendIcon = trendPercent > 0 ? 'bx-trending-up' : 'bx-trending-down';
                    const trendColor = trendPercent > 0 ? 'text-red-600' : 'text-green-600';

                    $('#outages-trend').html(`
                        <i class='bx ${trendIcon} ${trendColor}'></i>
                        <span class="${trendColor}">${Math.abs(trendPercent.toFixed(1))}% vs last month</span>
                    `);

                    // Update ongoing outages
                    $('#ongoing-count').html(''); // Clear skeleton
                    animateCount($('#ongoing-count'), ongoingOutages);
                    $('#affected-areas-count').text(formatNumber(affectedAreas.size));

                    // Display estimated resolution
                    if (ongoingOutages > 0) {
                        $('#estimated-resolution').text(`Next resolution in ${nextResolutionHours}h`);
                    } else {
                        $('#estimated-resolution').text('No ongoing outages');
                    }
                }
            },
            error: function(xhr) {
                handleApiError(xhr, 'Failed to load outage statistics');
                $('#outages-count, #ongoing-count').text('N/A');
                $('#monthly-outages-count, #affected-areas-count').text('N/A');
                $('#outages-trend, #estimated-resolution').text('No data');
            }
        });
    }

    /**
     * Fetch alternative resource statistics using existing API endpoints
     */
    function fetchAlternativeResourceStats() {
        return $.ajax({
            url: `${CONFIG.API_BASE_URL}/api/public/alternative-resources`,
            method: 'GET',
            success: function(response) {
                if (response.code === 200 && response.data) {
                    const resources = response.data;

                    // Count resources by type
                    const solarCount = resources.filter(resource => resource.type === 'SOLAR' && resource.active).length;
                    const generatorCount = resources.filter(resource => resource.type === 'GENERATOR' && resource.active).length;
                    const batteryCount = resources.filter(resource => resource.type === 'BATTERY' && resource.active).length;
                    const otherCount = resources.filter(resource => resource.type === 'OTHER' && resource.active).length;

                    // Update resource type counts
                    $('#solar-count').html(''); // Clear skeleton
                    animateCount($('#solar-count'), solarCount);

                    $('#generator-count').html(''); // Clear skeleton
                    animateCount($('#generator-count'), generatorCount);

                    $('#battery-count').html(''); // Clear skeleton
                    animateCount($('#battery-count'), batteryCount);

                    $('#other-count').html(''); // Clear skeleton
                    animateCount($('#other-count'), otherCount);
                }
            },
            error: function(xhr) {
                handleApiError(xhr, 'Failed to load resource statistics');
                $('#solar-count, #generator-count, #battery-count, #other-count').text('N/A');
            }
        });
    }

    /**
     * Generate system status information (hardcoded since there's no API for this)
     */
    function fetchSystemStatus() {
        // For demonstration purposes, we'll generate mock system status data
        // In a real app, you might have an API for this or determine it based on other data
        try {
            // Hard-coded values assuming all systems are operational
            const status = {
                apiStatus: true,
                notificationStatus: true,
                databaseStatus: true,
                integrationStatus: true,
                allServicesOperational: true,
                lastUpdated: new Date().toISOString()
            };

            // Update overall system status
            updateServiceStatus('system-status', status.allServicesOperational);

            // Update individual service statuses
            updateServiceStatus('api-status', status.apiStatus, 'API Services');
            updateServiceStatus('notification-status', status.notificationStatus, 'Notification System');
            updateServiceStatus('database-status', status.databaseStatus, 'Database');
            updateServiceStatus('integration-status', status.integrationStatus, 'External Integrations');

            // Update last updated time
            $('#last-updated').text(formatDateTime(new Date()));

            return Promise.resolve(status);
        } catch (error) {
            console.error('Error generating system status:', error);
            $('#system-status').attr('class', 'px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm font-medium').text('Unknown');
            $('#api-status, #notification-status, #database-status, #integration-status').text('Unknown').attr('class', 'text-sm text-gray-500');
            $('#last-updated').text('Failed to update');

            return Promise.reject(error);
        }
    }

    /**
     * Update service status display
     */
    function updateServiceStatus(elementId, isOperational, serviceName = '') {
        const el = $(`#${elementId}`);

        if (elementId === 'system-status') {
            // Update the main system status badge
            el.attr('class', isOperational
                ? 'px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium'
                : 'px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-medium'
            );
            el.text(isOperational ? 'Operational' : 'Service Disruption');
        } else {
            // Update individual service status text
            el.attr('class', isOperational ? 'text-sm text-green-600' : 'text-sm text-red-600');
            el.text(isOperational ? 'Operational' : 'Disrupted');

            // Also update the status indicator dot
            el.prev().find('.w-2').attr('class', isOperational
                ? 'w-2 h-2 rounded-full bg-green-500 mr-2'
                : 'w-2 h-2 rounded-full bg-red-500 mr-2'
            );
        }
    }

    /**
     * Format date and time for display
     */
    function formatDateTime(date) {
        // Format date as "Apr 19, 2025 15:30:45"
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
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
        }

        console.error(`${defaultMessage}: ${errorMessage}`);
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
});