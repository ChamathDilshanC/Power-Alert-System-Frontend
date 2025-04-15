 const CONFIG = {
    API_BASE_URL: 'http://localhost:8080',
    MAPBOX_TOKEN: 'pk.eyJ1IjoiY2hhbWF0aDQ5OTciLCJhIjoiY204bXhqN2N2MGtuMDJscGw2bDk1N3RpNyJ9.tzXMf6U8UAd0GY1GR-iuTQ',
    DEFAULT_MAP_CENTER: [80.7718, 7.8731], // Sri Lanka center
    DEFAULT_MAP_ZOOM: 8
};

    // DOM Elements
    const addressList = document.getElementById('address-list');
    const addressFormContainer = document.getElementById('address-form-container');
    const emptyStateContainer = document.getElementById('empty-state-container');
    const addressForm = document.getElementById('address-form');
    const addAddressBtn = document.getElementById('add-address-btn');
    const getStartedBtn = document.getElementById('get-started-btn');
    const closeFormBtn = document.getElementById('close-form-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const submitBtn = document.getElementById('submit-btn');
    const formTitle = document.getElementById('form-title');
    const deleteDialog = document.getElementById('delete-dialog');
    const deleteCancel = document.getElementById('delete-cancel');
    const deleteConfirm = document.getElementById('delete-confirm');
    const currentLocationBtn = document.getElementById('current-location-btn');
    const coordinatesDisplay = document.getElementById('coordinates');

    // Form elements
    const addressIdInput = document.getElementById('address-id');
    const addressLine1Input = document.getElementById('address-line1');
    const addressLine2Input = document.getElementById('address-line2');
    const cityInput = document.getElementById('city');
    const districtInput = document.getElementById('district');
    const postalCodeInput = document.getElementById('postal-code');
    const isPrimaryInput = document.getElementById('is-primary');
    const latitudeInput = document.getElementById('latitude');
    const longitudeInput = document.getElementById('longitude');

    // Map variables
    let map;
    let marker;
    let geocoder;
    let currentDeleteId = null;

    // Initialize the page
    document.addEventListener('DOMContentLoaded', function() {
    initMap();
    loadAddresses();
    setupEventListeners();
});

    // Initialize Mapbox map
    function initMap() {
    mapboxgl.accessToken = CONFIG.MAPBOX_TOKEN;

    map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: CONFIG.DEFAULT_MAP_CENTER,
    zoom: CONFIG.DEFAULT_MAP_ZOOM
});

    // Add navigation controls
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Initialize geocoder (search box)
    geocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    mapboxgl: mapboxgl,
    marker: false,
    placeholder: 'Search for a location',
    bbox: [79.6, 5.9, 81.9, 9.9], // Sri Lanka bounding box
    countries: 'lk',
    language: 'en-US'
});

    document.getElementById('geocoder').appendChild(geocoder.onAdd(map));

    // Add marker that can be dragged
    marker = new mapboxgl.Marker({
    draggable: true,
    color: '#3B82F6'
})
    .setLngLat(CONFIG.DEFAULT_MAP_CENTER)
    .addTo(map);

    // Update coordinates when marker is dragged
    marker.on('dragend', updateCoordinates);

    // Update marker and coordinates when map is clicked
    map.on('click', function(e) {
    marker.setLngLat(e.lngLat);
    updateCoordinates();
    reverseGeocode(e.lngLat);
});

    // Update address fields when a location is selected from search
    geocoder.on('result', function(e) {
    marker.setLngLat(e.result.center);
    map.flyTo({
    center: e.result.center,
    zoom: 15
});
    updateCoordinates();

    // Extract and populate address components
    const place = e.result;
    populateAddressFromGeocode(place);
});

    // Initial coordinates display
    updateCoordinates();
}

    // Update coordinates display and form inputs
    function updateCoordinates() {
    const lngLat = marker.getLngLat();
    coordinatesDisplay.textContent = `Longitude: ${lngLat.lng.toFixed(6)}, Latitude: ${lngLat.lat.toFixed(6)}`;

    // Update hidden form inputs
    longitudeInput.value = lngLat.lng.toFixed(6);
    latitudeInput.value = lngLat.lat.toFixed(6);
}

    // Get current user location
    function getCurrentLocation() {
    if (!navigator.geolocation) {
    showNotification('Geolocation is not supported by your browser', 'error');
    return;
}

    currentLocationBtn.innerHTML = '<span class="loading-spinner"></span>Getting location...';
    currentLocationBtn.disabled = true;

    navigator.geolocation.getCurrentPosition(
    // Success callback
    function(position) {
    const lngLat = {
    lng: position.coords.longitude,
    lat: position.coords.latitude
};

    // Update marker and map
    marker.setLngLat(lngLat);
    map.flyTo({
    center: lngLat,
    zoom: 15
});
    updateCoordinates();
    reverseGeocode(lngLat);

    // Reset button
    currentLocationBtn.innerHTML = '<i class="bx bx-current-location mr-1"></i> Use current location';
    currentLocationBtn.disabled = false;
},
    // Error callback
    function(error) {
    console.error('Error getting location:', error);
    showNotification('Error getting your location: ' + getLocationErrorMessage(error), 'error');
    currentLocationBtn.innerHTML = '<i class="bx bx-current-location mr-1"></i> Use current location';
    currentLocationBtn.disabled = false;
},
    // Options
{
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
}
    );
}

    // Get user-friendly error message for geolocation errors
    function getLocationErrorMessage(error) {
    switch(error.code) {
    case error.PERMISSION_DENIED:
    return "You denied the request for geolocation.";
    case error.POSITION_UNAVAILABLE:
    return "Location information is unavailable.";
    case error.TIMEOUT:
    return "The request to get your location timed out.";
    case error.UNKNOWN_ERROR:
    return "An unknown error occurred.";
    default:
    return "Error getting your location.";
}
}

    // Reverse geocode coordinates to get address details
    function reverseGeocode(lngLat) {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lngLat.lng},${lngLat.lat}.json?access_token=${mapboxgl.accessToken}&country=lk&types=address,place,locality,neighborhood,district,postcode`;

    fetch(url)
    .then(response => response.json())
    .then(data => {
    if (data.features && data.features.length > 0) {
    populateAddressFromGeocode(data.features[0]);
}
})
    .catch(error => {
    console.error('Error reverse geocoding:', error);
});
}

    // Extract and populate address components from geocoder result
    function populateAddressFromGeocode(place) {
    if (!place) return;

    let addressLine1 = '';
    let city = '';
    let district = '';
    let postalCode = '';

    // Extract address components
    if (place.properties && place.properties.address) {
    addressLine1 = place.properties.address;
}

    if (place.context) {
    for (const context of place.context) {
    const id = context.id || '';
    const text = context.text || '';

    if (id.startsWith('place')) {
    city = text;
} else if (id.startsWith('district')) {
    district = text;
} else if (id.startsWith('postcode')) {
    postalCode = text;
}
}
}

    // If place has a place_name, use it for address line 1 if empty
    if (!addressLine1 && place.place_name) {
    const parts = place.place_name.split(',');
    if (parts.length > 0) {
    addressLine1 = parts[0].trim();
}
}

    // If place has text property and address line 1 is still empty, use text
    if (!addressLine1 && place.text) {
    addressLine1 = place.text;
}

    // Set form values if we have data
    if (addressLine1) addressLine1Input.value = addressLine1;
    if (city) cityInput.value = city;
    if (district) {
    // Find and select the matching district
    const districtOption = Array.from(districtInput.options).find(
    option => option.value === district || district.includes(option.value) || option.value.includes(district)
    );
    if (districtOption) {
    districtInput.value = districtOption.value;
}
}
    if (postalCode) postalCodeInput.value = postalCode;
}

    // Load user addresses
    async function loadAddresses() {
    try {
    // Get the auth token
    const token = localStorage.getItem('auth_token');
    if (!token) {
    window.location.href = '../index.html';
    return;
}

    // Fetch addresses from API
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/user/addresses`, {
    method: 'GET',
    headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
}
});

    const data = await response.json();

    if (response.ok && data && data.data) {
    const addresses = data.data;

    // Update UI based on whether there are addresses
    if (addresses.length === 0) {
    showEmptyState();
} else {
    renderAddressList(addresses);
}
} else {
    throw new Error(data.message || 'Failed to load addresses');
}
} catch (error) {
    console.error('Error loading addresses:', error);
    showNotification('Error loading addresses: ' + error.message, 'error');
    addressList.innerHTML = `
                    <div class="text-center py-6">
                        <p class="text-red-500">Error loading addresses</p>
                        <button class="mt-2 text-primary-600 hover:text-primary-700" onclick="loadAddresses()">
                            <i class="bx bx-refresh mr-1"></i> Try Again
                        </button>
                    </div>
                `;
}
}

    // Render the list of addresses
    function renderAddressList(addresses) {
    addressList.innerHTML = '';

    addresses.forEach(address => {
    const card = document.createElement('div');
    card.className = 'bg-gray-50 border border-gray-200 rounded-lg p-4 relative';

    // Primary badge
    if (address.isPrimary) {
    card.innerHTML += `
                        <span class="absolute top-4 right-4 bg-primary-100 text-primary-800 text-xs font-medium px-2 py-0.5 rounded-full">
                            Primary
                        </span>
                    `;
}

    // Address details
    card.innerHTML += `
                    <div class="mb-2">
                        <h3 class="font-medium text-gray-900">${address.addressLine1}</h3>
                        ${address.addressLine2 ? `<p class="text-gray-500 text-sm">${address.addressLine2}</p>` : ''}
                        <p class="text-gray-500 text-sm">${address.city}, ${address.district} ${address.postalCode || ''}</p>
                    </div>
                    <div class="flex space-x-2">
                        <button class="edit-address-btn text-primary-600 hover:text-primary-800 text-sm" data-id="${address.id}">
                            <i class="bx bx-edit"></i> Edit
                        </button>
                        <button class="delete-address-btn text-red-600 hover:text-red-800 text-sm" data-id="${address.id}">
                            <i class="bx bx-trash"></i> Delete
                        </button>
                    </div>
                `;

    addressList.appendChild(card);

    // Add event listeners
    const editBtn = card.querySelector('.edit-address-btn');
    const deleteBtn = card.querySelector('.delete-address-btn');

    editBtn.addEventListener('click', () => editAddress(address.id));
    deleteBtn.addEventListener('click', () => showDeleteConfirmation(address.id));
});
}

    // Show empty state when user has no addresses
    function showEmptyState() {
    addressList.innerHTML = `
                <div class="text-center py-4 text-gray-500">
                    <p>You haven't added any addresses yet.</p>
                </div>
            `;
    addressFormContainer.classList.add('hidden');
    emptyStateContainer.classList.remove('hidden');
}

    // Show the address form
    function showAddressForm(isEdit = false) {
    addressFormContainer.classList.remove('hidden');
    emptyStateContainer.classList.add('hidden');
    formTitle.textContent = isEdit ? 'Edit Address' : 'Add New Address';
    submitBtn.textContent = isEdit ? 'Update Address' : 'Save Address';
}

    // Hide the address form
    function hideAddressForm() {
    addressFormContainer.classList.add('hidden');
    resetForm();
}

    // Reset the form fields
    function resetForm() {
    addressForm.reset();
    addressIdInput.value = '';

    // Reset map to default location
    marker.setLngLat(CONFIG.DEFAULT_MAP_CENTER);
    map.flyTo({
    center: CONFIG.DEFAULT_MAP_CENTER,
    zoom: CONFIG.DEFAULT_MAP_ZOOM
});
    updateCoordinates();

    // Clear validation errors
    clearFormErrors();
}

    // Clear form validation errors
    function clearFormErrors() {
    const errorElements = addressForm.querySelectorAll('[id$="-error"]');
    errorElements.forEach(el => {
    el.classList.add('hidden');
    el.textContent = '';
});

    const inputElements = addressForm.querySelectorAll('input, select');
    inputElements.forEach(el => {
    el.classList.remove('border-red-500');
});
}

    // Load an address for editing
    async function editAddress(id) {
    try {
    // Get the auth token
    const token = localStorage.getItem('auth_token');
    if (!token) {
    window.location.href = '../index.html';
    return;
}

    // Fetch address from API
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/user/addresses/${id}`, {
    method: 'GET',
    headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
}
});

    const data = await response.json();

    if (response.ok && data && data.data) {
    const address = data.data;

    // Populate form fields
    addressIdInput.value = address.id;
    addressLine1Input.value = address.addressLine1 || '';
    addressLine2Input.value = address.addressLine2 || '';
    cityInput.value = address.city || '';
    districtInput.value = address.district || '';
    postalCodeInput.value = address.postalCode || '';
    isPrimaryInput.checked = address.isPrimary || false;
    latitudeInput.value = address.latitude || '';
    longitudeInput.value = address.longitude || '';

    // Update map
    if (address.latitude && address.longitude) {
    const lngLat = {
    lng: address.longitude,
    lat: address.latitude
};

    marker.setLngLat(lngLat);
    map.flyTo({
    center: lngLat,
    zoom: 15
});
    updateCoordinates();
}

    // Show edit form
    showAddressForm(true);
} else {
    throw new Error(data.message || 'Failed to load address');
}
} catch (error) {
    console.error('Error loading address:', error);
    showNotification('Error loading address: ' + error.message, 'error');
}
}

    // Show delete confirmation dialog
    function showDeleteConfirmation(id) {
    currentDeleteId = id;
    deleteDialog.classList.remove('hidden');

    // Add animation class
    setTimeout(() => {
    const modalContent = deleteDialog.querySelector('.modal-content');
    if (modalContent) {
    modalContent.classList.remove('scale-95', 'opacity-0');
    modalContent.classList.add('scale-100', 'opacity-100');
}
}, 10);
}

    // Hide delete confirmation dialog
    function hideDeleteConfirmation() {
    const modalContent = deleteDialog.querySelector('.modal-content');
    if (modalContent) {
    modalContent.classList.remove('scale-100', 'opacity-100');
    modalContent.classList.add('scale-95', 'opacity-0');

    // Remove after animation
    setTimeout(() => {
    deleteDialog.classList.add('hidden');
    currentDeleteId = null;
}, 300);
} else {
    deleteDialog.classList.add('hidden');
    currentDeleteId = null;
}
}

    // Delete an address
    async function deleteAddress(id) {
    try {
    // Get the auth token
    const token = localStorage.getItem('auth_token');
    if (!token) {
    window.location.href = '../index.html';
    return;
}

    // Delete address from API
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/user/addresses/${id}`, {
    method: 'DELETE',
    headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
}
});

    const data = await response.json();

    if (response.ok) {
    showNotification('Address deleted successfully', 'success');
    loadAddresses(); // Reload addresses
} else {
    throw new Error(data.message || 'Failed to delete address');
}
} catch (error) {
    console.error('Error deleting address:', error);
    showNotification('Error deleting address: ' + error.message, 'error');
} finally {
    hideDeleteConfirmation();
}
}

    // Submit the form
    async function submitForm(event) {
    event.preventDefault();

    // Validate form
    if (!validateForm()) {
    return;
}

    try {
    submitBtn.innerHTML = '<span class="loading-spinner"></span> Saving...';
    submitBtn.disabled = true;

    // Get the auth token
    const token = localStorage.getItem('auth_token');
    if (!token) {
    window.location.href = '../index.html';
    return;
}

    // Prepare form data
    const formData = {
    addressLine1: addressLine1Input.value,
    addressLine2: addressLine2Input.value,
    city: cityInput.value,
    district: districtInput.value,
    postalCode: postalCodeInput.value,
    latitude: parseFloat(latitudeInput.value),
    longitude: parseFloat(longitudeInput.value),
    isPrimary: isPrimaryInput.checked
};

    const isEdit = !!addressIdInput.value;
    let url = `${CONFIG.API_BASE_URL}/api/user/addresses`;
    let method = 'POST';

    // If editing, update URL and method
    if (isEdit) {
    url += `/${addressIdInput.value}`;
    method = 'PUT';
}

    // Send request to API
    const response = await fetch(url, {
    method: method,
    headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
},
    body: JSON.stringify(formData)
});

    const data = await response.json();

    if (response.ok) {
    showNotification(isEdit ? 'Address updated successfully' : 'Address added successfully', 'success');
    hideAddressForm();
    loadAddresses(); // Reload addresses
} else {
    throw new Error(data.message || 'Failed to save address');
}
} catch (error) {
    console.error('Error saving address:', error);
    showNotification('Error saving address: ' + error.message, 'error');
} finally {
    submitBtn.innerHTML = addressIdInput.value ? 'Update Address' : 'Save Address';
    submitBtn.disabled = false;
}
}

    // Validate the form
    function validateForm() {
    let isValid = true;
    clearFormErrors();

    // Validate address line 1
    if (!addressLine1Input.value.trim()) {
    showFieldError(addressLine1Input, 'address-line1', 'Address line 1 is required');
    isValid = false;
}

    // Validate city
    if (!cityInput.value.trim()) {
    showFieldError(cityInput, 'city', 'City is required');
    isValid = false;
}

    // Validate district
    if (!districtInput.value) {
    showFieldError(districtInput, 'district', 'District is required');
    isValid = false;
}

    // Validate coordinates
    if (!latitudeInput.value || !longitudeInput.value) {
    showNotification('Please select a location on the map', 'error');
    isValid = false;
}

    // Check if latitude is valid
    const lat = parseFloat(latitudeInput.value);
    if (isNaN(lat) || lat < -90 || lat > 90) {
    showFieldError(latitudeInput, 'latitude', 'Invalid latitude value');
    isValid = false;
}

    // Check if longitude is valid
    const lng = parseFloat(longitudeInput.value);
    if (isNaN(lng) || lng < -180 || lng > 180) {
    showFieldError(longitudeInput, 'longitude', 'Invalid longitude value');
    isValid = false;
}

    return isValid;
}

    // Show validation error for a field
    function showFieldError(inputElement, fieldName, errorMessage) {
    const errorElement = document.getElementById(`${fieldName}-error`);

    if (errorElement) {
    errorElement.textContent = errorMessage;
    errorElement.classList.remove('hidden');
}

    inputElement.classList.add('border-red-500');
}

    // Show notification toast
    function showNotification(message, type = 'info') {
    // Define colors based on type
    let background;
    let color = '#ffffff';
    let icon = '';

    switch(type) {
    case 'success':
    background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    icon = '<i class="bx bx-check-circle mr-2"></i>';
    break;
    case 'error':
    background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
    icon = '<i class="bx bx-error-circle mr-2"></i>';
    break;
    case 'warning':
    background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
    icon = '<i class="bx bx-error mr-2"></i>';
    break;
    default: // info
    background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
    icon = '<i class="bx bx-info-circle mr-2"></i>';
}

    Toastify({
    text: `<div class="flex items-center">${icon}${message}</div>`,
    duration: 3000,
    gravity: "top",
    position: "right",
    stopOnFocus: true,
    escapeMarkup: false,
    style: {
    background: background,
    color: color,
    borderRadius: '8px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    padding: '12px 16px',
    fontFamily: 'Inter, sans-serif'
}
}).showToast();
}

    // Set up event listeners
    function setupEventListeners() {
    // Show form when add button is clicked
    addAddressBtn.addEventListener('click', () => {
        resetForm();
        showAddressForm(false);
    });

    // Show form when get started button is clicked
    getStartedBtn.addEventListener('click', () => {
    resetForm();
    showAddressForm(false);
});

    // Hide form when close button is clicked
    closeFormBtn.addEventListener('click', hideAddressForm);

    // Hide form when cancel button is clicked
    cancelBtn.addEventListener('click', hideAddressForm);

    // Form submission
    addressForm.addEventListener('submit', submitForm);

    // Get current location
    currentLocationBtn.addEventListener('click', getCurrentLocation);

    // Delete dialog buttons
    deleteCancel.addEventListener('click', hideDeleteConfirmation);
    deleteConfirm.addEventListener('click', () => {
    if (currentDeleteId) {
    deleteAddress(currentDeleteId);
}
});

    // Click outside to close delete dialog
    deleteDialog.addEventListener('click', (event) => {
    if (event.target === deleteDialog) {
    hideDeleteConfirmation();
}
});

    // Form field validation on input
    addressLine1Input.addEventListener('input', () => {
    if (addressLine1Input.classList.contains('border-red-500')) {
    if (addressLine1Input.value.trim()) {
    clearFieldError(addressLine1Input, 'address-line1');
}
}
});

    cityInput.addEventListener('input', () => {
    if (cityInput.classList.contains('border-red-500')) {
    if (cityInput.value.trim()) {
    clearFieldError(cityInput, 'city');
}
}
});

    districtInput.addEventListener('change', () => {
    if (districtInput.classList.contains('border-red-500')) {
    if (districtInput.value) {
    clearFieldError(districtInput, 'district');
}
}
});
}

    // Clear validation error for a field
    function clearFieldError(inputElement, fieldName) {
    const errorElement = document.getElementById(`${fieldName}-error`);

    if (errorElement) {
    errorElement.textContent = '';
    errorElement.classList.add('hidden');
}

    inputElement.classList.remove('border-red-500');
}