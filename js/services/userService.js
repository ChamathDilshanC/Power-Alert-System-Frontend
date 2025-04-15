/**
 * userService.js - Centralized service for user management operations
 *
 * This service handles all user-related API calls and operations including:
 * - Loading users
 * - Creating users
 * - Updating users
 * - Deleting users
 * - Checking username/email availability
 * - Managing user preferences
 */

import { showSuccess, showError, showLoading, completeLoading } from '../utils/notificationService.js';
import { apiRequest } from './apiService.js';

export async function loadUsers() {
    try {
        const loadingToast = showLoading("Loading users...");

        const response = await apiRequest({
            endpoint: '/api/admin/users',
            method: 'GET'
        });

        if (response && response.data) {
            // Process users data and ensure isActive is properly interpreted as a boolean
            const users = response.data.map(user => ({
                ...user,
                // Ensure isActive is converted to a boolean if it's not already
                isActive: typeof user.isActive === 'boolean' ? user.isActive :
                    user.isActive === 1 || user.isActive === '1' ||
                    user.isActive === true || user.isActive === 'true'
            }));

            completeLoading(loadingToast, true, "Users loaded successfully");
            return users;
        } else {
            completeLoading(loadingToast, false, "Invalid data format or empty data");
            return [];
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showError('Error loading users: ' + error.message);
        return [];
    }
}


export async function createUser(userData) {
    try {
        const loadingToast = showLoading("Creating user...");

        const response = await apiRequest({
            endpoint: '/api/admin/register',
            method: 'POST',
            data: userData
        });

        if (response && (response.code === 201 || response.code === 200)) {
            completeLoading(loadingToast, true, "User created successfully");
            return response.data;
        } else {
            const errorMsg = response?.message || 'Failed to create user';
            completeLoading(loadingToast, false, errorMsg);
            throw new Error(errorMsg);
        }
    } catch (error) {
        console.error('Error creating user:', error);
        showError('Error creating user: ' + error.message);
        throw error;
    }
}


export async function updateUser(userId, userData) {
    try {
        const loadingToast = showLoading("Updating user...");

        const response = await apiRequest({
            endpoint: `/api/admin/users/${userId}`,
            method: 'PUT',
            data: userData
        });

        if (response && response.code === 200) {
            completeLoading(loadingToast, true, "User updated successfully");
            return response.data;
        } else {
            const errorMsg = response?.message || 'Failed to update user';
            completeLoading(loadingToast, false, errorMsg);
            throw new Error(errorMsg);
        }
    } catch (error) {
        console.error('Error updating user:', error);
        showError('Error updating user: ' + error.message);
        throw error;
    }
}


export async function deleteUser(userId) {
    try {
        const loadingToast = showLoading("Deleting user...");

        const response = await apiRequest({
            endpoint: `/api/admin/users/${userId}`,
            method: 'DELETE'
        });

        if (response && response.code === 200) {
            completeLoading(loadingToast, true, "User deleted successfully");
            return true;
        } else {
            const errorMsg = response?.message || 'Failed to delete user';
            completeLoading(loadingToast, false, errorMsg);
            throw new Error(errorMsg);
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showError('Error deleting user: ' + error.message);
        throw error;
    }
}


export async function resetUserPassword(userId, newPassword) {
    try {
        const loadingToast = showLoading("Resetting password...");

        const response = await apiRequest({
            endpoint: `/api/admin/users/${userId}/reset-password`,
            method: 'POST',
            data: { newPassword }
        });

        if (response && response.code === 200) {
            completeLoading(loadingToast, true, "Password reset successfully");
            return true;
        } else {
            const errorMsg = response?.message || 'Failed to reset password';
            completeLoading(loadingToast, false, errorMsg);
            throw new Error(errorMsg);
        }
    } catch (error) {
        console.error('Error resetting password:', error);
        showError('Error resetting password: ' + error.message);
        throw error;
    }
}


export async function toggleUserStatus(userId, currentStatus) {
    try {
        const newStatus = !currentStatus;
        const actionText = newStatus ? 'Activating' : 'Deactivating';
        const loadingToast = showLoading(`${actionText} user...`);

        const response = await apiRequest({
            endpoint: `/api/admin/users/${userId}/toggle-status`,
            method: 'PUT',
            data: { isActive: newStatus }
        });

        if (response && response.code === 200) {
            const successMsg = `User ${newStatus ? 'activated' : 'deactivated'} successfully`;
            completeLoading(loadingToast, true, successMsg);
            return response.data;
        } else {
            const errorMsg = response?.message || `Failed to ${actionText.toLowerCase()} user`;
            completeLoading(loadingToast, false, errorMsg);
            throw new Error(errorMsg);
        }
    } catch (error) {
        console.error('Error toggling user status:', error);
        showError('Error updating user status: ' + error.message);
        throw error;
    }
}


export async function checkUsernameAvailability(username) {
    try {
        const response = await apiRequest({
            endpoint: `/api/public/check-username?username=${encodeURIComponent(username)}`,
            method: 'GET',
            auth: false // No auth needed for public endpoints
        });

        return !response.exists;
    } catch (error) {
        console.error('Error checking username:', error);
        return false; // Assume unavailable on error
    }
}

/**
 * Check if an email is available
 * @param {string} email - Email to check
 * @returns {Promise<boolean>} True if available
 */
export async function checkEmailAvailability(email) {
    try {
        const response = await apiRequest({
            endpoint: `/api/public/check-email?email=${encodeURIComponent(email)}`,
            method: 'GET',
            auth: false // No auth needed for public endpoints
        });

        return !response.exists;
    } catch (error) {
        console.error('Error checking email:', error);
        return false; // Assume unavailable on error
    }
}


export async function loadProviderDetails(userId) {
    try {
        const response = await apiRequest({
            endpoint: `/api/admin/users/${userId}/provider`,
            method: 'GET'
        });

        if (response && response.code === 200) {
            return response.data;
        }
        return null;
    } catch (error) {
        console.error('Error loading provider details:', error);
        return null;
    }
}


export async function getUserProfile(userId) {
    try {
        const response = await apiRequest({
            endpoint: `/api/admin/users/${userId}`,
            method: 'GET'
        });

        if (response && response.code === 200) {
            return response.data;
        }
        return null;
    } catch (error) {
        console.error('Error loading user profile:', error);
        showError('Error loading user profile: ' + error.message);
        return null;
    }
}

export async function getCurrentUserProfile() {
    try {
        const response = await apiRequest({
            endpoint: '/api/user/profile',
            method: 'GET'
        });

        if (response && response.code === 200) {
            return response.data;
        }
        return null;
    } catch (error) {
        console.error('Error loading current user profile:', error);
        return null;
    }
}