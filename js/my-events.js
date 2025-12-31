

import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let sports = {};
let cities = {};
let areas = {};

const eventsGrid = document.getElementById('myEventsGrid');
const loadingIndicator = document.getElementById('loadingIndicator');
const logoutBtn = document.getElementById('logoutBtn');


const UI = {
    showLoading: () => {
        if (loadingIndicator) loadingIndicator.style.display = 'block';
    },

    hideLoading: () => {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    },

    showMessage: (message) => {
        if (eventsGrid) {
            eventsGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <p style="font-size: 1.1rem; color: var(--text-light);">${message}</p>
                </div>
            `;
        }
    }
};

/**
 * Check if Event is Today
 * @param {string} eventDate - Event date in YYYY-MM-DD format
 * @returns {boolean}
 */
function isEventToday(eventDate) {
    if (!eventDate) return false;
    const today = new Date().toISOString().split('T')[0];
    return eventDate === today;
}

/**
 * Check if Event is Upcoming (within 7 days)
 * @param {string} eventDate - Event date in YYYY-MM-DD format
 * @returns {boolean}
 */
function isEventUpcoming(eventDate) {
    if (!eventDate) return false;
    const today = new Date();
    const event = new Date(eventDate);
    const diffTime = event - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 7;
}


async function loadMasterData() {
    try {
        const sportSnap = await getDocs(collection(db, 'sports'));
        sportSnap.forEach(d => {
            sports[d.id] = d.data().name;
        });

        const citySnap = await getDocs(collection(db, 'cities'));
        citySnap.forEach(d => {
            cities[d.id] = d.data().name;
        });

        const areaSnap = await getDocs(collection(db, 'areas'));
        areaSnap.forEach(d => {
            areas[d.id] = d.data().name;
        });

        console.log('Master data loaded successfully');

    } catch (error) {
        console.error('Failed to load master data:', error);
        throw error;
    }
}

/**
 * Load User's Enrolled Events
 * @param {string} userId - User ID
 */
async function loadMyEvents(userId) {
    eventsGrid.innerHTML = '';

    try {
        const enrollmentQuery = query(
            collection(db, 'event_enrollments'),
            where('userId', '==', userId)
        );

        const enrollmentSnap = await getDocs(enrollmentQuery);

        if (enrollmentSnap.empty) {
            UI.showMessage(`
                <div style="text-align: center;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📅</div>
                    <p style="font-size: 1.2rem; margin-bottom: 0.5rem;">No Events Yet</p>
                    <p>You haven't enrolled in any events yet.</p>
                    <a href="dashboard.html" class="btn btn-primary" style="margin-top: 1rem;">
                        Browse Events
                    </a>
                </div>
            `);
            return;
        }

        let todayEventsShown = false;

        for (const enrollDoc of enrollmentSnap.docs) {
            const eventId = enrollDoc.data().eventId;
            
            try {
                const eventSnap = await getDoc(doc(db, 'events', eventId));

                if (!eventSnap.exists()) {
                    console.warn(`Event ${eventId} not found`);
                    continue;
                }

                const eventData = eventSnap.data();
                const eventCard = createEventCard(eventData);
                eventsGrid.appendChild(eventCard);

                if (isEventToday(eventData.date) && !todayEventsShown) {
                    todayEventsShown = true;
                    showTodayEventReminder(eventData);
                }

            } catch (error) {
                console.error(`Failed to load event ${eventId}:`, error);
            }
        }

        console.log('Enrolled events loaded successfully');

    } catch (error) {
        console.error('Failed to load enrolled events:', error);
        UI.showMessage('Failed to load your events. Please refresh the page.');
    }
}

/**
 * Create Event Card Element
 * @param {object} event - Event data
 * @returns {HTMLElement}
 */
function createEventCard(event) {
    const card = document.createElement('div');
    card.className = 'event-card';

    if (isEventToday(event.date)) {
        card.classList.add('reminder-card');
    }

    const sportName = sports[event.sportId] || 'Unknown Sport';
    const cityName = cities[event.cityId] || 'Unknown City';
    const areaName = areas[event.areaId] || 'Unknown Area';

    const todayBadge = isEventToday(event.date)
        ? '<div class="reminder-badge">⏰ Event Today!</div>'
        : isEventUpcoming(event.date)
        ? '<div class="reminder-badge" style="background: #3b82f6;">📅 Upcoming</div>'
        : '';

    card.innerHTML = `
        ${todayBadge}
        <h3>${escapeHtml(event.name)}</h3>
        <p><strong>Sport:</strong> ${escapeHtml(sportName)}</p>
        <p><strong>Location:</strong> ${escapeHtml(cityName)} - ${escapeHtml(areaName)}</p>
        <p><strong>Date:</strong> ${formatDate(event.date)}</p>
        <p><strong>Time:</strong> ${formatTime(event.time)}</p>
        ${event.description ? `<p style="margin-top: 1rem; color: var(--text-light);">${escapeHtml(event.description)}</p>` : ''}
        <p style="margin-top: 1rem;">
            <strong style="color: #10b981;">✅ Enrolled</strong>
        </p>
    `;

    return card;
}

/**
 * Show Today's Event Reminder (Modal)
 * @param {object} event - Event data
 */
function showTodayEventReminder(event) {
    setTimeout(() => {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        `;

        const reminderCard = document.createElement('div');
        reminderCard.style.cssText = `
            background: white;
            padding: 2rem;
            border-radius: 16px;
            max-width: 450px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            animation: slideUp 0.3s ease;
        `;

        reminderCard.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">⏰</div>
                <h3 style="color: #f59e0b; margin-bottom: 1rem; font-size: 1.5rem;">
                    Event Reminder!
                </h3>
                <p style="color: #374151; margin-bottom: 0.5rem; font-size: 1.1rem;">
                    <strong>${escapeHtml(event.name)}</strong>
                </p>
                <p style="color: #6b7280; margin-bottom: 1.5rem;">
                    Your event is scheduled for <strong>today at ${formatTime(event.time)}</strong>
                </p>
                <button 
                    id="closeReminderBtn"
                    style="
                        background: #2563eb;
                        color: white;
                        border: none;
                        padding: 0.75rem 2rem;
                        border-radius: 8px;
                        font-size: 1rem;
                        font-weight: 600;
                        cursor: pointer;
                    "
                >
                    Got it!
                </button>
            </div>
        `;

        modal.appendChild(reminderCard);
        document.body.appendChild(modal);

        const closeBtn = reminderCard.querySelector('#closeReminderBtn');
        closeBtn.addEventListener('click', () => {
            modal.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => modal.remove(), 300);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.animation = 'fadeOut 0.3s ease';
                setTimeout(() => modal.remove(), 300);
            }
        });

    }, 1000); 
}


function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return 'Date not set';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch {
        return dateString;
    }
}

function formatTime(timeString) {
    if (!timeString) return 'Time not set';
    try {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    } catch {
        return timeString;
    }
}


if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            window.location.replace('login.html');
        } catch (error) {
            console.error('Logout error:', error);
            alert('Logout failed. Please try again.');
        }
    });
}


onAuthStateChanged(auth, async (user) => {
    if (!user) {
        console.log('No authenticated user, redirecting to login');
        window.location.replace('login.html');
        return;
    }

    UI.showLoading();

    try {
        await loadMasterData();
        await loadMyEvents(user.uid);
    } catch (error) {
        console.error('Failed to load my events page:', error);
        UI.showMessage('Failed to load events. Please refresh the page.');
    } finally {
        UI.hideLoading();
    }
});

console.log('My events module loaded');