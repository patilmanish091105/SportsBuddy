

import { auth, db } from './firebase-config.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
    collection,
    getDocs,
    query,
    where,
    setDoc,
    doc,
    getDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
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
        if (!container) return;

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
            const inputs = form.querySelectorAll('input, select, button');
            inputs.forEach(input => input.disabled = true);
        }
    },

    enableForm: (formId) => {
        const form = document.getElementById(formId);
        if (form) {
            const inputs = form.querySelectorAll('input, select, button');
            inputs.forEach(input => input.disabled = false);
        }
    }
};


async function loadCitiesAndAreas() {
    const citySelect = document.getElementById('city');
    const areaSelect = document.getElementById('area');

    if (!citySelect || !areaSelect) return;

    try {
        const citySnap = await getDocs(collection(db, 'cities'));
        citySelect.innerHTML = '<option value="">Select your city</option>';

        const cities = [];
        citySnap.forEach(cityDoc => {
            cities.push({
                id: cityDoc.id,
                name: cityDoc.data().name
            });
        });

        cities.sort((a, b) => a.name.localeCompare(b.name));

        cities.forEach(city => {
            const option = document.createElement('option');
            option.value = city.id;
            option.textContent = city.name;
            citySelect.appendChild(option);
        });

        citySelect.addEventListener('change', async () => {
            areaSelect.innerHTML = '<option value="">Loading areas...</option>';
            areaSelect.disabled = true;

            if (!citySelect.value) {
                areaSelect.innerHTML = '<option value="">First select a city</option>';
                return;
            }

            try {
                const q = query(
                    collection(db, 'areas'),
                    where('cityId', '==', citySelect.value)
                );

                const areaSnap = await getDocs(q);
                areaSelect.innerHTML = '<option value="">Select your area</option>';

                const areas = [];
                areaSnap.forEach(areaDoc => {
                    areas.push({
                        id: areaDoc.id,
                        name: areaDoc.data().name
                    });
                });

                areas.sort((a, b) => a.name.localeCompare(b.name));

                areas.forEach(area => {
                    const option = document.createElement('option');
                    option.value = area.id;
                    option.textContent = area.name;
                    areaSelect.appendChild(option);
                });

                areaSelect.disabled = false;

            } catch (error) {
                logger.error('Failed to load areas', { error: error.message });
                areaSelect.innerHTML = '<option value="">Error loading areas</option>';
                UI.showAlert('Failed to load areas. Please try again.', 'error');
            }
        });

        logger.info('Cities and areas loaded successfully');

    } catch (error) {
        logger.error('Failed to load cities', { error: error.message });
        UI.showAlert('Failed to load cities. Please refresh the page.', 'error');
    }
}


const registerForm = document.getElementById('registerForm');

if (registerForm) {
    loadCitiesAndAreas();

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        UI.clearAlerts();

        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim().toLowerCase();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const cityId = document.getElementById('city').value;
        const areaId = document.getElementById('area').value;
        const termsAccepted = document.getElementById('terms').checked;

        if (!name || name.length < 2) {
            UI.showAlert('Please enter a valid name (minimum 2 characters)', 'error');
            return;
        }

        if (!email.includes('@')) {
            UI.showAlert('Please enter a valid email address', 'error');
            return;
        }

        if (password.length < 6) {
            UI.showAlert('Password must be at least 6 characters long', 'error');
            return;
        }

        if (password !== confirmPassword) {
            UI.showAlert('Passwords do not match', 'error');
            return;
        }

        if (!cityId || !areaId) {
            UI.showAlert('Please select both city and area', 'error');
            return;
        }

        if (!termsAccepted) {
            UI.showAlert('Please accept the Terms & Conditions', 'error');
            return;
        }

        UI.showLoading();
        UI.disableForm('registerForm');

        try {
            logger.info('Creating new user account');
            const userCred = await createUserWithEmailAndPassword(auth, email, password);

            await setDoc(doc(db, 'users', userCred.user.uid), {
                uid: userCred.user.uid,
                name,
                email,
                cityId,
                areaId,
                role: 'user',
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            });

            logger.success('User registered successfully', { email });

            await signOut(auth);

            UI.showAlert('Registration successful! Redirecting to login...', 'success');

            setTimeout(() => {
                window.location.replace('login.html');
            }, 2000);

        } catch (error) {
            logger.error('Registration failed', { error: error.message });

            let errorMessage = 'Registration failed. Please try again.';
            
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'This email is already registered. Please login instead.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'Password is too weak. Please use a stronger password.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address format.';
            } else if (error.code === 'auth/network-request-failed') {
                errorMessage = 'Network error. Please check your connection.';
            }

            UI.showAlert(errorMessage, 'error');
            UI.enableForm('registerForm');
        } finally {
            UI.hideLoading();
        }
    });
}


const loginForm = document.getElementById('loginForm');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        UI.clearAlerts();

        const email = document.getElementById('email').value.trim().toLowerCase();
        const password = document.getElementById('password').value;
        const remember = document.getElementById('remember')?.checked || false;

        if (!email || !password) {
            UI.showAlert('Please enter both email and password', 'error');
            return;
        }

        UI.showLoading();
        UI.disableForm('loginForm');

        try {
            logger.info('Attempting user login', { email });
            const userCred = await signInWithEmailAndPassword(auth, email, password);
            const uid = userCred.user.uid;

            const userSnap = await getDoc(doc(db, 'users', uid));

            if (!userSnap.exists()) {
                await signOut(auth);
                throw new Error('User profile not found. Please contact support.');
            }

            const userData = userSnap.data();
            const role = userData.role;

            await setDoc(doc(db, 'users', uid), {
                ...userData,
                lastLogin: new Date().toISOString()
            });

            logger.success('Login successful', { email, role });

            if (remember) {
                localStorage.setItem('rememberMe', 'true');
            }

            UI.showAlert('Login successful! Redirecting...', 'success');

            setTimeout(() => {
                if (role === 'admin') {
                    window.location.replace('admin-dashboard.html');
                } else {
                    window.location.replace('dashboard.html');
                }
            }, 1000);

        } catch (error) {
            logger.error('Login failed', { error: error.message });

            let errorMessage = 'Login failed. Please try again.';
            
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                errorMessage = 'Invalid email or password.';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Too many failed attempts. Please try again later.';
            } else if (error.code === 'auth/network-request-failed') {
                errorMessage = 'Network error. Please check your connection.';
            } else if (error.message.includes('profile not found')) {
                errorMessage = error.message;
            }

            UI.showAlert(errorMessage, 'error');
            UI.enableForm('loginForm');
        } finally {
            UI.hideLoading();
        }
    });
}

logger.info('Authentication module loaded');