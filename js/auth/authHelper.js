export function isTokenExpired(token) {
    if (!token) return true;

    try {
        // Extract the payload from JWT token (second part)
        const payload = JSON.parse(atob(token.split('.')[1]));

        // Check if expiration time has passed
        // Add a small buffer (30s) to account for network latency
        return (payload.exp * 1000) < (Date.now() - 30000);
    } catch (e) {
        console.error('Error checking token expiration:', e);
        return true; // Assume expired if we can't parse token
    }
}


export async function refreshToken() {
    try {
        const currentToken = localStorage.getItem('auth_token');

        if (!currentToken) {
            throw new Error('No authentication token found');
        }

        const baseUrl = 'http://localhost:8080';
        const response = await fetch(`${baseUrl}/api/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token: currentToken })
        });

        if (!response.ok) {
            throw new Error(`Token refresh failed (${response.status})`);
        }

        const data = await response.json();

        if (data.code === 200 && data.data) {
            // Update token and other session data
            localStorage.setItem('auth_token', data.data.token);

            // Update other user data if provided
            if (data.data.email) localStorage.setItem('user_email', data.data.email);
            if (data.data.role) localStorage.setItem('user_role', data.data.role);
            if (data.data.username) localStorage.setItem('username', data.data.username);
            if (data.data.userId) localStorage.setItem('user_id', data.data.userId);

            return data.data.token;
        } else {
            throw new Error(data.message || 'Failed to refresh token');
        }
    } catch (error) {
        console.error('Token refresh failed:', error);
        // Force logout if token refresh fails
        logout();
        throw error;
    }
}


export async function getValidToken() {
    const token = localStorage.getItem('auth_token');

    if (!token) {
        redirectToLogin();
        throw new Error('No authentication token found');
    }

    if (isTokenExpired(token)) {
        console.log('Token expired, refreshing...');
        return await refreshToken();
    }

    return token;
}


export function logout() {
    // Clear all auth data from localStorage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_role');
    localStorage.removeItem('username');
    localStorage.removeItem('user_id');

    sessionStorage.clear(); // Clear session storage if needed

    redirectToLogin();
}


export function redirectToLogin() {
    // Determine the correct path to the login page
    const currentPath = window.location.pathname;
    let loginPath;

    if (currentPath.includes('/pages/') || currentPath.includes('/admin/')) {
        loginPath = '../index.html'; // Up one level
    } else {
        loginPath = 'index.html'; // Same level
    }

    window.location.href = loginPath;
}

export async function checkAuth() {
    const token = localStorage.getItem('auth_token');

    if (!token) {
        return false;
    }

    if (isTokenExpired(token)) {
        try {
            await refreshToken();
            return true;
        } catch (e) {
            return false;
        }
    }

    return true;
}

export function getCurrentUser() {
    return {
        id: localStorage.getItem('user_id'),
        username: localStorage.getItem('username'),
        email: localStorage.getItem('user_email'),
        role: localStorage.getItem('user_role')
    };
}

export function checkUserRole(requiredRoles) {
    const userRole = localStorage.getItem('user_role');

    if (!userRole) return false;

    if (Array.isArray(requiredRoles)) {
        return requiredRoles.includes(userRole);
    }

    return userRole === requiredRoles;
}