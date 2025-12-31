

import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 
'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

/**
 * Enroll User in Event
 * @param {string} eventId - The ID of the event to enroll in
 * @param {string} userId - The ID of the user enrolling
 * @returns {Promise<void>}
 */
export async function enrollEvent(eventId) {
    const user = auth.currentUser;

    if (!user) {
        alert('Please login to enroll in events');
        return;
    }

    const userId = user.uid;
    if (!eventId || !userId) {
        console.error('Invalid enrollment parameters:', { eventId, userId });
        alert('Invalid enrollment request. Please try again.');
        return;
    }

    try {
        console.log('Checking for duplicate enrollment...');

        const enrollmentQuery = query(
            collection(db, 'event_enrollments'),
            where('eventId', '==', eventId),
            where('userId', '==', userId)
        );

        const existingEnrollments = await getDocs(enrollmentQuery);

        if (!existingEnrollments.empty) {
            console.log('User already enrolled in this event');
            alert('You are already enrolled in this event! Check "My Events" to view your enrollments.');
            return;
        }

        console.log('Creating new enrollment...');

        const enrollmentData = {
            eventId,
            userId,
            enrolledAt: serverTimestamp(),
            status: 'enrolled'
        };

        await addDoc(collection(db, 'event_enrollments'), enrollmentData);

        console.log('Enrollment successful:', enrollmentData);

        showEnrollmentSuccess();

    } catch (error) {
        console.error('Enrollment failed:', error);

        let errorMessage = 'Failed to enroll in event. Please try again.';

        if (error.code === 'permission-denied') {
            errorMessage = 'You do not have permission to enroll in events.';
        } else if (error.code === 'unavailable') {
            errorMessage = 'Service is currently unavailable. Please try again later.';
        }

        alert(errorMessage);
    }
}


function showEnrollmentSuccess() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
    `;

    const successCard = document.createElement('div');
    successCard.style.cssText = `
        background: white;
        padding: 2rem;
        border-radius: 16px;
        max-width: 400px;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: slideUp 0.3s ease;
    `;

    successCard.innerHTML = `
        <div style="font-size: 4rem; margin-bottom: 1rem;">🎉</div>
        <h3 style="color: #10b981; margin-bottom: 0.5rem; font-size: 1.5rem;">
            Successfully Enrolled!
        </h3>
        <p style="color: #6b7280; margin-bottom: 1.5rem;">
            You've been enrolled in this event. Check "My Events" to view all your enrollments.
        </p>
        <button 
            id="viewMyEventsBtn"
            style="
                background: #2563eb;
                color: white;
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: 8px;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                margin-right: 0.5rem;
            "
        >
            View My Events
        </button>
        <button 
            id="closeSuccessBtn"
            style="
                background: #f3f4f6;
                color: #374151;
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: 8px;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
            "
        >
            Close
        </button>
    `;

    modal.appendChild(successCard);
    document.body.appendChild(modal);

    const viewBtn = successCard.querySelector('#viewMyEventsBtn');
    const closeBtn = successCard.querySelector('#closeSuccessBtn');

    viewBtn.addEventListener('click', () => {
        window.location.href = 'my-events.html';
    });

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

    setTimeout(() => {
        if (document.body.contains(modal)) {
            modal.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => modal.remove(), 300);
        }
    }, 5000);
}

console.log('Event enrollment module loaded');