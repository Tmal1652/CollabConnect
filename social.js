// CollabConnect Social mock: localStorage-backed posts, likes, comments
// Non-persistent beyond browser storage; for demo only
(function(){
  const STORE_KEY = 'cc:social:v2';
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
    const t = (mins)=> new Date(Date.now() - mins*60000).toISOString();
    const demo = {
      posts: [
        // 2 videos (as feed items)
        { id: 'v1', type: 'video', author: 'alex.dev@example.com', text: 'Standup recap: wins + focus', poster: 'posters/standup.svg', likes: [], comments: [], createdAt: t(10) },
        { id: 'v2', type: 'video', author: 'mia.design@example.com', text: 'Design handoff in one tap', poster: 'posters/design-handoff.svg', likes: [], comments: [], createdAt: t(18) },

  // 3 standard projects
  { id: 'p1', type: 'project', author: 'design.lead@example.com', text: 'Kicked off the Creative Design Sprint! Moodboard and color palettes posted in the drive. Feedback welcome ✨', likes: ['devuser@example.com'], comments: [{ id:'c1', author: 'devuser@example.com', text: 'Love the gradients! I can prototype a landing mock.', createdAt: now() }], createdAt: t(5) },
  { id: 'p2', type: 'project', author: user, text: 'Working on the unified social feed. Inline videos now look like normal cards.', likes: [], comments: [], createdAt: t(15) },
  { id: 'p3', type: 'project', author: 'ops@example.com', text: 'Infra change freeze this weekend. Ping if you need an exception.', likes: [], comments: [], createdAt: t(25) },

  // 4 boards
        { id: 'p-board-1', author: 'pm@example.com', type: 'board', text: 'Sprint Board: Focus for this week', board: { todo: ['Update color tokens', 'Prep component specs'], doing: ['Glass button states', 'Feed spacing polish'], done: ['Auth page clean-up'] }, likes: [], comments: [], createdAt: t(2) },
        { id: 'p-board-2', author: 'pm@example.com', type: 'board', text: 'Design Review Checklist', board: { todo: ['Mobile spacing audit'], doing: ['Card shadows'], done: ['Avatar sizes'] }, likes: [], comments: [], createdAt: t(12) },
        { id: 'p-board-3', author: 'pm@example.com', type: 'board', text: 'Marketing Launch Tasks', board: { todo: ['Landing copy draft'], doing: ['Email teaser'], done: ['Asset list'] }, likes: [], comments: [], createdAt: t(22) },
        { id: 'p-board-4', author: 'pm@example.com', type: 'board', text: 'Dev Triage', board: { todo: ['Fix flaky test'], doing: ['Refactor social seed'], done: ['Bump lint rules'] }, likes: [], comments: [], createdAt: t(30) }
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
      .map(p => itemHTML(p, currentUser, role))
      .join('');
    feedEl.innerHTML = html || emptyHTML();
  feedEl.setAttribute('aria-busy','false');

    // Update sidebar counts
    try {
      const postsCount = state.posts.length;
      const commentsCount = state.posts.reduce((acc,p)=> acc + (Array.isArray(p.comments)?p.comments.length:0), 0);
      const postsEl = document.getElementById('sMetaPosts');
      const commentsEl = document.getElementById('sMetaComments');
      if (postsEl) postsEl.textContent = String(postsCount);
      if (commentsEl) commentsEl.textContent = String(commentsCount);
    } catch(_){}
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

  function itemHTML(p, currentUser, role){
  const kind = p.type === 'poll' ? 'poll' : p.type === 'board' ? 'board' : 'project';
    const youLiked = p.likes.includes(currentUser);
    const { hue, init } = avatarFor(p.author);
    const name = (p.author||'user').split('@')[0];
    if (p.type === 'video') {
      const liked = p._liked ? 'true' : 'false';
      const likeCount = (p.likes||[]).length + (p._liked ? 1 : 0);
      return `
      <div class="feed-item" data-kind="video">
        <article class="post-card post--video" data-id="${p.id}" aria-labelledby="post-${p.id}-title">
          <div class="post-header">
            <div class="avatar" style="--h:${hue}">${init}</div>
            <div class="meta">
              <h3 id="post-${p.id}-title" class="author">${escapeHTML(name)}</h3>
              <time datetime="${p.createdAt}" class="time">${timeAgo(p.createdAt)}</time>
            </div>
            ${currentUser === p.author || role === 'admin' ? `<button class="icon-btn delete" title="Delete post" aria-label="Delete post">×</button>` : ''}
          </div>
          ${p.text ? `<p class="post-text">${linkify(escapeHTML(p.text))}</p>` : ''}
          <div class="video-media" aria-label="Video placeholder">
            <img class="video-poster" src="${escapeHTML(p.poster||'posters/standup.svg')}" alt="" />
            <div class="video-placeholder">Video will play here</div>
          </div>
          <div class="post-actions">
            <button class="chip like" aria-pressed="${liked}" aria-label="${liked==='true'?'Unlike':'Like'}">
              ❤️ <span class="count">${likeCount}</span>
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
      </div>`;
    }
    if (p.type === 'poll') {
      return `
      <div class="feed-item" data-kind="${kind}">
      <article class="post-card post--poll" data-id="${p.id}" aria-labelledby="post-${p.id}-title">
        <div class="post-header">
          <div class="avatar" style="--h:${hue}">${init}</div>
          <div class="meta">
            <h3 id="post-${p.id}-title" class="author">${escapeHTML(name)}</h3>
            <time datetime="${p.createdAt}" class="time">${timeAgo(p.createdAt)}</time>
          </div>
          ${currentUser === p.author || role === 'admin' ? `<button class="icon-btn delete" title="Delete post" aria-label="Delete post">×</button>` : ''}
        </div>
        <p class="post-text">${linkify(escapeHTML(p.text))}</p>
        <div class="poll-options" role="group" aria-label="Poll options">
          ${p.poll.options.map(o => `
            <button class="poll-option" data-opt="${o.id}" aria-pressed="${(p.poll.votedBy||{})[currentUser]===o.id}">
              <span class="label">${escapeHTML(o.label)}</span>
              <span class="votes">${o.votes}</span>
            </button>
          `).join('')}
        </div>
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
      </div>`;
    }
    if (p.type === 'board') {
      const b = p.board || { todo:[], doing:[], done:[] };
      return `
      <div class="feed-item" data-kind="${kind}">
      <article class="post-card post--board" data-id="${p.id}" aria-labelledby="post-${p.id}-title">
        <div class="post-header">
          <div class="avatar" style="--h:${hue}">${init}</div>
          <div class="meta">
            <h3 id="post-${p.id}-title" class="author">${escapeHTML(name)}</h3>
            <time datetime="${p.createdAt}" class="time">${timeAgo(p.createdAt)}</time>
          </div>
          ${currentUser === p.author || role === 'admin' ? `<button class="icon-btn delete" title="Delete post" aria-label="Delete post">×</button>` : ''}
        </div>
        <p class="post-text">${linkify(escapeHTML(p.text))}</p>
        <div class="board-mini">
          <div class="board-col"><h4>To do</h4>${(b.todo||[]).map(x=>`<div class="board-item">${escapeHTML(x)}</div>`).join('')}</div>
          <div class="board-col"><h4>Doing</h4>${(b.doing||[]).map(x=>`<div class="board-item">${escapeHTML(x)}</div>`).join('')}</div>
          <div class="board-col"><h4>Done</h4>${(b.done||[]).map(x=>`<div class="board-item">${escapeHTML(x)}</div>`).join('')}</div>
        </div>
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
      </div>`;
    }
    return `
      <div class="feed-item" data-kind="${kind}">
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
      </div>
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
    if (t.classList.contains('like')) return onLikeToggle(t);
    if (t.classList.contains('comment-toggle')) return onCommentToggle(t);
    if (t.classList.contains('poll-option')) return onPollVote(t);
    if (t.classList.contains('delete')) return onDeletePost(t);
  });

  feedEl.addEventListener('submit', (e) => {
    const f = e.target.closest('.comment-form');
    if (f) return onCommentSubmit(e);
  });

  function findPost(el){
    const card = el.closest('.post-card, .reel');
    const id = card && card.getAttribute('data-id');
    let idx = state.posts.findIndex(p=>p.id===id);
    if (idx < 0) {
      // For videos, match by poster if id missing
      const poster = card && card.querySelector('video')?.getAttribute('poster');
      idx = state.posts.findIndex(p=>p.type==='video' && p.poster===poster);
    }
    return { card, idx };
  }

  function onLikeToggle(el){
    const { idx } = findPost(el);
    if (idx < 0) return;
    const p = state.posts[idx];
    if (p.type === 'video') {
      p._liked = !p._liked;
    } else {
      const user = (window.CCAuth && CCAuth.getUser && CCAuth.getUser()) || 'guest@example.com';
      const likes = new Set(p.likes);
      likes.has(user) ? likes.delete(user) : likes.add(user);
      p.likes = Array.from(likes);
    }
    save(state); render();
  }

  function onCommentToggle(el){
    const card = el.closest('.post-card');
    const region = card.querySelector('.comments');
    const expanded = el.getAttribute('aria-expanded') === 'true';
    el.setAttribute('aria-expanded', String(!expanded));
    region.hidden = expanded;
    if (!expanded) region.querySelector('input')?.focus();
  }

  function onCommentSubmit(e){
    e.preventDefault();
    const { idx } = findPost(e.target);
    if (idx < 0) return;
    const input = e.currentTarget.querySelector('input[name="text"]');
    const text = (input.value || '').trim();
    if (!text) return;
    const author = (window.CCAuth && CCAuth.getUser && CCAuth.getUser()) || 'guest@example.com';
    state.posts[idx].comments.push({ id: 'c'+Math.random().toString(36).slice(2,8), author, text, createdAt: now() });
    input.value = '';
    save(state); render();
  }

  function onPollVote(el){
    const { card, idx } = findPost(el);
    if (idx < 0) return;
    const p = state.posts[idx];
    if (p.type !== 'poll') return;
    const opt = el.getAttribute('data-opt');
    const user = (window.CCAuth && CCAuth.getUser && CCAuth.getUser()) || 'guest@example.com';
    p.poll.votedBy = p.poll.votedBy || {};
    const prev = p.poll.votedBy[user];
    if (prev === opt) return; // already selected
    // Adjust counts
    if (prev){ const prevIdx = p.poll.options.findIndex(o=>o.id===prev); if (prevIdx>-1 && p.poll.options[prevIdx].votes>0) p.poll.options[prevIdx].votes -= 1; }
    const i = p.poll.options.findIndex(o=>o.id===opt);
    if (i>-1) p.poll.options[i].votes += 1;
    p.poll.votedBy[user] = opt;
    save(state); render();
  }

  function onDeletePost(el){
    const { idx } = findPost(el);
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
  state.posts.push({ id: 'p'+Math.random().toString(36).slice(2,8), type: 'project', author, text, likes: [], comments: [], createdAt: now() });
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
