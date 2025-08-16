(function(){
  const FILTER_KEY = 'cc:projects:filter';

  function applyFilter(filter){
    const list = document.getElementById('projectsList');
    const empty = document.getElementById('projectsEmpty');
    if(!list) return;
    const items = Array.from(list.querySelectorAll('.project-item'));
    let shown = 0;
    items.forEach(it=>{
      const tags = (it.getAttribute('data-tags')||'').toLowerCase();
      const match = (filter==='all') || tags.includes(filter);
      it.style.display = match ? '' : 'none';
      if(match) shown++;
    });
    if(empty) empty.style.display = shown ? 'none' : '';
  }

  function setPressed(btns, target){
    btns.forEach(b=> b.setAttribute('aria-pressed', String(b===target)) );
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    const filters = Array.from(document.querySelectorAll('[data-filter]'));
    if (!filters.length) return;
    // Read from URL ?filter= or localStorage fallback
    const qs = new URLSearchParams(location.search);
    const fromUrl = (qs.get('filter')||'').toLowerCase();
    const saved = (fromUrl && filters.some(f=> f.dataset.filter===fromUrl)) ? fromUrl : (localStorage.getItem(FILTER_KEY) || 'all');
    const active = filters.find(f=> f.dataset.filter===saved) || filters[0];
    if(active){ setPressed(filters, active); }
    applyFilter(saved);

    // Click handling updates storage, UI, URL (without page reload)
    filters.forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const value = btn.dataset.filter;
        setPressed(filters, btn);
        try{ localStorage.setItem(FILTER_KEY, value);}catch(e){}
        // Update the URL parameter for shareability
        const url = new URL(location.href);
        if (value === 'all') url.searchParams.delete('filter'); else url.searchParams.set('filter', value);
        history.replaceState(null, '', url.toString());
        applyFilter(value);
      });
      // Keyboard navigation between chips with arrows
      btn.addEventListener('keydown', (e)=>{
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        const i = filters.indexOf(btn);
        const next = e.key === 'ArrowRight' ? (i+1) % filters.length : (i-1+filters.length) % filters.length;
        filters[next].focus();
      });
    });
  });
})();
