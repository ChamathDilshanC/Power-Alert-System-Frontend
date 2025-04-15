/**
 * formValidation.js - Form validation utility functions
 *
 * This module provides reusable validation functions for forms throughout the application.
 */

export function validateLoginForm(username, password) {
    // Check if fields are empty
    if (!username) {
        return {
            isValid: false,
            message: 'Username is required'
        };
    }

    if (!password) {
        return {
            isValid: false,
            message: 'Password is required'
        };
    }

    return {
        isValid: true,
        message: 'Validation successful'
    };
}


export function validateRegistrationForm(formData) {
    // Check required fields
    const requiredFields = [
        { key: 'username', label: 'Username' },
        { key: 'email', label: 'Email' },
        { key: 'phoneNumber', label: 'Phone number' },
        { key: 'password', label: 'Password' }
    ];

    for (const field of requiredFields) {
        if (!formData[field.key]) {
            return {
                isValid: false,
                message: `${field.label} is required`
            };
        }
    }

    // Validate email format
    if (!isValidEmail(formData.email)) {
        return {
            isValid: false,
            message: 'Please enter a valid email address'
        };
    }

    // Validate phone number format
    if (!isValidPhoneNumber(formData.phoneNumber)) {
        return {
            isValid: false,
            message: 'Please enter a valid phone number'
        };
    }

    // Validate password strength
    const passwordResult = validatePasswordStrength(formData.password);
    if (!passwordResult.isValid) {
        return passwordResult;
    }

    // Validate password confirmation
    if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
        return {
            isValid: false,
            message: 'Passwords do not match'
        };
    }

    return {
        isValid: true,
        message: 'Validation successful'
    };
}

export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}


export function isValidPhoneNumber(phone) {
    // Allow various phone number formats (international and local)
    const phoneRegex = /^(\+\d{1,3})?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;
    return phoneRegex.test(phone);
}


export function validatePasswordStrength(password) {
    if (password.length < 8) {
        return {
            isValid: false,
            message: 'Password must be at least 8 characters long'
        };
    }

    // Check for lowercase letters
    if (!/[a-z]/.test(password)) {
        return {
            isValid: false,
            message: 'Password must include at least one lowercase letter'
        };
    }

    // Check for uppercase letters
    if (!/[A-Z]/.test(password)) {
        return {
            isValid: false,
            message: 'Password must include at least one uppercase letter'
        };
    }

    // Check for numbers
    if (!/[0-9]/.test(password)) {
        return {
            isValid: false,
            message: 'Password must include at least one number'
        };
    }

    // Check for special characters
    if (!/[^A-Za-z0-9]/.test(password)) {
        return {
            isValid: false,
            message: 'Password must include at least one special character'
        };
    }

    return {
        isValid: true,
        message: 'Password strength is sufficient'
    };
}


export function validateOutageForm(formData) {
    // Check required fields
    const requiredFields = [
        { key: 'type', label: 'Outage type' },
        { key: 'startTime', label: 'Start time' },
        { key: 'areaId', label: 'Affected area' },
        { key: 'utilityProviderId', label: 'Utility provider' }
    ];

    for (const field of requiredFields) {
        if (!formData[field.key]) {
            return {
                isValid: false,
                message: `${field.label} is required`
            };
        }
    }

    // Validate dates
    const now = new Date();
    const startTime = new Date(formData.startTime);

    if (startTime < now && formData.status === 'SCHEDULED') {
        return {
            isValid: false,
            message: 'Start time cannot be in the past for scheduled outages'
        };
    }

    if (formData.estimatedEndTime) {
        const endTime = new Date(formData.estimatedEndTime);

        if (endTime <= startTime) {
            return {
                isValid: false,
                message: 'End time must be after start time'
            };
        }
    }

    return {
        isValid: true,
        message: 'Validation successful'
    };
}


export function validateAddressForm(formData) {
    // Check required fields
    const requiredFields = [
        { key: 'addressLine1', label: 'Address line 1' },
        { key: 'city', label: 'City' },
        { key: 'district', label: 'District' },
        { key: 'latitude', label: 'Latitude' },
        { key: 'longitude', label: 'Longitude' }
    ];

    for (const field of requiredFields) {
        if (!formData[field.key]) {
            return {
                isValid: false,
                message: `${field.label} is required`
            };
        }
    }

    // Validate coordinates
    const latitude = parseFloat(formData.latitude);
    const longitude = parseFloat(formData.longitude);

    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
        return {
            isValid: false,
            message: 'Latitude must be a valid number between -90 and 90'
        };
    }

    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
        return {
            isValid: false,
            message: 'Longitude must be a valid number between -180 and 180'
        };
    }

    return {
        isValid: true,
        message: 'Validation successful'
    };
}


export function validateFeedbackForm(formData) {
    // Check required fields
    if (!formData.feedbackText || formData.feedbackText.trim() === '') {
        return {
            isValid: false,
            message: 'Feedback text is required'
        };
    }

    if (!formData.type) {
        return {
            isValid: false,
            message: 'Feedback type is required'
        };
    }

    // Validate feedback text length
    if (formData.feedbackText.length > 500) {
        return {
            isValid: false,
            message: 'Feedback text should be less than 500 characters'
        };
    }

    return {
        isValid: true,
        message: 'Validation successful'
    };
}