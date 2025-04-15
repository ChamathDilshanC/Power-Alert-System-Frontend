import {
    showSuccess,
    showError,
    showLoading,
    completeLoading
} from '../utils/notificationService.js';

// Constants
const API_BASE_URL = 'http://localhost:8080';
const PASSWORD_REGEX = /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=])(?=\S+$).{8,}$/;

// Initialize the password reset functionality
function initPasswordReset() {
    setupFormEventListeners();
    setupVerificationCodeHandlers();
    setupPasswordToggle();
    setupPasswordStrengthMeter();
}


function setupFormEventListeners() {
    // Email verification form
    const emailForm = document.getElementById('emailVerificationForm');
    if (emailForm) {
        emailForm.addEventListener('submit', handleEmailSubmit);
    }

    // Code verification form
    const codeForm = document.getElementById('codeVerificationForm');
    if (codeForm) {
        codeForm.addEventListener('submit', handleCodeSubmit);
    }

    // New password form
    const passwordForm = document.getElementById('newPasswordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', handlePasswordSubmit);
    }

    // Resend code button
    const resendBtn = document.getElementById('resendCodeBtn');
    if (resendBtn) {
        resendBtn.addEventListener('click', handleResendCode);
    }
}


async function handleEmailSubmit(event) {
    event.preventDefault();

    const emailInput = document.getElementById('email');
    const email = emailInput.value.trim();
    const submitButton = document.getElementById('verifyEmailBtn');

    // Validate email
    if (!email) {
        showFormError(emailInput, 'email', 'Please enter your email address');
        return;
    }

    if (!isValidEmail(email)) {
        showFormError(emailInput, 'email', 'Please enter a valid email address');
        return;
    }

    // Show loading state
    submitButton.innerHTML = '<span class="loading-spinner mr-2"></span> Sending...';
    submitButton.disabled = true;

    const loadingToast = showLoading("Sending verification code to your email...");

    try {
        // Send password reset request
        const response = await sendResetRequest(email);

        if (response.success) {
            completeLoading(loadingToast, true, "Verification code sent successfully");

            // Store the email and move to verification step
            document.getElementById('storedEmail').value = email;
            document.getElementById('userEmail').textContent = email;

            // Show verification form and hide email form
            showFormStep('verificationForm');

            // Focus on first verification input
            document.getElementById('code1').focus();
        } else {
            completeLoading(loadingToast, false, response.message || "Failed to send verification code");

            // Reset button
            submitButton.innerHTML = 'Continue';
            submitButton.disabled = false;
        }
    } catch (error) {
        completeLoading(loadingToast, false, "An error occurred. Please try again.");
        console.error('Email verification error:', error);

        // Reset button
        submitButton.innerHTML = 'Continue';
        submitButton.disabled = false;
    }
}


async function handleCodeSubmit(event) {
    event.preventDefault();

    const code1 = document.getElementById('code1').value;
    const code2 = document.getElementById('code2').value;
    const code3 = document.getElementById('code3').value;
    const code4 = document.getElementById('code4').value;
    const code5 = document.getElementById('code5').value;
    const code6 = document.getElementById('code6').value;

    // Combine the digits
    const verificationCode = code1 + code2 + code3 + code4 + code5 + code6;

    // Validate code
    if (verificationCode.length !== 6 || !/^\d+$/.test(verificationCode)) {
        showError("Please enter a valid 6-digit verification code");
        return;
    }

    // Get the email
    const email = document.getElementById('storedEmail').value;
    const submitButton = document.getElementById('verifyCodeBtn');

    // Show loading state
    submitButton.innerHTML = '<span class="loading-spinner mr-2"></span> Verifying...';
    submitButton.disabled = true;

    const loadingToast = showLoading("Verifying your code...");

    try {
        // Verify the code
        const response = await verifyCode(email, verificationCode);

        if (response.success) {
            completeLoading(loadingToast, true, "Code verified successfully");

            // Show reset password form
            showFormStep('resetForm');

            // Focus on password field
            document.getElementById('newPassword').focus();
        } else {
            completeLoading(loadingToast, false, response.message || "Invalid verification code");

            // Reset button
            submitButton.innerHTML = 'Verify Code';
            submitButton.disabled = false;
        }
    } catch (error) {
        completeLoading(loadingToast, false, "An error occurred. Please try again.");
        console.error('Code verification error:', error);

        // Reset button
        submitButton.innerHTML = 'Verify Code';
        submitButton.disabled = false;
    }
}


async function handlePasswordSubmit(event) {
    event.preventDefault();

    const email = document.getElementById('storedEmail').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const submitButton = document.getElementById('submitBtn');

    // Get the verification code
    const code1 = document.getElementById('code1').value;
    const code2 = document.getElementById('code2').value;
    const code3 = document.getElementById('code3').value;
    const code4 = document.getElementById('code4').value;
    const code5 = document.getElementById('code5').value;
    const code6 = document.getElementById('code6').value;
    const verificationCode = code1 + code2 + code3 + code4 + code5 + code6;

    // Final validation
    if (!validatePassword(newPassword)) {
        showError("Please meet all password requirements");
        return;
    }

    if (newPassword !== confirmPassword) {
        showFormError(
            document.getElementById('confirmPassword'),
            'password',
            "Passwords do not match"
        );
        return;
    }

    // Show loading state
    submitButton.innerHTML = '<span class="loading-spinner mr-2"></span> Resetting...';
    submitButton.disabled = true;

    const loadingToast = showLoading("Resetting your password...");

    try {
        // Send password reset request
        const response = await resetPassword(email, verificationCode, newPassword);

        if (response.success) {
            completeLoading(loadingToast, true, "Password reset successful!");

            // Show success message
            showFormStep('successMessage');
        } else {
            if (response.status === 400) {
                completeLoading(loadingToast, false, "Invalid or expired verification code. Please request a new code.");

                // Show email form again
                showFormStep('emailForm');

                // Reset button
                const emailButton = document.getElementById('verifyEmailBtn');
                if (emailButton) {
                    emailButton.innerHTML = 'Continue';
                    emailButton.disabled = false;
                }
            } else {
                completeLoading(loadingToast, false, response.message || "Error resetting password");

                // Reset button
                submitButton.innerHTML = 'Reset Password';
                submitButton.disabled = false;
            }
        }
    } catch (error) {
        completeLoading(loadingToast, false, "An error occurred. Please try again.");
        console.error('Password reset error:', error);

        // Reset button
        submitButton.innerHTML = 'Reset Password';
        submitButton.disabled = false;
    }
}


async function handleResendCode() {
    const email = document.getElementById('storedEmail').value;
    const resendButton = document.getElementById('resendCodeBtn');

    // Disable the button
    resendButton.disabled = true;
    resendButton.textContent = 'Sending...';

    // Show loading
    const loadingToast = showLoading("Resending verification code...");

    try {
        // Resend verification code
        const response = await sendResetRequest(email, true);

        if (response.success) {
            completeLoading(loadingToast, true, "Verification code has been resent");
        } else {
            completeLoading(loadingToast, false, response.message || "Failed to resend code");
        }
    } catch (error) {
        completeLoading(loadingToast, false, "An error occurred. Please try again.");
        console.error('Resend code error:', error);
    }

    // Re-enable the button
    resendButton.disabled = false;
    resendButton.textContent = 'Resend';
}


function setupVerificationCodeHandlers() {
    const codeInputs = document.querySelectorAll('.verification-input');

    codeInputs.forEach(input => {
        // Handle input
        input.addEventListener('input', (e) => {
            const val = e.target.value;

            // Allow only numeric values
            if (val && !/^\d+$/.test(val)) {
                e.target.value = '';
                return;
            }

            // Move to next input
            if (val && e.target.nextElementSibling && e.target.nextElementSibling.classList.contains('verification-input')) {
                e.target.nextElementSibling.focus();
            }
        });

        // Handle backspace
        input.addEventListener('keydown', (e) => {
            const val = e.target.value;

            // On backspace, clear current field and move to previous field
            if (e.key === 'Backspace' && !val &&
                e.target.previousElementSibling &&
                e.target.previousElementSibling.classList.contains('verification-input')) {
                e.target.previousElementSibling.focus();
                e.target.previousElementSibling.value = '';
            }
        });
    });
}


function setupPasswordToggle() {
    // Toggle for new password
    const newPasswordToggle = document.getElementById('toggleNewPassword');
    const newPasswordInput = document.getElementById('newPassword');

    if (newPasswordToggle && newPasswordInput) {
        newPasswordToggle.addEventListener('click', () => {
            togglePasswordVisibility(newPasswordInput, newPasswordToggle);
        });
    }

    // Toggle for confirm password
    const confirmPasswordToggle = document.getElementById('toggleConfirmPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    if (confirmPasswordToggle && confirmPasswordInput) {
        confirmPasswordToggle.addEventListener('click', () => {
            togglePasswordVisibility(confirmPasswordInput, confirmPasswordToggle);
        });
    }
}


function togglePasswordVisibility(input, button) {
    const icon = button.querySelector('i');

    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('bx-show');
        icon.classList.add('bx-hide');
    } else {
        input.type = 'password';
        icon.classList.remove('bx-hide');
        icon.classList.add('bx-show');
    }
}


function setupPasswordStrengthMeter() {
    const passwordInput = document.getElementById('newPassword');
    const confirmInput = document.getElementById('confirmPassword');

    if (passwordInput) {
        passwordInput.addEventListener('input', () => {
            const password = passwordInput.value;
            updatePasswordStrength(password);
            validatePasswordForm();
        });
    }

    if (confirmInput) {
        confirmInput.addEventListener('input', () => {
            validatePasswordForm();
        });
    }
}


function updatePasswordStrength(password) {
    const strengthMeter = document.getElementById('strengthMeter');
    const strengthText = document.getElementById('strengthText');

    // Reset requirements
    document.querySelectorAll('.requirement-item i')
        .forEach(icon => {
            icon.classList.remove('text-green-500');
            icon.classList.add('text-gray-400');
        });

    let strength = 0;

    // Check length
    const hasMinLength = password.length >= 8;
    if (hasMinLength) {
        strength++;
        document.querySelector('#req-length i').classList.remove('text-gray-400');
        document.querySelector('#req-length i').classList.add('text-green-500');
    }

    // Check lowercase
    const hasLowercase = /[a-z]/.test(password);
    if (hasLowercase) {
        strength++;
        document.querySelector('#req-lowercase i').classList.remove('text-gray-400');
        document.querySelector('#req-lowercase i').classList.add('text-green-500');
    }

    // Check uppercase
    const hasUppercase = /[A-Z]/.test(password);
    if (hasUppercase) {
        strength++;
        document.querySelector('#req-uppercase i').classList.remove('text-gray-400');
        document.querySelector('#req-uppercase i').classList.add('text-green-500');
    }

    // Check number
    const hasNumber = /[0-9]/.test(password);
    if (hasNumber) {
        strength++;
        document.querySelector('#req-number i').classList.remove('text-gray-400');
        document.querySelector('#req-number i').classList.add('text-green-500');
    }

    // Check special character
    const hasSpecial = /[@#$%^&+=]/.test(password);
    if (hasSpecial) {
        strength++;
        document.querySelector('#req-special i').classList.remove('text-gray-400');
        document.querySelector('#req-special i').classList.add('text-green-500');
    }

    // Update strength meter
    strengthMeter.classList.remove('strength-weak', 'strength-fair', 'strength-good', 'strength-strong');

    if (password === '') {
        strengthMeter.style.width = '0%';
        strengthText.textContent = 'Password strength';
        strengthText.classList.remove('text-red-500', 'text-yellow-500', 'text-green-500');
    } else if (strength < 2) {
        strengthMeter.classList.add('strength-weak');
        strengthText.textContent = 'Weak';
        strengthText.classList.remove('text-yellow-500', 'text-green-500');
        strengthText.classList.add('text-red-500');
    } else if (strength < 4) {
        strengthMeter.classList.add('strength-fair');
        strengthText.textContent = 'Fair';
        strengthText.classList.remove('text-red-500', 'text-green-500');
        strengthText.classList.add('text-yellow-500');
    } else if (strength < 5) {
        strengthMeter.classList.add('strength-good');
        strengthText.textContent = 'Good';
        strengthText.classList.remove('text-red-500', 'text-yellow-500');
        strengthText.classList.add('text-green-500');
    } else {
        strengthMeter.classList.add('strength-strong');
        strengthText.textContent = 'Strong';
        strengthText.classList.remove('text-red-500', 'text-yellow-500');
        strengthText.classList.add('text-green-500');
    }
}


function validatePasswordForm() {
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const submitBtn = document.getElementById('submitBtn');
    const passwordError = document.getElementById('password-error');

    // Check if passwords match
    if (confirmPassword && newPassword !== confirmPassword) {
        passwordError.textContent = 'Passwords do not match';
        passwordError.classList.remove('hidden');
        submitBtn.disabled = true;
        return;
    } else if (passwordError) {
        passwordError.classList.add('hidden');
    }

    // Enable submit button only if all criteria are met
    if (validatePassword(newPassword) && newPassword === confirmPassword && newPassword !== '') {
        submitBtn.disabled = false;
    } else {
        submitBtn.disabled = true;
    }
}


function validatePassword(password) {
    return PASSWORD_REGEX.test(password);
}


async function sendResetRequest(email, isResend = false) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });

        // Parse response
        let data = {};
        try {
            data = await response.json();
        } catch (e) {
            // If not JSON, create a simple object
            data = { message: 'Server error' };
        }

        // Return a standardized response
        return {
            success: response.ok,
            status: response.status,
            message: data.message || (response.ok ? 'Success' : 'Error'),
            data: data.data
        };
    } catch (error) {
        console.error('API request error:', error);
        return {
            success: false,
            status: 0,
            message: 'Network error. Please check your connection.'
        };
    }
}


async function verifyCode(email, code) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/verify-reset-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, code })
        });

        // Parse response
        let data = {};
        try {
            data = await response.json();
        } catch (e) {
            // If not JSON, create a simple object
            data = { message: response.ok ? 'Code verified' : 'Invalid code' };
        }

        // Return a standardized response
        return {
            success: response.ok,
            status: response.status,
            message: data.message || (response.ok ? 'Code verified' : 'Invalid code'),
            data: data.data
        };
    } catch (error) {
        console.error('API request error:', error);
        return {
            success: false,
            status: 0,
            message: 'Network error. Please check your connection.'
        };
    }
}


async function resetPassword(email, code, newPassword) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, code, newPassword })
        });

        // Parse response
        let data = {};
        try {
            data = await response.json();
        } catch (e) {
            // If not JSON, create a simple object
            data = { message: response.ok ? 'Password reset successful' : 'Reset failed' };
        }

        // Return a standardized response
        return {
            success: response.ok,
            status: response.status,
            message: data.message || (response.ok ? 'Password reset successful' : 'Reset failed'),
            data: data.data
        };
    } catch (error) {
        console.error('API request error:', error);
        return {
            success: false,
            status: 0,
            message: 'Network error. Please check your connection.'
        };
    }
}


function showFormError(inputElement, errorId, message) {
    const errorElement = document.getElementById(`${errorId}-error`);

    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
        inputElement.classList.add('border-red-500');

        // Focus on the input element
        inputElement.focus();
    } else {
        // Fallback to general error notification
        showError(message);
    }
}


function showFormStep(stepId) {
    // Hide all steps
    document.querySelectorAll('.form-step').forEach(step => {
        step.classList.remove('active');
    });

    // Show the target step
    const targetStep = document.getElementById(stepId);
    if (targetStep) {
        targetStep.classList.add('active');
    }
}


function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initPasswordReset);
