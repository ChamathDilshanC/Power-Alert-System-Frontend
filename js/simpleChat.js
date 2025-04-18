/**
 * Simple Chat functionality for PowerAlert
 * Handles group chat where all users see the same messages
 */

$(document).ready(function() {
    // Variables to track state
    let currentUserId = null;
    let currentUsername = null;
    let currentUserRole = null;
    let chatPollingInterval = null;

    // Initialize chat
    const initialize = () => {
        initializeCurrentUser();
        loadMessages();
        setupEventListeners();
        startMessagePolling();
    };

    // Get current user info from localStorage
    const initializeCurrentUser = () => {
        // Get user data from localStorage
        const userId = localStorage.getItem('user_id');
        const username = localStorage.getItem('username');
        const userRole = localStorage.getItem('user_role');
        const authToken = localStorage.getItem('auth_token');

        if (userId && username && authToken) {
            currentUserId = parseInt(userId);
            currentUsername = username;
            currentUserRole = userRole || 'USER';

            console.log('Current user initialized:', { id: currentUserId, username: currentUsername, role: currentUserRole });
        } else {
            console.error('Required user data not found in localStorage');
            window.location.href = '../index.html';
        }
    };

    // Load messages from API
    const loadMessages = async () => {
        try {
            const messages = await window.simpleChatService.getAllMessages();
            renderMessages(messages);
        } catch (error) {
            console.error('Error loading messages:', error);
            $('#chat-messages').html(`
                <div class="empty-state">
                    <i class='bx bx-message-x'></i>
                    <p>Failed to load messages</p>
                    <button id="retry-load" class="bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded transition-colors">
                        Retry
                    </button>
                </div>
            `);

            // Add event listener for retry button
            $('#retry-load').on('click', loadMessages);
        }
    };

    // Render messages in the chat
    const renderMessages = (messages) => {
        const $chatMessages = $('#chat-messages');
        $chatMessages.empty();

        if (!messages || messages.length === 0) {
            $chatMessages.html(`
                <div class="empty-state">
                    <i class='bx bx-message-detail'></i>
                    <p>No messages yet</p>
                    <p class="text-sm mt-1">Be the first to send a message!</p>
                </div>
            `);
            return;
        }

        let currentDate = null;

        messages.forEach(message => {
            // Check if we need to add a date divider
            const messageDate = new Date(message.sentAt).toLocaleDateString();
            if (messageDate !== currentDate) {
                currentDate = messageDate;
                $chatMessages.append(`
                    <div class="date-divider">
                        <span>${formatDateForDivider(new Date(message.sentAt))}</span>
                    </div>
                `);
            }

            // IMPORTANT: Swap the incoming/outgoing logic to match the design in image 2
            // Your messages should be outgoing (blue, left-aligned)
            // Other people's messages should be incoming (white, right-aligned)
            const isOutgoing = message.userId === currentUserId;
            const messageClass = isOutgoing ? 'message-outgoing' : 'message-incoming';

            // Format message time
            const messageTime = new Date(message.sentAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            });

            // Create role badge
            const roleLower = message.userRole.toLowerCase();
            const roleBadge = `
                <span class="role-badge role-${roleLower}">
                    ${message.userRole}
                </span>
            `;

            // Create message HTML with message-bubble class for proper styling
            const messageHtml = `
                <div class="message ${messageClass}" data-message-id="${message.id}">
                    ${!isOutgoing ? `
                    <div class="message-meta">
                        <span class="username">${message.username}</span>${roleBadge}
                    </div>
                    ` : ''}
                    <div class="message-bubble">
                        ${escapeHtml(message.content)}
                    </div>
                    <div class="message-time">${messageTime}</div>
                </div>
            `;

            $chatMessages.append(messageHtml);
        });

        // Scroll to bottom
        scrollToBottom();
    };

    // Send a message
    const sendMessage = async () => {
        const messageContent = $('#message-input').val().trim();
        if (messageContent === '') return;

        try {
            // Clear input
            $('#message-input').val('');

            // Optimistic update - add message immediately
            const $chatMessages = $('#chat-messages');
            const now = new Date();
            const messageTime = now.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            });

            // Add date divider if needed
            const messageDate = now.toLocaleDateString();
            const lastDivider = $('.date-divider').last().text();
            if (!lastDivider || !lastDivider.includes(messageDate)) {
                $chatMessages.append(`
                    <div class="date-divider">
                        <span>${formatDateForDivider(now)}</span>
                    </div>
                `);
            }

            // Add temporary message with proper message-bubble class
            $chatMessages.append(`
                <div class="message message-outgoing sending">
                    <div class="message-bubble">
                        ${escapeHtml(messageContent)}
                    </div>
                    <div class="message-time">Sending...</div>
                </div>
            `);

            // Scroll to bottom
            scrollToBottom();

            // Send message to API
            const sentMessage = await window.simpleChatService.sendMessage(messageContent);

            // Remove temporary message
            $('.message.sending').remove();

            // Force refresh messages to get the new message with proper ID
            await loadMessages();

        } catch (error) {
            console.error('Error sending message:', error);

            // Remove temporary message
            $('.message.sending').remove();

            // Show error
            Toastify({
                text: "Failed to send message. Please try again.",
                duration: 3000,
                close: true,
                gravity: "top",
                position: "right",
                backgroundColor: "#EF4444",
                stopOnFocus: true
            }).showToast();
        }
    };

    // Start polling for new messages
    const startMessagePolling = () => {
        // Clear existing interval if any
        if (chatPollingInterval) {
            clearInterval(chatPollingInterval);
        }

        // Set new interval (every 5 seconds)
        chatPollingInterval = setInterval(async () => {
            try {
                const messages = await window.simpleChatService.getAllMessages();
                renderMessages(messages);
            } catch (error) {
                console.error('Error polling messages:', error);
            }
        }, 5000);
    };

    // Set up event listeners
    const setupEventListeners = () => {
        // Message form submit
        $('#message-form').on('submit', function(e) {
            e.preventDefault();
            sendMessage();
        });

        // Pressing Enter in message input
        $('#message-input').on('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    };

    // Helper function to format date for dividers
    const formatDateForDivider = (date) => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            });
        }
    };

    // Helper function to escape HTML
    const escapeHtml = (text) => {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            // Replace URLs with links
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="text-blue-500 dark:text-blue-400 underline">$1</a>')
            // Replace line breaks with <br>
            .replace(/\n/g, '<br>');
    };

    // Helper function to scroll to bottom of messages
    const scrollToBottom = () => {
        const $chatMessages = $('#chat-messages');
        $chatMessages.scrollTop($chatMessages[0].scrollHeight);
    };

    // Initialize on page load
    initialize();
});