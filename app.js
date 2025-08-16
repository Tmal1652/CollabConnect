// Smooth Scroll for same-page hash links only
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        // Only handle if the link stays on the same document
        if (href && (href === '#' || href.startsWith('#'))) {
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
                setActiveNav(href);
            }
        }
    });
});
// JavaScript to handle the opening and closing of the Edit Profile modal
let lastFocusedBeforeModal = null;
function editProfile() {
    const modal = document.getElementById("editProfileModal");
    lastFocusedBeforeModal = document.activeElement;
    modal.style.display = "flex";
    modal.setAttribute('aria-hidden', 'false');
    // Focus first input
    const firstInput = modal.querySelector('input, button, [href], select, textarea, [tabindex]:not([tabindex="-1"])');
    firstInput && firstInput.focus();
    document.addEventListener('keydown', handleModalKeys);
}

function closeModal() {
    const modal = document.getElementById("editProfileModal");
    modal.style.display = "none";
    modal.setAttribute('aria-hidden', 'true');
    document.removeEventListener('keydown', handleModalKeys);
    // Restore focus
    (lastFocusedBeforeModal || document.getElementById('editProfileBtn'))?.focus();
}

function handleModalKeys(e) {
    const modal = document.getElementById('editProfileModal');
    if (e.key === 'Escape') return closeModal();
    if (e.key !== 'Tab') return;
    // Focus trap
    const focusables = modal.querySelectorAll('a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])');
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
    }
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
    const modal = document.getElementById('editProfileModal');
    if (!modal || modal.style.display !== 'flex') return;
    if (e.target === modal) closeModal();
});

// Sticky Navbar Scroll Effect
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});
// Detect when sections come into view
const sections = document.querySelectorAll('section');
const options = {
    threshold: 0.1
};

const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target); // Stop observing once it animates in
        }
    });
}, options);

sections.forEach(section => {
    observer.observe(section);
});

// Single adaptive navbar (no toggle needed)

// Automatic theming is handled by CSS prefers-color-scheme.
// If you ever need to run logic on theme changes, this listener is ready.
(function() {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    mq.addEventListener?.('change', () => {
        // No-op: CSS variables update automatically via media query.
        // Hook here if you ever need to respond to theme changes in JS.
    });
})();

// Active nav/tab highlighting on scroll
const navAnchors = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));

function setActiveNav(hash) {
    navAnchors.forEach(a => {
        const isActive = a.getAttribute('href') === hash;
        a.classList.toggle('active', isActive);
        if (isActive) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
}

function getCurrentSectionHash() {
    let current = '#home';
    const threshold = window.innerHeight * 0.3;
    document.querySelectorAll('header[id], section[id]').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top <= threshold && rect.bottom > threshold) {
            current = `#${el.id}`;
        }
    });
    return current;
}

function onScrollUpdateActive() {
    const hash = getCurrentSectionHash();
    setActiveNav(hash);
}

window.addEventListener('scroll', onScrollUpdateActive, { passive: true });
window.addEventListener('load', onScrollUpdateActive);

// Mobile routing logic moved to mobile/router.js
