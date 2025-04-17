// darkMode.js - Include this script in all your HTML pages

// Function to apply dark mode settings
function applyDarkMode() {
    // Check if dark mode is enabled in localStorage
    const isDarkMode = localStorage.getItem('setting-dark-mode') === 'true';

    // Apply or remove dark class on html element based on setting
    if (isDarkMode) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

// Apply dark mode settings immediately when script loads
applyDarkMode();

// Listen for storage events (when settings change in another tab/window)
window.addEventListener('storage', function(event) {
    if (event.key === 'setting-dark-mode') {
        applyDarkMode();
    }
});