
import { auth, db } from './firebase-config.js';
import { signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
    collection,
    getDocs,
    doc,
    getDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { enrollEvent } from './event-enroll.js';

let currentUserId = null;
let sports = {};
let cities = {};
let areas = {};
let events = [];

const sportSelect = document.getElementById('filterSport');
const citySelect = document.getElementById('filterCity');
const areaSelect = document.getElementById('filterArea');
const eventsGrid = document.getElementById('eventsGrid');
const loadingIndicator = document.getElementById('loadingIndicator');


const UI = {
    showLoading: () => {
        if (loadingIndicator) loadingIndicator.style.display = 'block';
    },

    hideLoading: () => {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    },

    showMessage: (message, container = eventsGrid) => {
        if (container) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <p style="font-size: 1.1rem; color: var(--text-light);">${message}</p>
                </div>
            `;
        }
    }
};


onAuthStateChanged(auth, async (user) => {
    if (!user) {
        console.log('No authenticated user, redirecting to login');
        window.location.replace('login.html');
        return;
    }

    try {
        currentUserId = user.uid;

        const userSnap = await getDoc(doc(db, 'users', user.uid));
        
        if (!userSnap.exists()) {
            console.error('User profile not found');
            await signOut(auth);
            window.location.replace('login.html');
            return;
        }

        const userData = userSnap.data();

        if (userData.role !== 'user') {
            console.log('User is not a regular user, redirecting');
            await signOut(auth);
            window.location.replace('login.html');
            return;
        }

const userNameElement = document.getElementById('userName');
if (userNameElement) {
    const displayName = userData.name && userData.name.trim() !== ''
        ? userData.name
        : userData.email;

    userNameElement.textContent = `Hi, ${displayName}`;
}


        await initializeDashboard();

    } catch (error) {
        console.error('Authentication error:', error);
        alert('An error occurred. Please login again.');
        window.location.replace('login.html');
    }
});


const logoutBtn = document.getElementById('logoutBtn');
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


async function initializeDashboard() {
    UI.showLoading();
    
    try {
        await loadFilters();
        await loadEvents();
        setupEventListeners();
        console.log('Dashboard initialized successfully');
    } catch (error) {
        console.error('Dashboard initialization failed:', error);
        UI.showMessage('Failed to load dashboard. Please refresh the page.');
    } finally {
        UI.hideLoading();
    }
}


async function loadFilters() {
    try {
        const sportSnap = await getDocs(collection(db, 'sports'));
        sportSnap.forEach(d => {
            sports[d.id] = d.data().name;
            const option = document.createElement('option');
            option.value = d.id;
            option.textContent = d.data().name;
            sportSelect.appendChild(option);
        });

        const citySnap = await getDocs(collection(db, 'cities'));
        citySnap.forEach(d => {
            cities[d.id] = d.data().name;
            const option = document.createElement('option');
            option.value = d.id;
            option.textContent = d.data().name;
            citySelect.appendChild(option);
        });

        const areaSnap = await getDocs(collection(db, 'areas'));
        areaSnap.forEach(d => {
            const areaData = d.data();
            areas[d.id] = {
                name: areaData.name,
                cityId: areaData.cityId
            };
        });

        console.log('Filters loaded:', { 
            sports: Object.keys(sports).length,
            cities: Object.keys(cities).length,
            areas: Object.keys(areas).length
        });

    } catch (error) {
        console.error('Failed to load filters:', error);
        throw error;
    }
}


async function loadEvents() {
    try {
        const snapshot = await getDocs(collection(db, 'events'));
        events = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
        }));

        console.log(`Loaded ${events.length} events`);
        renderEvents(events);

    } catch (error) {
        console.error('Failed to load events:', error);
        throw error;
    }
}


function renderEvents(eventsList) {
    if (!eventsGrid) return;

    eventsGrid.innerHTML = '';

    if (eventsList.length === 0) {
        UI.showMessage('No events found. Please check back later or adjust your filters.');
        return;
    }

    eventsList.forEach(event => {
        const eventCard = createEventCard(event);
        eventsGrid.appendChild(eventCard);
    });
}


function createEventCard(event) {
    const card = document.createElement('div');
    card.className = 'event-card';
    card.setAttribute('role', 'listitem');

    const sportName = sports[event.sportId] || 'Unknown Sport';
    const cityName = cities[event.cityId] || 'Unknown City';
    const areaName = areas[event.areaId]?.name || 'Unknown Area';
    const description = event.description || '';

    card.innerHTML = `
        <h3>${escapeHtml(event.name)}</h3>
        <p><strong>Sport:</strong> ${escapeHtml(sportName)}</p>
        <p><strong>Location:</strong> ${escapeHtml(cityName)} - ${escapeHtml(areaName)}</p>
        <p><strong>Date:</strong> ${formatDate(event.date)}</p>
        <p><strong>Time:</strong> ${formatTime(event.time)}</p>
        ${description ? `<p style="margin-top: 1rem; color: var(--text-light);">${escapeHtml(description)}</p>` : ''}
        <button 
            class="btn btn-primary" 
            style="margin-top: 1rem; width: 100%;"
            data-event-id="${event.id}"
            onclick="window.handleEnrollClick('${event.id}')"
        >
            Enroll in Event
        </button>
    `;

    return card;
}


window.handleEnrollClick = async (eventId) => {
    if (!currentUserId) {
        alert('Please login first');
        window.location.href = 'login.html';
        return;
    }

    try {
        await enrollEvent(eventId, currentUserId);
    } catch (error) {
        console.error('Enrollment failed:', error);
    }
};


function applyFilters() {
    const selectedSport = sportSelect.value;
    const selectedCity = citySelect.value;
    const selectedArea = areaSelect.value;

    const filteredEvents = events.filter(event => {
        const matchesSport = !selectedSport || event.sportId === selectedSport;
        const matchesCity = !selectedCity || event.cityId === selectedCity;
        const matchesArea = !selectedArea || event.areaId === selectedArea;

        return matchesSport && matchesCity && matchesArea;
    });

    console.log(`Filtered ${filteredEvents.length} events out of ${events.length}`);
    renderEvents(filteredEvents);
}


function setupEventListeners() {
    [sportSelect, citySelect, areaSelect].forEach(select => {
        if (select) {
            select.addEventListener('change', applyFilters);
        }
    });
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

console.log('Dashboard module loaded');