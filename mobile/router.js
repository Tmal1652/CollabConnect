// Simple hash-based router to manage mobile app-like views
// Views are sections with data-view attribute.
// Supports back/forward navigation and persists last view.

(function() {
  const isMobile = () => window.matchMedia('(max-width: 820px)').matches;
  const sections = Array.from(document.querySelectorAll('[data-view]'));
  const footer = document.querySelector('.site-footer');
  const LAST_KEY = 'cc:lastView';

  let previousId = null;
  function applyVisibility(targetId) {
    sections.forEach(sec => {
      const active = sec.id === targetId;
      if (!isMobile()) {
        sec.style.display = '';
        sec.classList.remove('view-enter','view-exit','view-active');
        return;
      }
      if (active) {
        sec.style.display = '';
        sec.classList.add('view-active','view-enter');
        // remove enter class after animation
        setTimeout(()=>sec.classList.remove('view-enter'), 320);
      } else if (sec.id === previousId) {
        // animate out previous
        sec.classList.add('view-exit');
        setTimeout(()=>{
          sec.classList.remove('view-exit','view-active');
          if (isMobile() && sec.id !== targetId) sec.style.display='none';
        }, 210);
      } else {
        sec.style.display = 'none';
        sec.classList.remove('view-enter','view-exit','view-active');
      }
    });
    previousId = targetId;
    // Footer only on home in mobile
    if (footer) {
      if (isMobile()) footer.style.display = targetId === 'home' ? '' : 'none';
      else footer.style.display = '';
    }
    // Scroll handling (lock if non-scroll view)
    const activeEl = sections.find(s => s.id === targetId);
    if (isMobile() && activeEl) {
      const lock = activeEl.hasAttribute('data-noscroll-mobile');
      document.body.style.overflow = lock ? 'hidden' : '';
      if (lock) window.scrollTo({ top: 0, behavior: 'instant' });
    } else {
      document.body.style.overflow = '';
    }
  }

  function setActiveNav(hash) {
    document.querySelectorAll('.nav-links a[href^="#"]').forEach(a => {
      const match = a.getAttribute('href') === hash;
      a.classList.toggle('active', match);
      match ? a.setAttribute('aria-current','page') : a.removeAttribute('aria-current');
    });
  }

  function navigateTo(hash, push = false) {
    const id = (hash || '#home').replace('#','');
    if (!sections.some(s => s.id === id)) return;
    applyVisibility(id);
    setActiveNav('#'+id);
    if (push) history.pushState({ view: id }, '', '#'+id);
    try { localStorage.setItem(LAST_KEY, id); } catch(e){}
  }

  window.addEventListener('hashchange', () => navigateTo(location.hash));
  window.addEventListener('popstate', e => {
    const view = (e.state && e.state.view) || location.hash.replace('#','') || 'home';
    navigateTo('#'+view);
  });

  window.addEventListener('resize', () => {
    if (!isMobile()) {
      // Restore multi-section layout
      sections.forEach(s => s.style.display = '');
      document.body.style.overflow = '';
      footer && (footer.style.display = '');
    } else {
      const current = location.hash || ('#' + (localStorage.getItem(LAST_KEY) || 'home'));
      navigateTo(current);
    }
  });

  // Intercept nav clicks for consistent history push
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    if (!isMobile()) return; // desktop native scroll behavior
    e.preventDefault();
    const href = a.getAttribute('href');
    navigateTo(href, true);
  });

  // Initial boot
  const initial = location.hash || ('#' + (localStorage.getItem(LAST_KEY) || 'home'));
  navigateTo(initial);

  /* Offline / online banner + network events */
  const banner = document.getElementById('networkBanner');
  function showBanner(state, msg) {
    if (!banner) return;
    banner.textContent='';
    banner.className = 'network-banner ' + state;
    banner.textContent = msg;
    banner.style.display='flex';
    if (state === 'online') setTimeout(()=>{ banner.style.display='none'; }, 1800);
  }
  window.addEventListener('online', () => showBanner('online','Back Online'));
  window.addEventListener('offline', () => showBanner('offline','You are Offline'));
  if (!navigator.onLine) showBanner('offline','You are Offline');

  /* Install prompt capture */
  let deferredPrompt = null;
  const installBtn = document.getElementById('installBtn');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.style.display='inline-flex';
  });
  installBtn && installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome !== 'accepted') {
      // keep button visible for retry
    } else {
      installBtn.style.display='none';
    }
    deferredPrompt = null;
  });
})();
