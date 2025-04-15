/**
 * tableGenerator.js - Functions for generating dynamic tables
 *
 * This module provides functions for generating and managing dynamic tables,
 * including filtering, sorting, and pagination.
 */

import { formatDate, getRelativeTimeString, getInitials, truncateText } from '../utils/helpers.js';

/**
 * Generate a data table with sorting, filtering, and pagination
 * @param {Object} options - Table configuration
 * @param {string} options.containerId - Container element ID
 * @param {Array} options.data - Table data array
 * @param {Array} options.columns - Column definitions
 * @param {number} options.pageSize - Rows per page
 * @param {Function} options.rowClick - Row click handler
 * @param {Object} options.filters - Filter values
 * @param {Function} options.emptyState - Function to display empty state
 * @param {Function} options.errorState - Function to display error state
 * @returns {Object} Table control object
 */
export function createDataTable({
                                    containerId,
                                    data = [],
                                    columns = [],
                                    pageSize = 10,
                                    rowClick = null,
                                    filters = {},
                                    emptyState = null,
                                    errorState = null
                                }) {
    // Get container element
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container with ID "${containerId}" not found`);
        return null;
    }

    // Initialize table state
    const state = {
        data: [...data],
        filteredData: [...data],
        columns,
        currentPage: 1,
        pageSize,
        sortColumn: null,
        sortDirection: 'asc',
        filters
    };

    // Create table components
    const tableContainer = document.createElement('div');
    tableContainer.className = 'overflow-x-auto';
    container.appendChild(tableContainer);

    const table = document.createElement('table');
    table.className = 'min-w-full divide-y divide-gray-200';
    tableContainer.appendChild(table);

    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'px-6 py-3 flex items-center justify-between border-t border-gray-200';
    container.appendChild(paginationContainer);

    // Initial render
    renderTable();

    /**
     * Render the table based on current state
     */
    function renderTable() {
        // Apply filters
        applyFilters();

        // Apply sorting
        applySorting();

        // Render headers
        renderTableHeaders();

        // Render rows
        renderTableBody();

        // Render pagination
        renderPagination();
    }

    /**
     * Apply filters to data
     */
    function applyFilters() {
        state.filteredData = state.data.filter(item => {
            // Apply each filter
            for (const [key, value] of Object.entries(state.filters)) {
                if (value === undefined || value === null || value === '') {
                    continue;
                }

                // Get item value
                const itemValue = item[key];

                // Skip if item value is undefined or null
                if (itemValue === undefined || itemValue === null) {
                    return false;
                }

                // Handle different filter types
                if (typeof value === 'function') {
                    // Custom filter function
                    if (!value(itemValue, item)) {
                        return false;
                    }
                } else if (Array.isArray(value)) {
                    // Array values (multi-select)
                    if (!value.includes(itemValue)) {
                        return false;
                    }
                } else if (typeof value === 'string') {
                    // String (text search)
                    const searchValue = String(itemValue).toLowerCase();
                    if (!searchValue.includes(value.toLowerCase())) {
                        return false;
                    }
                } else if (typeof value === 'boolean') {
                    // Boolean
                    if (itemValue !== value) {
                        return false;
                    }
                } else if (typeof value === 'object' && value !== null) {
                    // Range object {min, max}
                    if (value.min !== undefined && itemValue < value.min) {
                        return false;
                    }
                    if (value.max !== undefined && itemValue > value.max) {
                        return false;
                    }
                } else {
                    // Exact match
                    if (itemValue !== value) {
                        return false;
                    }
                }
            }

            return true;
        });

        // Reset to first page after filtering
        state.currentPage = 1;
    }

    /**
     * Apply sorting to filtered data
     */
    function applySorting() {
        if (state.sortColumn) {
            const column = state.columns.find(col => col.field === state.sortColumn);

            if (column) {
                state.filteredData.sort((a, b) => {
                    let valueA = a[state.sortColumn];
                    let valueB = b[state.sortColumn];

                    // Apply valueGetter if provided
                    if (column.valueGetter) {
                        valueA = column.valueGetter(a);
                        valueB = column.valueGetter(b);
                    }

                    // Handle null or undefined values
                    if (valueA === null || valueA === undefined) {
                        return state.sortDirection === 'asc' ? -1 : 1;
                    }
                    if (valueB === null || valueB === undefined) {
                        return state.sortDirection === 'asc' ? 1 : -1;
                    }

                    // Sort based on data type
                    if (typeof valueA === 'string' && typeof valueB === 'string') {
                        return state.sortDirection === 'asc'
                            ? valueA.localeCompare(valueB)
                            : valueB.localeCompare(valueA);
                    } else {
                        return state.sortDirection === 'asc'
                            ? valueA - valueB
                            : valueB - valueA;
                    }
                });
            }
        }
    }

    /**
     * Render table headers
     */
    function renderTableHeaders() {
        const thead = document.createElement('thead');
        thead.className = 'bg-gray-50';

        const headerRow = document.createElement('tr');

        // Create header cells
        state.columns.forEach(column => {
            const th = document.createElement('th');
            th.scope = 'col';
            th.className = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';

            if (column.sortable) {
                th.classList.add('cursor-pointer', 'hover:bg-gray-100');

                // Create header content with sort icon
                const sortIcon = state.sortColumn === column.field
                    ? state.sortDirection === 'asc' ? 'bx-sort-up' : 'bx-sort-down'
                    : 'bx-sort';

                const headerContent = document.createElement('div');
                headerContent.className = 'flex items-center';
                headerContent.innerHTML = `
                    <span>${column.headerName}</span>
                    <i class='bx ${sortIcon} ml-1'></i>
                `;
                th.appendChild(headerContent);

                // Add sort handler
                th.addEventListener('click', () => {
                    if (state.sortColumn === column.field) {
                        // Toggle direction
                        state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
                    } else {
                        // New sort column
                        state.sortColumn = column.field;
                        state.sortDirection = 'asc';
                    }

                    renderTable();
                });
            } else {
                th.textContent = column.headerName;
            }

            // Add width if specified
            if (column.width) {
                th.style.width = column.width;
            }

            // Add text alignment if specified
            if (column.align) {
                th.style.textAlign = column.align;
            }

            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);

        // Clear existing table content and add header
        table.innerHTML = '';
        table.appendChild(thead);
    }

    /**
     * Render table body
     */
    function renderTableBody() {
        const tbody = document.createElement('tbody');
        tbody.className = 'bg-white divide-y divide-gray-200';

        // Calculate pagination slices
        const startIndex = (state.currentPage - 1) * state.pageSize;
        const endIndex = startIndex + state.pageSize;
        const paginatedData = state.filteredData.slice(startIndex, endIndex);

        // Check if no data
        if (paginatedData.length === 0) {
            const emptyRow = document.createElement('tr');
            const emptyCell = document.createElement('td');
            emptyCell.colSpan = state.columns.length;
            emptyCell.className = 'px-6 py-4 text-center text-gray-500';

            if (state.data.length === 0) {
                // No data at all
                if (emptyState) {
                    emptyCell.appendChild(emptyState());
                } else {
                    emptyCell.textContent = 'No data available';
                }
            } else {
                // No data after filtering
                emptyCell.textContent = 'No matching records found';
            }

            emptyRow.appendChild(emptyCell);
            tbody.appendChild(emptyRow);
            table.appendChild(tbody);
            return;
        }

        // Create rows
        paginatedData.forEach(item => {
            const row = document.createElement('tr');

            // Add hover effect
            row.className = 'hover:bg-gray-50';

            // Add row click handler
            if (rowClick) {
                row.classList.add('cursor-pointer');
                row.addEventListener('click', () => rowClick(item));
            }

            // Create cells
            state.columns.forEach(column => {
                const cell = document.createElement('td');
                cell.className = 'px-6 py-4 whitespace-nowrap';

                // Apply additional cell class if specified
                if (column.cellClass) {
                    cell.classList.add(column.cellClass);
                }

                // Set cell content
                if (column.cellRenderer) {
                    // Custom cell renderer
                    cell.appendChild(column.cellRenderer(item));
                } else {
                    // Default cell content
                    let value = item[column.field];

                    // Apply valueGetter if provided
                    if (column.valueGetter) {
                        value = column.valueGetter(item);
                    }

                    // Apply valueFormatter if provided
                    if (column.valueFormatter) {
                        cell.textContent = column.valueFormatter(value, item);
                    } else {
                        // Format based on data type
                        if (value instanceof Date) {
                            cell.textContent = formatDate(value);
                        } else if (typeof value === 'boolean') {
                            cell.textContent = value ? 'Yes' : 'No';
                        } else {
                            cell.textContent = value !== undefined && value !== null ? value : '';
                        }
                    }
                }

                row.appendChild(cell);
            });

            tbody.appendChild(row);
        });

        table.appendChild(tbody);
    }

    /**
     * Render pagination controls
     */
    function renderPagination() {
        const totalPages = Math.ceil(state.filteredData.length / state.pageSize);

        // Calculate display range
        const startItem = state.filteredData.length === 0
            ? 0
            : (state.currentPage - 1) * state.pageSize + 1;
        const endItem = Math.min(state.currentPage * state.pageSize, state.filteredData.length);

        paginationContainer.innerHTML = `
            <div class="flex-1 flex flex-col sm:flex-row justify-between items-center">
                <div class="text-sm text-gray-700 mb-2 sm:mb-0">
                    Showing <span class="font-medium">${startItem}</span> to <span class="font-medium">${endItem}</span> of <span class="font-medium">${state.filteredData.length}</span> items
                </div>
                <div class="flex space-x-2">
                    <button id="prev-page" class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${state.currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}" ${state.currentPage === 1 ? 'disabled' : ''}>
                        Previous
                    </button>
                    <div id="page-numbers" class="hidden sm:flex space-x-1">
                        <!-- Page numbers will be inserted here -->
                    </div>
                    <button id="next-page" class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${state.currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}" ${state.currentPage === totalPages ? 'disabled' : ''}>
                        Next
                    </button>
                </div>
            </div>
        `;

        // Add page number buttons
        const pageNumbersContainer = paginationContainer.querySelector('#page-numbers');

        // Determine range of pages to show
        let startPage = Math.max(1, state.currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);

        // Adjust if we're near the end
        if (endPage - startPage < 4 && startPage > 1) {
            startPage = Math.max(1, endPage - 4);
        }

        // Always show first page
        if (startPage > 1) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-number relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50`;
            pageBtn.textContent = '1';
            pageBtn.addEventListener('click', () => goToPage(1));
            pageNumbersContainer.appendChild(pageBtn);

            // Add ellipsis if needed
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'page-ellipsis relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700';
                ellipsis.textContent = '...';
                pageNumbersContainer.appendChild(ellipsis);
            }
        }

        // Add page numbers
        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === state.currentPage;

            const pageBtn = document.createElement('button');
            pageBtn.className = `page-number relative inline-flex items-center px-4 py-2 border ${isActive ? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'} text-sm font-medium rounded-md`;
            pageBtn.textContent = i;

            if (!isActive) {
                pageBtn.addEventListener('click', () => goToPage(i));
            }

            pageNumbersContainer.appendChild(pageBtn);
        }

        // Add last page if needed
        if (endPage < totalPages) {
            // Add ellipsis if needed
            if (endPage < totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'page-ellipsis relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700';
                ellipsis.textContent = '...';
                pageNumbersContainer.appendChild(ellipsis);
            }

            const pageBtn = document.createElement('button');
            pageBtn.className = `page-number relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50`;
            pageBtn.textContent = totalPages;
            pageBtn.addEventListener('click', () => goToPage(totalPages));
            pageNumbersContainer.appendChild(pageBtn);
        }

        // Add event listeners for pagination buttons
        const prevPageBtn = paginationContainer.querySelector('#prev-page');
        const nextPageBtn = paginationContainer.querySelector('#next-page');

        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', () => {
                if (state.currentPage > 1) {
                    goToPage(state.currentPage - 1);
                }
            });
        }

        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => {
                if (state.currentPage < totalPages) {
                    goToPage(state.currentPage + 1);
                }
            });
        }
    }

    /**
     * Go to a specific page
     * @param {number} page - Page number
     */
    function goToPage(page) {
        const totalPages = Math.ceil(state.filteredData.length / state.pageSize);

        if (page < 1 || page > totalPages) {
            return;
        }

        state.currentPage = page;
        renderTable();
    }

    /**
     * Update table data
     * @param {Array} newData - New data array
     */
    function updateData(newData) {
        state.data = [...newData];
        state.currentPage = 1;
        renderTable();
    }

    /**
     * Update table filters
     * @param {Object} newFilters - New filters object
     */
    function updateFilters(newFilters) {
        state.filters = {...newFilters};
        state.currentPage = 1;
        renderTable();
    }

    /**
     * Set page size
     * @param {number} newPageSize - New page size
     */
    function setPageSize(newPageSize) {
        state.pageSize = newPageSize;
        state.currentPage = 1;
        renderTable();
    }

    /**
     * Set sort column and direction
     * @param {string} column - Column field
     * @param {string} direction - Sort direction ('asc' or 'desc')
     */
    function setSort(column, direction) {
        state.sortColumn = column;
        state.sortDirection = direction;
        renderTable();
    }

    /**
     * Get current table state
     * @returns {Object} Current state
     */
    function getState() {
        return {...state};
    }

    // Return table control object
    return {
        updateData,
        updateFilters,
        setPageSize,
        setSort,
        getState,
        goToPage,
        renderTable
    };
}

/**
 * Create a standard cell renderer for avatars with initials
 * @param {Object} options - Options for the renderer
 * @param {string} options.nameField - Field containing the name
 * @param {string} options.subtitleField - Field containing the subtitle
 * @returns {Function} Cell renderer function
 */
export function createAvatarCellRenderer(options = {}) {
    const { nameField = 'name', subtitleField = null } = options;

    return function(item) {
        const name = item[nameField] || 'Unknown';
        const subtitle = subtitleField ? item[subtitleField] : null;
        const initials = getInitials(name);

        const cellContent = document.createElement('div');
        cellContent.className = 'flex items-center';

        // Create avatar
        const avatar = document.createElement('div');
        avatar.className = 'flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center';
        avatar.innerHTML = `<span class="font-medium">${initials}</span>`;

        // Create content
        const content = document.createElement('div');
        content.className = 'ml-4';

        // Add name
        const nameElement = document.createElement('div');
        nameElement.className = 'text-sm font-medium text-gray-900';
        nameElement.textContent = name;
        content.appendChild(nameElement);

        // Add subtitle if provided
        if (subtitle) {
            const subtitleElement = document.createElement('div');
            subtitleElement.className = 'text-sm text-gray-500';
            subtitleElement.textContent = item[subtitleField] || '';
            content.appendChild(subtitleElement);
        }

        // Assemble cell
        cellContent.appendChild(avatar);
        cellContent.appendChild(content);

        return cellContent;
    };
}

/**
 * Create a cell renderer for status badges
 * @param {Object} options - Options for the renderer
 * @param {string} options.field - Field containing the status
 * @param {Object} options.statusMap - Map of status values to badge configurations
 * @returns {Function} Cell renderer function
 */
export function createStatusCellRenderer(options = {}) {
    const { field = 'status', statusMap = {} } = options;

    return function(item) {
        const status = item[field];
        const config = statusMap[status] || {
            bg: 'bg-gray-100',
            text: 'text-gray-800',
            label: status
        };

        const cellContent = document.createElement('span');
        cellContent.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`;

        // Add icon if provided
        if (config.icon) {
            const icon = document.createElement('i');
            icon.className = `bx ${config.icon} mr-1`;
            cellContent.appendChild(icon);
        }

        // Add label
        const label = document.createTextNode(config.label || status);
        cellContent.appendChild(label);

        return cellContent;
    };
}

/**
 * Create a cell renderer for action buttons
 * @param {Array} actions - Action configurations
 * @returns {Function} Cell renderer function
 */
export function createActionsCellRenderer(actions = []) {
    return function(item) {
        const cellContent = document.createElement('div');
        cellContent.className = 'flex items-center space-x-2';

        actions.forEach(action => {
            if (action.visible && !action.visible(item)) {
                return;
            }

            const button = document.createElement('button');
            button.type = 'button';
            button.className = action.className || 'text-gray-500 hover:text-gray-700';
            button.title = action.tooltip || action.label || '';

            // Add icon if provided
            if (action.icon) {
                const icon = document.createElement('i');
                icon.className = `bx ${action.icon} text-xl`;
                button.appendChild(icon);
            } else {
                button.textContent = action.label || '';
            }

            // Add click handler
            button.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent row click
                action.onClick(item);
            });

            cellContent.appendChild(button);
        });

        return cellContent;
    };
}

/**
 * Create a date/time formatter
 * @param {Object} options - Formatter options
 * @param {boolean} options.relative - Use relative time
 * @param {Object} options.formatOptions - Date format options
 * @returns {Function} Formatter function
 */
export function createDateFormatter(options = {}) {
    const { relative = false, formatOptions = {} } = options;

    return function(value) {
        if (!value) return '';

        if (relative) {
            return getRelativeTimeString(value);
        } else {
            return formatDate(value, formatOptions);
        }
    };
}