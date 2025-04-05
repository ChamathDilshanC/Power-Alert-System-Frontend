// Function to update user information in sidebar and top navigation
$(document).ready(function() {
    // Get user info from localStorage
    const username = localStorage.getItem('username') || 'User';
    const userRole = localStorage.getItem('user_role') || 'User';
    const email = localStorage.getItem('user_email') || '';
    const firstName = localStorage.getItem('user_firstName') || '';
    const lastName = localStorage.getItem('user_lastName') || '';

    // Format user display name (use firstName + lastName if available, otherwise username)
    const displayName = (firstName && lastName) ? `${firstName} ${lastName}` : username;

    // Format role for display (capitalize and remove underscores)
    const formattedRole = userRole
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

    // Get user initials for avatar
    const userInitials = getInitials(displayName);

    // Update sidebar user information
    $('#avatar-circle').text(userInitials);
    $('#avatar-name').text(displayName);
    $('#avatar-role').text(formattedRole);

    // Update top navigation user information
    $('.top-navbar .hidden.md\\:flex span').text(displayName);

    // Add a hover effect to show more user info in top navbar
    const userInfoHTML = `
        <div class="hidden absolute right-50px top-full mt-2 w-78 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 p-2 text-sm z-50" id="userDropdown">
            <div class="px-4 py-2 text-xs text-gray-500">Account</div>
            <div class="border-t border-gray-100 my-1"></div>
            <div class="px-4 py-2 font-medium">${displayName}</div>
            ${email ? `<div class="px-4 py-1 text-gray-500 text-xs">${email}</div>` : ''}
            <div class="px-4 py-1 mb-1 text-xs italic text-gray-500">${formattedRole}</div>
            <div class="border-t border-gray-100 my-1"></div>
            <a href="settings/profile.html" class="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">
                <i class="bx bx-user-circle mr-2"></i> Profile
            </a>
            <a href="settings/security.html" class="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">
                <i class="bx bx-lock-alt mr-2"></i> Security
            </a>
            <div class="border-t border-gray-100 my-1"></div>
            <a href="#" id="logoutBtn" class="block px-4 py-2 text-red-600 hover:bg-red-50 rounded">
                <i class="bx bx-log-out mr-2"></i> Sign Out
            </a>
        </div>
    `;

    // Append dropdown to top navbar user info
    $('.top-navbar .hidden.md\\:flex').addClass('relative cursor-pointer').append(userInfoHTML);

    // Add toggling functionality for user dropdown
    $('.top-navbar .hidden.md\\:flex').click(function(e) {
        $('#userDropdown').toggleClass('hidden');
        e.stopPropagation();
    });

    // Close dropdown when clicking elsewhere
    $(document).click(function() {
        $('#userDropdown').addClass('hidden');
    });

    // Handle logout functionality
    $(document).on('click', '#logoutBtn', function(e) {
        e.preventDefault();

        // Clear localStorage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_role');
        localStorage.removeItem('username');
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_email');
        localStorage.removeItem('user_firstName');
        localStorage.removeItem('user_lastName');

        // Redirect to login page
        window.location.href = '../index.html';
    });

    // Check if auth token exists, if not redirect to login
    if (!localStorage.getItem('auth_token')) {
        window.location.href = '../index.html';
    }

    // Check if user has appropriate role for admin pages
    const requiredRoles = ['ADMIN', 'SUPER_ADMIN'];
    if (!requiredRoles.includes(userRole)) {
        // Redirect to appropriate dashboard based on role
        if (userRole === 'UTILITY_PROVIDER') {
            window.location.href = '../provider/dashboard.html';
        } else {
            window.location.href = '../user/dashboard.html';
        }
    }
});

// Helper function to get initials from name
function getInitials(name) {
    if (!name) return 'U';

    const parts = name.split(' ');
    if (parts.length === 1) {
        return name.charAt(0).toUpperCase();
    }

    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Logout functionality script
$(document).ready(function() {
    // Add logout button event handler
    $('#nav-logout, #logoutBtn').on('click', function(e) {
        e.preventDefault();

        // Show confirmation dialog with modern styling
        const confirmDialog = $(`
            <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fadeIn">
                <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6 transform transition-all duration-300 animate-scaleIn">
                    <div class="text-center mb-1">
                        <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-500 mb-4">
                            <i class="bx bx-log-out text-2xl"></i>
                        </div>
                        <h3 class="text-lg font-semibold text-gray-900">Sign Out</h3>
                        <p class="text-gray-500 mt-2">Are you sure you want to sign out of your account?</p>
                    </div>
                    <div class="flex justify-center gap-3 mt-6">
                        <button id="cancel-logout" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-800 font-medium transition-colors duration-300">
                            Cancel
                        </button>
                        <button id="confirm-logout" class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-colors duration-300">
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        `);

        // Add animation classes
        $('body').append(`
            <style>
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.2s ease-out forwards;
                }
                .animate-scaleIn {
                    animation: scaleIn 0.3s ease-out forwards;
                }
                .animate-scaleOut {
                    animation: scaleIn 0.2s ease-in reverse forwards;
                }
                .animate-fadeOut {
                    animation: fadeIn 0.2s ease-in reverse forwards;
                }
            </style>
        `);

        // Append dialog to body
        $('body').append(confirmDialog);

        // Disable page scrolling
        $('body').css('overflow', 'hidden');

        // Handle cancel button
        $('#cancel-logout').on('click', function() {
            // Add exit animations
            confirmDialog.addClass('animate-fadeOut');
            confirmDialog.find('> div').addClass('animate-scaleOut');

            // Remove dialog after animation completes
            setTimeout(function() {
                confirmDialog.remove();
                $('body').css('overflow', '');
            }, 200);
        });

        // Handle confirm button
        $('#confirm-logout').on('click', function() {
            // Add loading state
            $(this).html('<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Signing out...');
            $(this).prop('disabled', true);

            // Clear localStorage
            localStorage.clear();

            // Add a small delay for better UX
            setTimeout(function() {
                // Redirect to login page
                window.location.href = '../index.html';
            }, 800);
        });

        // Close dialog when clicking outside
        confirmDialog.on('click', function(e) {
            if (e.target === this) {
                $('#cancel-logout').click();
            }
        });

        // Add keyboard support (Escape to cancel, Enter to confirm)
        $(document).on('keydown.logout', function(e) {
            if (e.key === 'Escape') {
                $('#cancel-logout').click();
            } else if (e.key === 'Enter') {
                $('#confirm-logout').click();
            }
        });
    });
});