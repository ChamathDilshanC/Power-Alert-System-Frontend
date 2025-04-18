/**
 * Chat Service for PowerAlert
 * Handles all API interactions for the chat functionality
 */

let chatService = (() => {
    // Private variables
    const API_BASE_URL = window.CONFIG.API_BASE_URL || 'http://localhost:8080';

    // Get auth token from local storage
    const getAuthToken = () => {
        return localStorage.getItem('token');
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
            text: error.response?.data?.message || 'An error occurred. Please try again.',
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
        // Get chat partners (users with whom the current user has conversations)
        getChatPartners: async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/messages/chat-partners`, {
                    method: 'GET',
                    headers: getHeaders()
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch chat partners: ${response.statusText}`);
                }

                const data = await response.json();
                return data.data;
            } catch (error) {
                return handleError(error);
            }
        },

        // Get recent conversations
        getRecentConversations: async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/messages/recent-conversations`, {
                    method: 'GET',
                    headers: getHeaders()
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch recent conversations: ${response.statusText}`);
                }

                const data = await response.json();
                return data.data;
            } catch (error) {
                return handleError(error);
            }
        },

        // Get conversation with a specific user
        getConversation: async (userId) => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/messages/conversations/${userId}`, {
                    method: 'GET',
                    headers: getHeaders()
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch conversation: ${response.statusText}`);
                }

                const data = await response.json();
                return data.data;
            } catch (error) {
                return handleError(error);
            }
        },

        // Send a message to a user
        sendMessage: async (content, recipientId) => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/messages`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({
                        content: content,
                        recipientId: recipientId
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
        },

        // Mark a message as read
        markMessageAsRead: async (messageId) => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/messages/${messageId}/mark-read`, {
                    method: 'PUT',
                    headers: getHeaders()
                });

                if (!response.ok) {
                    throw new Error(`Failed to mark message as read: ${response.statusText}`);
                }

                const data = await response.json();
                return data.data;
            } catch (error) {
                return handleError(error);
            }
        },

        // Get unread message count
        getUnreadCount: async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/messages/unread-count`, {
                    method: 'GET',
                    headers: getHeaders()
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch unread count: ${response.statusText}`);
                }

                const data = await response.json();
                return data.data;
            } catch (error) {
                return handleError(error);
            }
        },

        // Get all system users for starting new conversations
        getAllUsers: async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
                    method: 'GET',
                    headers: getHeaders()
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch users: ${response.statusText}`);
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
window.chatService = chatService;