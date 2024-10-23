// Smooth Scroll for Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});
// JavaScript to handle the opening and closing of the Edit Profile modal
function editProfile() {
    document.getElementById("editProfileModal").style.display = "flex";
}

function closeModal() {
    document.getElementById("editProfileModal").style.display = "none";
}

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

// Toggle mobile navigation with the hamburger menu
const menuIcon = document.querySelector('.menu-icon');
const navLinks = document.querySelector('.nav-links');
const overlay = document.createElement('div');
overlay.classList.add('overlay');

// Append overlay to the body
document.body.appendChild(overlay);

menuIcon.addEventListener('click', () => {
    // Toggle sidebar visibility
    navLinks.classList.toggle('nav-active');
    
    // Toggle overlay visibility
    overlay.classList.toggle('overlay-active');
    
    // Ensure the hamburger remains clickable to close the menu
    menuIcon.classList.toggle('menu-open');
});

// Close the sidebar if overlay is clicked
overlay.addEventListener('click', () => {
    navLinks.classList.remove('nav-active');
    overlay.classList.remove('overlay-active');
});