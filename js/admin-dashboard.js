

import { auth, db } from "./firebase-config.js";
import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    getDoc,
    query,
    where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let citiesData = [];
let sportsData = [];
let areasData = [];


const UI = {
    showLoading: () => {
        const loader = document.getElementById('loadingIndicator');
        if (loader) loader.style.display = 'block';
    },

    hideLoading: () => {
        const loader = document.getElementById('loadingIndicator');
        if (loader) loader.style.display = 'none';
    },

    showAlert: (message, type = 'success') => {
        const container = document.getElementById('alertContainer');
        if (!container) {
            alert(message);
            return;
        }

        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        container.appendChild(alert);

        setTimeout(() => alert.remove(), 4000);
    },

    clearAlerts: () => {
        const container = document.getElementById('alertContainer');
        if (container) container.innerHTML = '';
    }
};


onAuthStateChanged(auth, async (user) => {
    if (!user) {
        console.log('No authenticated user');
        return location.replace("login.html");
    }

    try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        
        if (!userSnap.exists() || userSnap.data().role !== "admin") {
            console.log('User is not an admin');
            await signOut(auth);
            return location.replace("login.html");
        }

        document.getElementById("adminEmail").textContent = userSnap.data().email;
        
        await initializeDashboard();

    } catch (error) {
        console.error('Auth check failed:', error);
        location.replace("login.html");
    }
});


document.getElementById("logoutBtn").onclick = async () => {
    try {
        await signOut(auth);
        location.replace("login.html");
    } catch (error) {
        console.error('Logout failed:', error);
        alert('Logout failed. Please try again.');
    }
};


document.querySelectorAll(".sidebar a").forEach(link => {
    link.onclick = e => {
        e.preventDefault();
        
        document.querySelectorAll(".sidebar a").forEach(a => a.classList.remove("active"));
        document.querySelectorAll(".content-section").forEach(s => s.classList.remove("active"));
        
        link.classList.add("active");
        document.getElementById(link.dataset.section).classList.add("active");
    };
});


async function initializeDashboard() {
    UI.showLoading();
    
    try {
        await Promise.all([
            loadSports(),
            loadCities(),
            loadAreas(),
            loadEvents()
        ]);
        
        console.log('Dashboard initialized successfully');
    } catch (error) {
        console.error('Dashboard initialization failed:', error);
        UI.showAlert('Failed to load dashboard data', 'error');
    } finally {
        UI.hideLoading();
    }
}



async function loadSports() {
    const tbody = document.getElementById("sportsTable");
    tbody.innerHTML = "";
    sportsData = [];

    try {
        const snapshot = await getDocs(collection(db, "sports"));
        
        snapshot.forEach(d => {
            sportsData.push({ id: d.id, ...d.data() });
            
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${escapeHtml(d.data().name)}</td>
                <td>${escapeHtml(d.data().description || 'N/A')}</td>
                <td>
                    <button class="btn btn-danger btn-small" onclick="window.deleteSport('${d.id}')">
                        Delete
                    </button>
                </td>
            `;
        });

        updateEventSportDropdown();

        console.log(`Loaded ${sportsData.length} sports`);

    } catch (error) {
        console.error('Failed to load sports:', error);
        UI.showAlert('Failed to load sports', 'error');
    }
}

window.deleteSport = async (id) => {
    if (!confirm('Are you sure you want to delete this sport?')) return;
    
    try {
        await deleteDoc(doc(db, "sports", id));
        UI.showAlert('Sport deleted successfully');
        await loadSports();
    } catch (error) {
        console.error('Delete sport failed:', error);
        UI.showAlert('Failed to delete sport', 'error');
    }
};

document.getElementById("sportForm").onsubmit = async e => {
    e.preventDefault();
    
    const name = document.getElementById("sportName").value.trim();
    const description = document.getElementById("sportDesc").value.trim();

    if (!name) {
        UI.showAlert('Please enter a sport name', 'error');
        return;
    }

    try {
        await addDoc(collection(db, "sports"), {
            name,
            description: description || '',
            createdAt: new Date().toISOString()
        });
        
        UI.showAlert('Sport added successfully');
        e.target.reset();
        await loadSports();
    } catch (error) {
        console.error('Add sport failed:', error);
        UI.showAlert('Failed to add sport', 'error');
    }
};



async function loadCities() {
    const tbody = document.getElementById("citiesTable");
    const areaCitySelect = document.getElementById("areaCity");
    const eventCitySelect = document.getElementById("eventCity");

    tbody.innerHTML = "";
    areaCitySelect.innerHTML = '<option value="">Select a city</option>';
    eventCitySelect.innerHTML = '<option value="">Select a city</option>';
    citiesData = [];

    try {
        const snapshot = await getDocs(collection(db, "cities"));

        snapshot.forEach(d => {
            citiesData.push({ id: d.id, ...d.data() });
            
            const cityName = d.data().name;

            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${escapeHtml(cityName)}</td>
                <td>
                    <button class="btn btn-danger btn-small" onclick="window.deleteCity('${d.id}')">
                        Delete
                    </button>
                </td>
            `;

            areaCitySelect.innerHTML += `<option value="${d.id}">${escapeHtml(cityName)}</option>`;
            eventCitySelect.innerHTML += `<option value="${d.id}">${escapeHtml(cityName)}</option>`;
        });

        console.log(`Loaded ${citiesData.length} cities`);

    } catch (error) {
        console.error('Failed to load cities:', error);
        UI.showAlert('Failed to load cities', 'error');
    }
}

window.deleteCity = async (id) => {
    if (!confirm('Are you sure you want to delete this city? Associated areas will remain.')) return;
    
    try {
        await deleteDoc(doc(db, "cities", id));
        UI.showAlert('City deleted successfully');
        await Promise.all([loadCities(), loadAreas()]);
    } catch (error) {
        console.error('Delete city failed:', error);
        UI.showAlert('Failed to delete city', 'error');
    }
};

document.getElementById("cityForm").onsubmit = async e => {
    e.preventDefault();
    
    const name = document.getElementById("cityName").value.trim();

    if (!name) {
        UI.showAlert('Please enter a city name', 'error');
        return;
    }

    try {
        await addDoc(collection(db, "cities"), {
            name,
            createdAt: new Date().toISOString()
        });
        
        UI.showAlert('City added successfully');
        e.target.reset();
        await Promise.all([loadCities(), loadAreas()]);
    } catch (error) {
        console.error('Add city failed:', error);
        UI.showAlert('Failed to add city', 'error');
    }
};



async function loadAreas() {
    const tbody = document.getElementById("areasTable");
    const eventAreaSelect = document.getElementById("eventArea");
    
    tbody.innerHTML = "";
    eventAreaSelect.innerHTML = '<option value="">Select an area</option>';
    areasData = [];

    try {
        const snapshot = await getDocs(collection(db, "areas"));

        snapshot.forEach(d => {
            const areaData = d.data();
            areasData.push({ id: d.id, ...areaData });
            
            const cityName = citiesData.find(c => c.id === areaData.cityId)?.name || 'Unknown';

            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${escapeHtml(areaData.name)}</td>
                <td>${escapeHtml(cityName)}</td>
                <td>
                    <button class="btn btn-danger btn-small" onclick="window.deleteArea('${d.id}')">
                        Delete
                    </button>
                </td>
            `;

            eventAreaSelect.innerHTML += `<option value="${d.id}" data-city="${areaData.cityId}">${escapeHtml(areaData.name)}</option>`;
        });

        console.log(`Loaded ${areasData.length} areas`);

    } catch (error) {
        console.error('Failed to load areas:', error);
        UI.showAlert('Failed to load areas', 'error');
    }
}

window.deleteArea = async (id) => {
    if (!confirm('Are you sure you want to delete this area?')) return;
    
    try {
        await deleteDoc(doc(db, "areas", id));
        UI.showAlert('Area deleted successfully');
        await loadAreas();
    } catch (error) {
        console.error('Delete area failed:', error);
        UI.showAlert('Failed to delete area', 'error');
    }
};

document.getElementById("areaForm").onsubmit = async e => {
    e.preventDefault();
    
    const name = document.getElementById("areaName").value.trim();
    const cityId = document.getElementById("areaCity").value;

    if (!name || !cityId) {
        UI.showAlert('Please fill in all fields', 'error');
        return;
    }

    try {
        await addDoc(collection(db, "areas"), {
            name,
            cityId,
            createdAt: new Date().toISOString()
        });
        
        UI.showAlert('Area added successfully');
        e.target.reset();
        await loadAreas();
    } catch (error) {
        console.error('Add area failed:', error);
        UI.showAlert('Failed to add area', 'error');
    }
};


document.getElementById("eventCity")?.addEventListener('change', function() {
    const selectedCity = this.value;
    const eventAreaSelect = document.getElementById("eventArea");
    const options = eventAreaSelect.querySelectorAll('option');
    
    options.forEach(option => {
        if (option.value === '') {
            option.style.display = 'block';
        } else {
            const optionCity = option.getAttribute('data-city');
            option.style.display = (!selectedCity || optionCity === selectedCity) ? 'block' : 'none';
        }
    });
    
    eventAreaSelect.value = '';
});



async function loadEvents() {
    const tbody = document.getElementById("eventsTable");
    tbody.innerHTML = "";

    try {
        const snapshot = await getDocs(collection(db, "events"));

        snapshot.forEach(d => {
            const eventData = d.data();
            const sportName = sportsData.find(s => s.id === eventData.sportId)?.name || 'Unknown';
            const cityName = citiesData.find(c => c.id === eventData.cityId)?.name || 'Unknown';
            const areaName = areasData.find(a => a.id === eventData.areaId)?.name || 'Unknown';

            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${escapeHtml(eventData.name)}</td>
                <td>${escapeHtml(sportName)}</td>
                <td>${escapeHtml(cityName)} - ${escapeHtml(areaName)}</td>
                <td>${formatDate(eventData.date)} ${formatTime(eventData.time)}</td>
                <td>
                    <button class="btn btn-danger btn-small" onclick="window.deleteEvent('${d.id}')">
                        Delete
                    </button>
                </td>
            `;
        });

        console.log('Events loaded successfully');

    } catch (error) {
        console.error('Failed to load events:', error);
        UI.showAlert('Failed to load events', 'error');
    }
}

window.deleteEvent = async (id) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    try {
        await deleteDoc(doc(db, "events", id));
        UI.showAlert('Event deleted successfully');
        await loadEvents();
    } catch (error) {
        console.error('Delete event failed:', error);
        UI.showAlert('Failed to delete event', 'error');
    }
};

document.getElementById("eventForm").onsubmit = async e => {
    e.preventDefault();
    
    const name = document.getElementById("eventName").value.trim();
    const sportId = document.getElementById("eventSport").value;
    const cityId = document.getElementById("eventCity").value;
    const areaId = document.getElementById("eventArea").value;
    const date = document.getElementById("eventDate").value;
    const time = document.getElementById("eventTime").value;
    const description = document.getElementById("eventDescription").value.trim();

    if (!name || !sportId || !cityId || !areaId || !date || !time) {
        UI.showAlert('Please fill in all required fields', 'error');
        return;
    }

    try {
        await addDoc(collection(db, "events"), {
            name,
            sportId,
            cityId,
            areaId,
            date,
            time,
            description: description || '',
            createdAt: new Date().toISOString()
        });
        
        UI.showAlert('Event added successfully');
        e.target.reset();
        await loadEvents();
    } catch (error) {
        console.error('Add event failed:', error);
        UI.showAlert('Failed to add event', 'error');
    }
};


function updateEventSportDropdown() {
    const eventSportSelect = document.getElementById("eventSport");
    if (!eventSportSelect) return;

    eventSportSelect.innerHTML = '<option value="">Select a sport</option>';
    sportsData.forEach(sport => {
        eventSportSelect.innerHTML += `<option value="${sport.id}">${escapeHtml(sport.name)}</option>`;
    });
}


function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch {
        return dateString;
    }
}

function formatTime(timeString) {
    if (!timeString) return 'N/A';
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

console.log('Admin dashboard module loaded');