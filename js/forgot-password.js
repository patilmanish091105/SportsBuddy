

import { auth } from './firebase-config.js';
import { sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';


const UI = {
    showLoading: () => {
        const loader = document.getElementById('loadingIndicator');
        if (loader) loader.style.display = 'block';
    },

    hideLoading: () => {
        const loader = document.getElementById('loadingIndicator');
        if (loader) loader.style.display = 'none';
    },

    showAlert: (message, type = 'info') => {
        const container = document.getElementById('alertContainer');
        if (!container) {
            alert(message);
            return;
        }

        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        container.appendChild(alert);

        setTimeout(() => alert.remove(), 7000);
    },

    clearAlerts: () => {
        const container = document.getElementById('alertContainer');
        if (container) container.innerHTML = '';
    },

    disableForm: (formId) => {
        const form = document.getElementById(formId);
        if (form) {
            const inputs = form.querySelectorAll('input, button');
            inputs.forEach(input => input.disabled = true);
        }
    },

    enableForm: (formId) => {
        const form = document.getElementById(formId);
        if (form) {
            const inputs = form.querySelectorAll('input, button');
            inputs.forEach(input => input.disabled = false);
        }
    }
};


const form = document.getElementById('forgotPasswordForm');

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        UI.clearAlerts();

        const email = document.getElementById('email').value.trim().toLowerCase();

        if (!email) {
            UI.showAlert('Please enter your email address', 'error');
            return;
        }

        if (!email.includes('@') || !email.includes('.')) {
            UI.showAlert('Please enter a valid email address', 'error');
            return;
        }

        UI.showLoading();
        UI.disableForm('forgotPasswordForm');

        try {
            console.log('Sending password reset email to:', email);
            await sendPasswordResetEmail(auth, email);

            console.log('Password reset email sent successfully');
            UI.showAlert(
                'Password reset link sent! Please check your email inbox and spam folder.',
                'success'
            );

            form.reset();

            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000);

        } catch (error) {
            console.error('Password reset failed:', error);

            let errorMessage = 'Failed to send reset link. Please try again.';

            if (error.code === 'auth/user-not-found') {
                errorMessage = 'If this email is registered, a reset link will be sent.';
                UI.showAlert(errorMessage, 'info');
                
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3000);
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address format.';
                UI.showAlert(errorMessage, 'error');
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Too many requests. Please try again later.';
                UI.showAlert(errorMessage, 'error');
            } else if (error.code === 'auth/network-request-failed') {
                errorMessage = 'Network error. Please check your connection.';
                UI.showAlert(errorMessage, 'error');
            } else {
                UI.showAlert(errorMessage, 'error');
            }

            UI.enableForm('forgotPasswordForm');
        } finally {
            UI.hideLoading();
        }
    });
}

console.log('Forgot password module loaded');