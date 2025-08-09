// Lightweight client-side auth scaffold (NOT for production)
// For real security: use server-side sessions or secure HTTP-only cookies + proper hashing.
// This placeholder manages a pseudo session token in localStorage to drive app flow.

(function(){
  const TOKEN_KEY = 'cc:authToken';
  const USER_KEY = 'cc:userEmail';
  // Development mode: enable with ?dev=1 (persists) disable with ?dev=0
  const qs = new URLSearchParams(location.search);
  if (qs.has('dev')) {
    if (qs.get('dev') === '1') localStorage.setItem('cc:devMode','1');
    if (qs.get('dev') === '0') localStorage.removeItem('cc:devMode');
  }
  const DEV_AUTO_LOGIN = localStorage.getItem('cc:devMode') === '1';
  const DEV_USER_EMAIL = 'devuser@example.com';
  // Avatar visibility toggle (?avatar=0 to hide, ?avatar=1 to show again)
  if (qs.has('avatar')) {
    if (qs.get('avatar') === '0') localStorage.setItem('cc:hideAvatar','1');
    if (qs.get('avatar') === '1') localStorage.removeItem('cc:hideAvatar');
  }
  // Role simulation (?role=admin or ?role=user) persists; default user.
  if (qs.has('role')) {
    const r = qs.get('role');
    if (r === 'admin' || r === 'user') localStorage.setItem('cc:role', r);
  }
  function getRole(){ return localStorage.getItem('cc:role') || 'user'; }

  function isLoggedIn(){ return !!localStorage.getItem(TOKEN_KEY); }
  function getUser(){ return localStorage.getItem(USER_KEY) || null; }
  function setSession(email){
    try {
      const token = btoa(email + '|' + Date.now()); // placeholder token
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, email);
    } catch(e) { console.warn('Unable to persist session', e); }
  }
  function clearSession(){ localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); }

  function pageType(){
    const p = location.pathname.split('/').pop();
    if (p === '' || p === 'index.html') return 'index';
    if (p === 'login.html') return 'login';
    if (p === 'signup.html') return 'signup';
    return 'other';
  }

  function gate(){
    const type = pageType();
    if ((type === 'index' || type === 'other') && !isLoggedIn()) {
      location.replace('login.html');
      return true;
    }
    if ((type === 'login' || type === 'signup') && isLoggedIn()) {
      location.replace('index.html#home');
      return true;
    }
    return false;
  }

  // Auto-login in dev before gating if not already logged in (skip if prefill requested)
  if (DEV_AUTO_LOGIN && !localStorage.getItem(TOKEN_KEY) && !qs.has('prefill')) {
    try { setSession(DEV_USER_EMAIL); } catch(e){}
  }
  // Execute gating early (after potential auto-login)
  if (gate()) return;

  document.addEventListener('DOMContentLoaded', () => {
  // Hide profile nav until authenticated
  const profileNav = document.querySelector('a[href="#profile"].requires-auth');
  if (profileNav) profileNav.style.display = isLoggedIn() ? '' : 'none';
    // Enhance nav: replace login link with logout if logged in
    if (isLoggedIn()) {
      const nav = document.querySelector('.nav-links');
      if (nav && !nav.querySelector('#logoutBtn')) {
        injectAvatar(nav);
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = '#logout';
        a.id = 'logoutBtn';
        a.className = 'nav-action';
        a.setAttribute('role','button');
        a.innerHTML = '<span class="nav-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></span><span class="nav-label">Logout</span>';
        a.addEventListener('click', (e) => { 
          e.preventDefault(); 
          const currentUser = getUser();
          clearSession(); 
            // Redirect with prefill params so login form is populated for mock flow
          const emailParam = encodeURIComponent(currentUser || DEV_USER_EMAIL);
          location.replace('login.html?prefill=1&email=' + emailParam); 
        });
        li.appendChild(a);
        const loginLink = nav.querySelector('a[href="login.html"], a[href="./login.html"]');
        loginLink && (loginLink.style.display = 'none');
        nav.appendChild(li);
        // Admin badge
        if (getRole() === 'admin' && !nav.querySelector('.role-chip')) {
          const rli = document.createElement('li');
          rli.innerHTML = '<span class="role-chip" title="Admin">Admin</span>';
          nav.appendChild(rli);
        }
      }
    }

    // Login form handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', e => {
        e.preventDefault();
        const email = (loginForm.querySelector('[name="email"]')||{}).value || '';
        const password = (loginForm.querySelector('[name="password"]')||{}).value || '';
        if (!validateEmail(email)) return inlineError(loginForm, 'Enter a valid email');
        if (password.length < 6) return inlineError(loginForm, 'Password must be at least 6 characters');
        // Simulate auth success
        setSession(email.trim().toLowerCase());
        location.replace('index.html#home');
      });
      // Prefill if instructed via query params (?prefill=1&email=...)
      if (qs.has('prefill')) {
        const emailField = loginForm.querySelector('[name="email"]');
        const passField = loginForm.querySelector('[name="password"]');
        if (emailField && !emailField.value) emailField.value = qs.get('email') || DEV_USER_EMAIL;
        if (passField && !passField.value) passField.value = 'password123'; // mock password placeholder
        // Focus login button for quick tap
        const btn = loginForm.querySelector('button[type="submit"]');
        btn && setTimeout(()=>btn.focus(), 50);
      }
    }

    // Signup form handler
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
      signupForm.addEventListener('submit', e => {
        e.preventDefault();
        const email = (signupForm.querySelector('[name="email"]')||{}).value || '';
        const password = (signupForm.querySelector('[name="password"]')||{}).value || '';
        if (!validateEmail(email)) return inlineError(signupForm, 'Enter a valid email');
        if (password.length < 6) return inlineError(signupForm, 'Password must be at least 6 characters');
        setSession(email.trim().toLowerCase());
        location.replace('index.html#home');
      });
    }

    // Populate profile section with current user info
    if (isLoggedIn()) {
      const nameEl = document.getElementById('profile-name');
      const emailEl = document.getElementById('profile-email');
      const roleEl = document.getElementById('profile-role');
      const projCountEl = document.getElementById('project-count');
      const email = getUser();
      if (email) {
        const displayName = email.split('@')[0].replace(/[^a-z0-9]+/gi,' ').replace(/\b\w/g,c=>c.toUpperCase());
        nameEl && (nameEl.textContent = displayName);
        emailEl && (emailEl.textContent = email);
        roleEl && (roleEl.textContent = getRole());
        // Count projects list items if present
        const list = document.getElementById('profile-projects-list');
        if (projCountEl && list) projCountEl.textContent = list.querySelectorAll('li').length;
      }
    }
  });

  function validateEmail(e){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
  function inlineError(form, msg){
    let region = form.querySelector('.form-error');
    if (!region){
      region = document.createElement('div');
      region.className = 'form-error';
      region.setAttribute('role','alert');
      region.style.marginBottom = '0.75rem';
      region.style.color = '#ffb4b4';
      form.prepend(region);
    }
    region.textContent = msg;
  }

  // Expose minimal API for future modules
  window.CCAuth = { isLoggedIn, getUser, getRole, logout: () => { clearSession(); location.replace('login.html'); } };

  // Helpers
  function injectAvatar(nav){
  if (localStorage.getItem('cc:hideAvatar') === '1') return;
  if (nav.querySelector('.nav-avatar')) return;
    const email = getUser();
    const color = avatarColor(email || 'user');
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.className = 'nav-avatar';
    span.setAttribute('aria-label','User avatar');
    span.style.background = color.bg;
    span.style.color = color.fg;
    // Inline SVG user silhouette icon (accessible)
    span.innerHTML = '<svg class="nav-avatar-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6"/></svg>';
  span.addEventListener('click', () => { location.hash = '#profile'; });
    // Role badge overlay for admins
    if (getRole() === 'admin') {
      const badge = document.createElement('span');
      badge.className = 'nav-avatar-badge';
      badge.title = 'Admin';
      badge.textContent = 'A';
      span.appendChild(badge);
    }
  li.appendChild(span);
  // Place near right side (append before logout which is added after this call)
  nav.appendChild(li);
  }
  function avatarColor(seed){
    let h = 0; for (let i=0;i<seed.length;i++) h = (h*31 + seed.charCodeAt(i))>>>0;
    const hue = h % 360; const sat = 55; const light = 50;
    const bg = `hsl(${hue} ${sat}% ${light}%)`;
    const fg = light > 55 ? '#111' : '#fff';
    return { bg, fg };
  }
})();
