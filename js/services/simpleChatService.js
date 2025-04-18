/**
 * Simple Chat Service for PowerAlert
 * Handles basic group chat functionality
 */

let simpleChatService = (() => {
    // Private variables
    const API_BASE_URL = window.CONFIG.API_BASE_URL || 'http://localhost:8080';

    // Get auth token from local storage
    const getAuthToken = () => {
        return localStorage.getItem('auth_token');
    };

    // Headers with auth token
    const getHeaders = () => {
        const token = getAuthToken();
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    };

    // Handle API errors
    const handleError = (error) => {
        console.error('API Error:', error);

        // Show error toast
        Toastify({
            text: error.message || 'An error occurred. Please try again.',
            duration: 3000,
            close: true,
            gravity: 'top',
            position: 'right',
            backgroundColor: '#EF4444',
            stopOnFocus: true
        }).showToast();

        throw error;
    };

    // Public methods
    return {
        // Get all messages
        getAllMessages: async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/messages`, {
                    method: 'GET',
                    headers: getHeaders()
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch messages: ${response.statusText}`);
                }

                const data = await response.json();
                return data.data || [];
            } catch (error) {
                return handleError(error);
            }
        },

        // Send a message
        sendMessage: async (content) => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/messages`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({
                        content: content
                    })
                });

                if (!response.ok) {
                    throw new Error(`Failed to send message: ${response.statusText}`);
                }

                const data = await response.json();
                return data.data;
            } catch (error) {
                return handleError(error);
            }
        }
    };
})();

// Export for use in other files
window.simpleChatService = simpleChatService;