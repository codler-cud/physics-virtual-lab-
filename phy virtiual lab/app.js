/* ============================================
   VIRTUAL LAB — SHARED APPLICATION LOGIC
   ============================================ */

// --- Accordion Logic ---
function initAccordions() {
    document.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            const wasOpen = item.classList.contains('open');

            // Close all
            document.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('open'));

            // Toggle clicked
            if (!wasOpen) {
                item.classList.add('open');
                item.classList.add('viewed');
            }

            // Check if all viewed
            checkAllViewed();
        });
    });
}

function checkAllViewed() {
    const items = document.querySelectorAll('.accordion-item');
    const viewed = document.querySelectorAll('.accordion-item.viewed');
    const btn = document.getElementById('proceedSimBtn');
    if (btn && items.length > 0 && viewed.length === items.length) {
        btn.disabled = false;
        btn.classList.add('animate-in');
    }
}

// --- Navigation helpers ---
function navigateTo(page) {
    window.location.href = page;
}

// --- Shared Data Store (using localStorage) ---
const LAB_STORAGE_KEY = 'virtuallab_observations';

function saveObservations(data) {
    localStorage.setItem(LAB_STORAGE_KEY, JSON.stringify(data));
}

function loadObservations() {
    const raw = localStorage.getItem(LAB_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
}

function clearObservations() {
    localStorage.removeItem(LAB_STORAGE_KEY);
}

// --- Init on page load ---
document.addEventListener('DOMContentLoaded', () => {
    initAccordions();

    // Animate elements on scroll
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.scroll-animate').forEach(el => {
        observer.observe(el);
    });
});
