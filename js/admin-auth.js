

import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from
'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import logger from './logger.js';


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

        setTimeout(() => alert.remove(), 5000);
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


const adminLoginForm = document.getElementById('adminLoginForm');

if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        UI.clearAlerts();

        const email = document.getElementById('email').value.trim().toLowerCase();
        const password = document.getElementById('password').value;

        if (!email || !password) {
            UI.showAlert('Please enter both email and password', 'error');
            return;
        }

        UI.showLoading();
        UI.disableForm('adminLoginForm');

        try {
            logger.info('Attempting admin login', { email });
            const userCred = await signInWithEmailAndPassword(auth, email, password);

     

const userRef = doc(db, 'users', userCred.user.uid);
const userSnap = await getDoc(userRef);

if (!userSnap.exists()) {
    await auth.signOut();
    throw new Error('User profile not found');
}

const userData = userSnap.data();

if (userData.role !== 'admin') {
    await auth.signOut();
    throw new Error('Access denied. Admin credentials required.');
}


            logger.success('Admin logged in successfully', { email });
            UI.showAlert('Admin login successful! Redirecting...', 'success');

            setTimeout(() => {
                window.location.replace('admin-dashboard.html');
            }, 1000);

        } catch (error) {
            logger.error('Admin login failed', { error: error.message });

            let errorMessage = 'Admin login failed. Please try again.';

            if (error.message.includes('Access denied')) {
                errorMessage = 'Access denied. This area is for administrators only.';
            } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                errorMessage = 'Invalid admin credentials.';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Too many failed attempts. Please try again later.';
            } else if (error.code === 'auth/network-request-failed') {
                errorMessage = 'Network error. Please check your connection.';
            }

            UI.showAlert(errorMessage, 'error');
            UI.enableForm('adminLoginForm');
        } finally {
            UI.hideLoading();
        }
    });
}

logger.info('Admin authentication module loaded');