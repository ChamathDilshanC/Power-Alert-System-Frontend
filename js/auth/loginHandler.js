import {
    showSuccess,
    showError,
    showLoading,
    completeLoading
} from '../utils/notificationService.js';


export function initLoginForm() {
    const loginForm = document.getElementById('login-form');

    if (!loginForm) {
        console.warn('Login form not found in the DOM');
        return;
    }

    // Add submit event listener
    loginForm.addEventListener('submit', handleLoginSubmit);

    // Add input event listeners for real-time validation
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    if (usernameInput && passwordInput) {
        usernameInput.addEventListener('input', () => {
            validateField(usernameInput, 'username');
        });

        passwordInput.addEventListener('input', () => {
            validateField(passwordInput, 'password');
        });
    }

    // Set up password visibility toggle
    const togglePasswordBtn = document.getElementById('toggle-password');
    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', () => {
            togglePasswordVisibility(passwordInput, togglePasswordBtn);
        });
    }

    // Check for "remember me" preference
    checkRememberMe();
}


async function handleLoginSubmit(event) {
    event.preventDefault();

    // Get form elements
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const rememberMeCheckbox = document.getElementById('remember-me');
    const submitButton = document.querySelector('#login-form button[type="submit"]');

    // Validate form
    const validationResult = validateLoginForm(usernameInput.value, passwordInput.value);

    if (!validationResult.isValid) {
        showError(validationResult.message, 7000, null, {
            text: 'Try Again',
            icon: 'bx-refresh',
            callback: () => {
                usernameInput.focus();
            }
        });
        return;
    }

    // Show loading state
    const originalButtonText = submitButton.textContent;
    submitButton.innerHTML = '<span class="loading-spinner"></span> Signing in...';
    submitButton.disabled = true;

    const loadingToast = showLoading('Signing in to your account...', 0, null, 'Authentication');

    try {
        // Prepare request data
        const requestData = {
            username: usernameInput.value,
            password: passwordInput.value
        };

        // Send login request
        const response = await fetch('http://localhost:8080/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        const data = await response.json();

        // Handle successful login
        if (response.ok && data && data.data && data.data.token) {
            // Save auth data
            localStorage.setItem('auth_token', data.data.token);
            localStorage.setItem('user_role', data.data.role);
            localStorage.setItem('username', data.data.username);
            localStorage.setItem('user_email', data.data.email);
            localStorage.setItem('user_id', data.data.userId);

            sessionStorage.setItem('user_role', data.data.role);
            sessionStorage.setItem('username', data.data.username);
            sessionStorage.setItem('user_email', data.data.email);
            sessionStorage.setItem('user_id', data.data.userId);
            sessionStorage.setItem('auth_token', data.data.token);


            // Handle "remember me" preference
            if (rememberMeCheckbox && rememberMeCheckbox.checked) {
                localStorage.setItem('remember_me', 'true');
                localStorage.setItem('remembered_username', usernameInput.value);
            } else {
                localStorage.removeItem('remember_me');
                localStorage.removeItem('remembered_username');
            }

            completeLoading(loadingToast, true, "Login successful! Redirecting to your dashboard...");

            // Redirect based on role (with slight delay to show success message)
            setTimeout(() => {
                window.location.href = 'pages/dashboard.html';
            }, 1000);
        } else {
            // Show error
            const errorMsg = data.message || 'Login failed. Please check your credentials.';
            completeLoading(loadingToast, false, errorMsg);

            // Reset button
            submitButton.textContent = originalButtonText;
            submitButton.disabled = false;
        }
    } catch (error) {
        console.error('Login error:', error);
        completeLoading(loadingToast, false, "Connection error. Please check your internet connection and try again.");

        // Reset button
        submitButton.textContent = originalButtonText;
        submitButton.disabled = false;
    }
}


function checkRememberMe() {
    const usernameInput = document.getElementById('username');
    const rememberMeCheckbox = document.getElementById('remember-me');

    if (localStorage.getItem('remember_me') === 'true') {
        const rememberedUsername = localStorage.getItem('remembered_username');

        if (usernameInput && rememberedUsername) {
            usernameInput.value = rememberedUsername;
        }

        if (rememberMeCheckbox) {
            rememberMeCheckbox.checked = true;
        }
    }
}


function validateField(inputElement, fieldName) {
    const errorElement = document.getElementById(`${fieldName}-error`);

    if (!errorElement) return;

    const value = inputElement.value;

    if (!value) {
        errorElement.textContent = `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
        errorElement.classList.remove('hidden');
        inputElement.classList.add('border-red-500');
    } else {
        errorElement.textContent = '';
        errorElement.classList.add('hidden');
        inputElement.classList.remove('border-red-500');
    }
}


function togglePasswordVisibility(passwordInput, toggleButton) {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);

    // Toggle icon
    const icon = toggleButton.querySelector('i');
    if (icon) {
        if (type === 'text') {
            icon.classList.remove('bx-show');
            icon.classList.add('bx-hide');
        } else {
            icon.classList.remove('bx-hide');
            icon.classList.add('bx-show');
        }
    }
}


function validateLoginForm(username, password) {
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