// CollabConnect Social mock: localStorage-backed posts, likes, comments
// Non-persistent beyond browser storage; for demo only
(function(){
  const STORE_KEY = 'cc:social:v1';
  const feedEl = document.getElementById('feed');
  const form = document.getElementById('composerForm');
  const textarea = document.getElementById('composerText');
  const postBtn = form ? form.querySelector('button[type="submit"]') : null;
  const counter = document.getElementById('composerCount');
  const composerAvatar = document.getElementById('composerAvatar');

  if (!feedEl) return; // page not loaded yet or missing section

  // Utilities
  const now = () => new Date().toISOString();
  function load(){
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null') || seed(); }
    catch(e){ return seed(); }
  }
  function save(state){
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch(e){
      // Best-effort: if quota exceeded, drop oldest posts then retry once
      if (state && Array.isArray(state.posts) && state.posts.length > 1) {
        state.posts = state.posts.slice(-25); // keep last 25
        try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch(_){}
      }
    }
  }

  function seed(){
    const user = (window.CCAuth && CCAuth.getUser && CCAuth.getUser()) || 'guest@example.com';
    const demo = {
      posts: [
        {
          id: 'p1',
          author: 'design.lead@example.com',
          text: 'Kicked off the Creative Design Sprint! Moodboard and color palettes posted in the drive. Feedback welcome ✨',
          likes: ['devuser@example.com'],
          comments: [
            { id:'c1', author: 'devuser@example.com', text: 'Love the gradients! I can prototype a landing mock.', createdAt: now() }
          ],
          createdAt: now()
        },
        {
          id: 'p2',
          author: user,
          text: 'Working on the social feed mock. Likes and comments coming up next!',
          likes: [],
          comments: [],
          createdAt: now()
        }
      ]
    };
    save(demo);
    return demo;
  }

  let state = load();

  // Rendering
  function render(){
    if (!feedEl) return;
    feedEl.setAttribute('aria-busy','true');
    const currentUser = (window.CCAuth && CCAuth.getUser && CCAuth.getUser()) || 'guest@example.com';
    const role = (window.CCAuth && CCAuth.getRole && CCAuth.getRole()) || 'user';
    const html = state.posts
      .slice()
      .sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt))
      .map(p => postHTML(p, currentUser, role))
      .join('');
  feedEl.innerHTML = html || emptyHTML();
  feedEl.setAttribute('aria-busy','false');
  }

  function avatarFor(email){
    const seed = email || 'user@example.com';
    let h = 0; for (let i=0;i<seed.length;i++) h = (h*31 + seed.charCodeAt(i))>>>0;
    const hue = h % 360; const init = seed.split('@')[0] || 'U';
    return { hue, init: init.charAt(0).toUpperCase() };
  }

  function timeAgo(iso){
    const diff = Date.now() - new Date(iso).getTime();
    const s = Math.floor(diff/1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s/60); if (m < 60) return `${m}m ago`;
    const h = Math.floor(m/60); if (h < 24) return `${h}h ago`;
    const d = Math.floor(h/24); return `${d}d ago`;
  }

  function postHTML(p, currentUser, role){
    const youLiked = p.likes.includes(currentUser);
    const { hue, init } = avatarFor(p.author);
    const name = (p.author||'user').split('@')[0];
    return `
      <article class="post-card" data-id="${p.id}" aria-labelledby="post-${p.id}-title">
        <div class="post-header">
          <div class="avatar" style="--h:${hue}">${init}</div>
          <div class="meta">
            <h3 id="post-${p.id}-title" class="author">${escapeHTML(name)}</h3>
            <time datetime="${p.createdAt}" class="time">${timeAgo(p.createdAt)}</time>
          </div>
          ${currentUser === p.author || role === 'admin' ? `<button class="icon-btn delete" title="Delete post" aria-label="Delete post">×</button>` : ''}
        </div>
        <p class="post-text">${linkify(escapeHTML(p.text))}</p>
        <div class="post-actions">
          <button class="chip like" aria-pressed="${youLiked}" aria-label="${youLiked?'Unlike':'Like'}">
            ❤️ <span class="count">${p.likes.length}</span>
          </button>
          <button class="chip comment-toggle" aria-expanded="false">💬 <span class="count">${p.comments.length}</span></button>
        </div>
        <div class="comments" hidden>
          <ul class="comment-list">
            ${p.comments.map(c=>commentHTML(c)).join('')}
          </ul>
          <form class="comment-form">
            <label class="sr-only" for="c-${p.id}">Add a comment</label>
            <input id="c-${p.id}" name="text" type="text" placeholder="Write a comment..." required />
            <button type="submit" class="auth-btn sm">Send</button>
          </form>
        </div>
      </article>
    `;
  }

  function commentHTML(c){
    const { hue, init } = avatarFor(c.author);
    const name = (c.author||'user').split('@')[0];
    return `
      <li class="comment" data-id="${c.id}">
        <div class="avatar" style="--h:${hue}">${init}</div>
        <div class="bubble">
          <div class="c-meta"><span class="c-author">${escapeHTML(name)}</span> • <time datetime="${c.createdAt}">${timeAgo(c.createdAt)}</time></div>
          <div class="c-text">${linkify(escapeHTML(c.text))}</div>
        </div>
      </li>
    `;
  }

  function emptyHTML(){
    return `<div class="empty-feed"><p>No updates yet. Be the first to post!</p></div>`;
  }

  function linkify(txt){
    return txt.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1<\/a>');
  }
  function escapeHTML(s){
    if (typeof s !== 'string') return '';
    return s.replace(/[&<>\"]+/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  }

  // Event delegation to avoid rebinding after each render
  feedEl.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.classList.contains('like')) return onLikeToggle(e);
    if (t.classList.contains('comment-toggle')) return onCommentToggle(e);
    if (t.classList.contains('delete')) return onDeletePost(e);
  });

  feedEl.addEventListener('submit', (e) => {
    const f = e.target.closest('.comment-form');
    if (f) return onCommentSubmit(e);
  });

  function findPost(el){
    const card = el.closest('.post-card');
    const id = card && card.getAttribute('data-id');
    const idx = state.posts.findIndex(p=>p.id===id);
    return { card, idx };
  }

  function onLikeToggle(e){
    const { idx } = findPost(e.currentTarget);
    if (idx < 0) return;
    const user = (window.CCAuth && CCAuth.getUser && CCAuth.getUser()) || 'guest@example.com';
    const likes = new Set(state.posts[idx].likes);
    likes.has(user) ? likes.delete(user) : likes.add(user);
    state.posts[idx].likes = Array.from(likes);
    save(state); render();
  }

  function onCommentToggle(e){
    const card = e.currentTarget.closest('.post-card');
    const region = card.querySelector('.comments');
    const expanded = e.currentTarget.getAttribute('aria-expanded') === 'true';
    e.currentTarget.setAttribute('aria-expanded', String(!expanded));
    region.hidden = expanded;
    if (!expanded) region.querySelector('input')?.focus();
  }

  function onCommentSubmit(e){
    e.preventDefault();
    const { idx } = findPost(e.currentTarget);
    if (idx < 0) return;
    const input = e.currentTarget.querySelector('input[name="text"]');
    const text = (input.value || '').trim();
    if (!text) return;
    const author = (window.CCAuth && CCAuth.getUser && CCAuth.getUser()) || 'guest@example.com';
    state.posts[idx].comments.push({ id: 'c'+Math.random().toString(36).slice(2,8), author, text, createdAt: now() });
    input.value = '';
    save(state); render();
  }

  function onDeletePost(e){
    const { idx } = findPost(e.currentTarget);
    if (idx < 0) return;
    state.posts.splice(idx,1);
    save(state); render();
  }

  // Composer
  if (form && textarea){
    form.addEventListener('submit', e => {
      e.preventDefault();
      const text = (textarea.value || '').replace(/\s+/g,' ').trim();
      if (!text) return;
      const author = (window.CCAuth && CCAuth.getUser && CCAuth.getUser()) || 'guest@example.com';
  state.posts.push({ id: 'p'+Math.random().toString(36).slice(2,8), author, text, likes: [], comments: [], createdAt: now() });
  if (state.posts.length > 100) state.posts = state.posts.slice(-100);
      textarea.value = '';
      updateComposerState();
      save(state); render();
    });
    // Enable/disable button + counter
    textarea.addEventListener('input', updateComposerState);
    textarea.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        postBtn && !postBtn.disabled && postBtn.click();
      }
    });
    // Set composer avatar based on current user
    const currentUser = (window.CCAuth && CCAuth.getUser && CCAuth.getUser()) || 'guest@example.com';
    if (composerAvatar){
      const { hue, init } = avatarFor(currentUser);
      composerAvatar.textContent = init;
      composerAvatar.style.background = `hsl(${hue} 70% 45%)`;
    }
    updateComposerState();
  }

  function updateComposerState(){
    const val = (textarea.value || '');
    const clean = val.replace(/\s+/g,' ').trim();
    const max = parseInt(textarea.getAttribute('maxlength')||'280',10);
    counter && (counter.textContent = `${Math.min(val.length, max)}/${max}`);
    if (postBtn) postBtn.disabled = clean.length === 0;
  }

  // Initial render on DOM ready
  document.addEventListener('DOMContentLoaded', render);
})();
