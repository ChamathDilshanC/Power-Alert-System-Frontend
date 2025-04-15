// js/app.js

// Import modules
import { checkAuth, redirectToLogin } from './auth/authHelper.js';
import { initLoginForm } from './auth/loginHandler.js';

// Initialize the application
function initApp() {
    try {
        // Check if user is already logged in
        checkAuth().then(isAuthenticated => {
            if (isAuthenticated) {
                // User is already authenticated, redirect to dashboard
                window.location.href = 'pages/dashboard.html';
                return;
            }

            // Initialize the login form
            initLoginForm();

            // Check for password reset success message in URL
            const urlParams = new URLSearchParams(window.location.search);
            const successMessage = urlParams.get('success');

            if (successMessage) {
                // We'll let the notification service handle this
                import('./utils/notificationService.js').then(({ showSuccess }) => {
                    showSuccess(decodeURIComponent(successMessage), 7000);

                    // Remove query parameter
                    window.history.replaceState({}, document.title, window.location.pathname);
                });
            }
        }).catch(error => {
            console.error('Auth check error:', error);
        });
    } catch (error) {
        console.error('Error during initialization:', error);
        // Show visible error on page
        document.body.innerHTML += '<div style="color:red; position:fixed; bottom:10px; left:10px; background:white; padding:10px; border:1px solid #ccc;">Error: ' + error.message + '</div>';
    }
}

// Run when DOM is fully loaded
document.addEventListener('DOMContentLoaded', initApp);

// Export if needed for other modules
export { initApp };