// Lightweight client-side auth scaffold (NOT for production)
// For real security: use server-side sessions or secure HTTP-only cookies + proper hashing.
// This placeholder manages a pseudo session token in localStorage to drive app flow.

(function(){
  // DEMO MODE: disable real auth logic and use simple redirects for login/logout
  // Set to true to neutralize gating and storage and make the demo always work.
  const DEMO_MODE = true;
  const TOKEN_KEY = 'cc:authToken';
  const USER_KEY = 'cc:userEmail';
  // Mock accounts (demo only)
  const USER1_EMAIL = 'user1@example.com';
  const USER1_PASSWORD = 'userpass123';
  const qs = new URLSearchParams(location.search);
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
    // Determine the current page and whether it should be protected.
    const p = (location.pathname.split('/').pop() || '').toLowerCase();
    const page = p || 'index.html';
    const PROTECTED_PAGES = new Set(['social.html','profile.html']);
    const isLogin = page === 'login.html';
    const isSignup = page === 'signup.html';
    const isProtected = PROTECTED_PAGES.has(page);
    return { page, isLogin, isSignup, isProtected };
  }

  function gate(){
    const { isLogin, isSignup, isProtected } = pageType();
    // Only protect explicitly marked pages (e.g., Social, Profile)
    if (isProtected && !isLoggedIn()) {
      location.replace('login.html');
      return true;
    }
    // If already logged in, keep users away from auth pages
    if ((isLogin || isSignup) && isLoggedIn()) {
      location.replace('social.html');
      return true;
    }
    return false;
  }

  // In DEMO_MODE, skip any auto-login/gating. If needed in future, re-enable gate() above.

  document.addEventListener('DOMContentLoaded', () => {
  // Clean up any leftover role chips from prior sessions
  try {
    document.querySelectorAll('.nav-links .role-chip').forEach(el => el.remove());
  } catch(_){}
  // In DEMO_MODE, always show auth-required nav items; otherwise respect login state
  document.querySelectorAll('.requires-auth').forEach(el => {
    el.style.display = DEMO_MODE ? '' : (isLoggedIn() ? '' : 'none');
  });
  // Enhance nav: in DEMO_MODE always provide a Logout button that simply redirects
    if (DEMO_MODE || isLoggedIn()) {
      const nav = document.querySelector('.nav-links');
      if (nav && !nav.querySelector('#logoutBtn')) {
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
      if (!DEMO_MODE) {
        clearSession();
        try { localStorage.removeItem('cc:devMode'); localStorage.removeItem('cc:role'); } catch(_){}
      }
      // Simple redirect for demo
      location.href = 'login.html?source=logout';
        });
        li.appendChild(a);
        const loginLink = nav.querySelector('a[href="login.html"], a[href="./login.html"]');
        loginLink && (loginLink.style.display = 'none');
        nav.appendChild(li);
  // No extra avatar item; profile link remains in place with a status dot
    // Role chip removed to avoid redundancy; status dot is sufficient
      }
    }

    // Ensure profile nav icon shows a status dot (role-colored)
    try {
      const profileLink = document.querySelector('.nav-links a[href="profile.html"], .nav-links a[href="./profile.html"]');
      if (profileLink) {
        const icon = profileLink.querySelector('.nav-icon');
        if (icon) {
          // Avoid duplicates if navigating client-side
          icon.querySelectorAll('.nav-status-dot').forEach(n => n.remove());
          const dot = document.createElement('span');
          dot.className = 'nav-status-dot';
          // Map role to data-status for CSS colors
          const role = (DEMO_MODE ? (localStorage.getItem('cc:role') || 'user') : getRole());
          dot.setAttribute('data-status', role === 'pro' ? 'pro' : role === 'admin' ? 'dev' : 'user');
          icon.appendChild(dot);
        }
      }
    } catch(_) {}

    // Login form handler
    const loginForm = document.getElementById('loginForm');
  if (loginForm) {
      loginForm.addEventListener('submit', e => {
        e.preventDefault();
    if (DEMO_MODE) { location.href = 'social.html'; return; }
        const email = (loginForm.querySelector('[name="email"]')||{}).value || '';
        const password = (loginForm.querySelector('[name="password"]')||{}).value || '';
        if (!validateEmail(email)) return inlineError(loginForm, 'Enter a valid email');
        if (password.length < 6) return inlineError(loginForm, 'Password must be at least 6 characters');
  const emailLc = email.trim().toLowerCase();
  if (password.length < 6) return inlineError(loginForm, 'Password must be at least 6 characters');
  setSession(emailLc);
  localStorage.setItem('cc:role','user');
  location.replace('social.html');
      });
      // Prefill for mock/demo.
      // If logging out (source=logout), prefill normal user, but DO NOT auto-submit.
      // Otherwise, if query ?prefill=1 OR simply not logged in we populate fields.
      if (DEMO_MODE || !isLoggedIn() || qs.has('prefill')) {
        const emailField = loginForm.querySelector('[name="email"]');
        const passField = loginForm.querySelector('[name="password"]');
  let prefillEmail = USER1_EMAIL;
        if (emailField) emailField.value = prefillEmail;
  if (passField) passField.value = USER1_PASSWORD;
        const btn = loginForm.querySelector('button[type="submit"]');
        // Only auto-submit when explicitly requested via ?autosubmit=1.
        // In DEMO_MODE we do NOT auto-submit to allow the user to click Log In.
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
    if (DEMO_MODE) { location.href = 'social.html'; return; }
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
  window.CCAuth = { isLoggedIn, getUser, getRole, logout: () => { location.href = 'login.html?source=logout'; } };

  // Helpers
  // Deprecated separate avatar injection — kept for reference but unused
  function avatarColor(seed){
    let h = 0; for (let i=0;i<seed.length;i++) h = (h*31 + seed.charCodeAt(i))>>>0;
    const hue = h % 360; const sat = 55; const light = 50;
    const bg = `hsl(${hue} ${sat}% ${light}%)`;
    const fg = light > 55 ? '#111' : '#fff';
    return { bg, fg };
  }
})();
