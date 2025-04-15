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