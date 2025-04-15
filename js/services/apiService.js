/**
 * apiService.js - Centralized service for API interactions
 *
 * This service handles all API requests with consistent error handling,
 * authentication, and response formatting.
 */

import { refreshToken, getValidToken } from '../auth/authHelper.js';


export async function apiRequest({ endpoint, method = 'GET', data = null, auth = true, headers = {} }) {
    try {
        // Build base URL from config
        const baseUrl = CONFIG.API_BASE_URL || 'http://localhost:8080';
        const url = `${baseUrl}${endpoint}`;

        // Prepare request options
        const requestOptions = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        // Add auth token if required
        if (auth) {
            try {
                const token = await getValidToken();
                requestOptions.headers['Authorization'] = `Bearer ${token}`;
            } catch (error) {
                // If token refresh fails, redirect to login
                console.error('Authentication error:', error);
                window.location.href = '../index.html';
                throw new Error('Authentication failed');
            }
        }

        // Add request body for POST/PUT
        if (data && (method === 'POST' || method === 'PUT')) {
            requestOptions.body = JSON.stringify(data);
        }

        // Execute the request
        console.log(`API ${method} request to ${url}`);
        const response = await fetch(url, requestOptions);

        // Handle common response statuses
        if (response.status === 401 && auth) {
            // Try to refresh token and retry once
            try {
                await refreshToken();
                const token = localStorage.getItem('auth_token');
                requestOptions.headers['Authorization'] = `Bearer ${token}`;
                const retryResponse = await fetch(url, requestOptions);

                if (!retryResponse.ok) {
                    throw new Error(`HTTP error! Status: ${retryResponse.status}`);
                }

                return await retryResponse.json();
            } catch (error) {
                // If retry fails, redirect to login
                window.location.href = '../index.html';
                throw new Error('Authentication failed after token refresh');
            }
        }

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `HTTP error! Status: ${response.status}`;

            try {
                const errorJson = JSON.parse(errorText);
                if (errorJson && errorJson.message) {
                    errorMessage = errorJson.message;
                }
            } catch (e) {
                // If parsing fails, use the original error text
                if (errorText) {
                    errorMessage += ` - ${errorText}`;
                }
            }

            throw new Error(errorMessage);
        }

        // Parse and return the response
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('API request error:', error);
        throw error;
    }
}


export async function uploadFile({ endpoint, formData, onProgress }) {
    try {
        const baseUrl = CONFIG.API_BASE_URL || 'http://localhost:8080';
        const url = `${baseUrl}${endpoint}`;

        // Get auth token
        const token = await getValidToken();

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            // Set up progress handling
            if (onProgress && typeof onProgress === 'function') {
                xhr.upload.addEventListener('progress', (event) => {
                    if (event.lengthComputable) {
                        const percentComplete = Math.round((event.loaded / event.total) * 100);
                        onProgress(percentComplete);
                    }
                });
            }

            // Set up completion handling
            xhr.onload = function() {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (e) {
                        reject(new Error('Invalid response format'));
                    }
                } else {
                    let errorMessage = `HTTP error! Status: ${xhr.status}`;

                    try {
                        const errorResponse = JSON.parse(xhr.responseText);
                        if (errorResponse && errorResponse.message) {
                            errorMessage = errorResponse.message;
                        }
                    } catch (e) {
                        // If parsing fails, use a generic error
                    }

                    reject(new Error(errorMessage));
                }
            };

            // Set up error handling
            xhr.onerror = function() {
                reject(new Error('Network error occurred'));
            };

            // Set up abort handling
            xhr.onabort = function() {
                reject(new Error('Upload aborted'));
            };

            // Open and send the request
            xhr.open('POST', url, true);
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.send(formData);
        });
    } catch (error) {
        console.error('File upload error:', error);
        throw error;
    }
}