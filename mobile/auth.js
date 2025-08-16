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
  // If devMode flag has never been set, default it ON for mock/demo so user appears logged in immediately.
  // Disable anytime with ?dev=0 in the URL.
  if (localStorage.getItem('cc:devMode') === null) {
    localStorage.setItem('cc:devMode','1');
  }
  // Re-evaluate after potential default
  const EFFECTIVE_AUTO_LOGIN = localStorage.getItem('cc:devMode') === '1';
  // Avatar visibility toggle (?avatar=0 to hide, ?avatar=1 to show again)
  if (qs.has('avatar')) {
    if (qs.get('avatar') === '0') localStorage.setItem('cc:hideAvatar','1');
    if (qs.get('avatar') === '1') localStorage.removeItem('cc:hideAvatar');
  }
  // Role simulation (?role=admin|user|pro) persists; default user.
  if (qs.has('role')) {
    const r = qs.get('role');
    if (r === 'admin' || r === 'user' || r === 'pro') localStorage.setItem('cc:role', r);
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
      location.replace('social.html');
      return true;
    }
    return false;
  }

  // Auto-login in dev before gating if not already logged in (skip if prefill requested)
  if (EFFECTIVE_AUTO_LOGIN && !localStorage.getItem(TOKEN_KEY) && !qs.has('prefill')) {
    try { setSession(DEV_USER_EMAIL); } catch(e){}
  }
  // Execute gating early (after potential auto-login)
  if (gate()) return;

  document.addEventListener('DOMContentLoaded', () => {
  // Hide any nav items requiring auth (e.g., Profile, Social)
  document.querySelectorAll('.requires-auth').forEach(el => {
    el.style.display = isLoggedIn() ? '' : 'none';
  });
  // Enhance nav: replace login link with logout if logged in
    if (isLoggedIn()) {
      const nav = document.querySelector('.nav-links');
      if (nav && !nav.querySelector('#logoutBtn')) {
    // Attach status dot to the Profile tab icon (no extra avatar item)
    attachStatusDotToProfile();
  const li = document.createElement('li');
  li.classList.add('nav-utility','nav-logout-item');
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
  // No extra avatar item; profile link remains in place with a status dot
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
  location.replace('social.html');
      });
      // Prefill for mock/demo: if query ?prefill=1 OR simply not logged in (default behavior) we populate fields.
      if (!isLoggedIn() || qs.has('prefill')) {
        const emailField = loginForm.querySelector('[name="email"]');
        const passField = loginForm.querySelector('[name="password"]');
        if (emailField) emailField.value = qs.get('email') || DEV_USER_EMAIL;
        if (passField) passField.value = 'password123';
        const btn = loginForm.querySelector('button[type="submit"]');
        // If ?autosubmit=1 is provided, automatically submit after small delay for seamless mock.
        if (qs.get('autosubmit') === '1') {
          setTimeout(()=> btn && btn.click(), 350);
        } else {
          btn && setTimeout(()=>btn.focus(), 60);
        }
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
  location.replace('social.html');
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
        if (projCountEl && list) {
          const n = list.querySelectorAll('li').length;
          projCountEl.textContent = String(n);
        }
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
  function attachStatusDotToProfile(){
    const profileLink = document.querySelector('.nav-links a[href="#profile"], .nav-links a[href="profile.html"], .nav-links a[href="./profile.html"]');
    if (!profileLink) return;
    const icon = profileLink.querySelector('.nav-icon');
    if (!icon) return;
    if (icon.querySelector('.nav-status-dot')) return; // already added
    const statusType = (localStorage.getItem('cc:devMode') === '1') ? 'dev' : (getRole() === 'pro' ? 'pro' : 'user');
    const dot = document.createElement('span');
    dot.className = 'nav-status-dot';
    dot.setAttribute('data-status', statusType);
    dot.title = statusType.charAt(0).toUpperCase() + statusType.slice(1);
    icon.appendChild(dot);
  }
  // Deprecated separate avatar injection — kept for reference but unused
  function avatarColor(seed){
    let h = 0; for (let i=0;i<seed.length;i++) h = (h*31 + seed.charCodeAt(i))>>>0;
    const hue = h % 360; const sat = 55; const light = 50;
    const bg = `hsl(${hue} ${sat}% ${light}%)`;
    const fg = light > 55 ? '#111' : '#fff';
    return { bg, fg };
  }
})();
