// Mobile-first social mock (TikTok-style) for CollabConnect
// Swipe feed with vertical snapping; posts read/write from same social store as desktop feed
(function(){
	const FEED = document.getElementById('mFeed');
	if (!FEED) return;

	const STORE_KEY = 'cc:social:v1'; // reuse
	const now = () => new Date().toISOString();

	function load(){
		try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); }
		catch(e){ return null; }
	}
	function save(state){
		try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
		catch(e){ /* best-effort */ }
	}
	function seedIfEmpty(){
		let state = load();
		if (!state || !Array.isArray(state.posts) || state.posts.length === 0){
			const user = (window.CCAuth && CCAuth.getUser && CCAuth.getUser()) || 'guest@example.com';
			state = { posts: [
				{ id: 'pm1', author: 'creator@example.com', text: 'Welcome to the mobile mock! Swipe up for more updates.', likes: [], comments: [], tag: 'General', project: 'Onboarding', createdAt: now() },
				{ id: 'pm2', author: user, text: 'Building the collaboration feed — now on mobile ✨', likes: [], comments: [], tag: 'Dev', project: 'Mobile Mock', createdAt: now() }
			]};
			save(state);
		}
		return state;
	}

	let state = seedIfEmpty();

	function avatarFor(email){
		const seed = email || 'user@example.com';
		let h = 0; for (let i=0;i<seed.length;i++) h = (h*31 + seed.charCodeAt(i))>>>0;
		const hue = h % 360; const init = seed.split('@')[0] || 'U';
		return { hue, init: init.charAt(0).toUpperCase() };
	}
	function timeAgo(iso){
		const diff = Date.now() - new Date(iso).getTime();
		const s = Math.floor(diff/1000);
		if (s < 60) return `${s}s`;
		const m = Math.floor(s/60); if (m < 60) return `${m}m`;
		const h = Math.floor(m/60); if (h < 24) return `${h}h`;
		const d = Math.floor(h/24); return `${d}d`;
	}
	function escapeHTML(s){ if (typeof s !== 'string') return ''; return s.replace(/[&<>\"]+/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])); }
	function linkify(txt){ return txt.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1<\/a>'); }

	function render(){
		const currentUser = (window.CCAuth && CCAuth.getUser && CCAuth.getUser()) || 'guest@example.com';
		FEED.innerHTML = state.posts
			.slice()
			.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt))
			.map(p => cardHTML(p, currentUser))
			.join('');
	}

	function cardHTML(p, currentUser){
		const { hue, init } = avatarFor(p.author);
		const name = (p.author||'user').split('@')[0];
		const youLiked = (p.likes||[]).includes(currentUser);
		const likeCount = (p.likes||[]).length;
		const commentCount = (p.comments||[]).length;
		const tag = p.tag ? ` • <span class="m-tag">${escapeHTML(p.tag)}</span>` : '';
		const proj = p.project ? ` • <span class="m-tag">${escapeHTML(p.project)}</span>` : '';
		return `
			<article class="m-card ${Math.random()>0.5?'has-img':''}" data-id="${p.id}" aria-label="Post by ${escapeHTML(name)}">
				<div class="m-bg"></div>
				<div class="m-actions" aria-label="Actions">
					<button class="m-act m-like" aria-pressed="${youLiked}" aria-label="${youLiked?'Unlike':'Like'}">❤️</button>
					<div class="m-count">${likeCount}</div>
					<button class="m-act m-comment" aria-label="Comments">💬</button>
					<div class="m-count">${commentCount}</div>
					<button class="m-act m-share" aria-label="Share">↗️</button>
				</div>
				<div class="m-content">
					<header class="m-head">
						<div class="m-ava" style="--h:${hue}">${init}</div>
						<div class="m-meta">
							<div class="m-name">${escapeHTML(name)}</div>
							<div class="m-tag">${timeAgo(p.createdAt)}${tag}${proj}</div>
						</div>
					</header>
					<div class="m-text">${linkify(escapeHTML(p.text))}</div>
				</div>
			</article>
		`;
	}

	// Event delegation for actions
	FEED.addEventListener('click', (e) => {
		const like = e.target.closest('.m-like');
		const share = e.target.closest('.m-share');
		const comment = e.target.closest('.m-comment');
		if (!like && !share && !comment) return;
		const card = e.target.closest('.m-card');
		const id = card && card.getAttribute('data-id');
		const idx = state.posts.findIndex(p=>p.id===id);
		if (idx < 0) return;
		const currentUser = (window.CCAuth && CCAuth.getUser && CCAuth.getUser()) || 'guest@example.com';
		if (like){
			const likes = new Set(state.posts[idx].likes||[]);
			likes.has(currentUser) ? likes.delete(currentUser) : likes.add(currentUser);
			state.posts[idx].likes = Array.from(likes);
			save(state); render();
		} else if (share){
			// Simple copy to clipboard mock
			const url = location.origin + location.pathname + `#post-${id}`;
			navigator.clipboard && navigator.clipboard.writeText(url).catch(()=>{});
			card.querySelector('.m-share').textContent = '✅';
			setTimeout(()=> card.querySelector('.m-share').textContent = '↗️', 800);
		} else if (comment){
			// For mock: open composer prefilled with @author
			openComposer(`@${(state.posts[idx].author||'user').split('@')[0]} `);
		}
	});

	// Wheel snap helper for desktop testing (optional)
	let wheelLock = false;
	FEED.addEventListener('wheel', (e) => {
		if (wheelLock) return;
		const dy = Math.abs(e.deltaY);
		if (dy < 40) return;
		wheelLock = true; setTimeout(()=>wheelLock=false, 300);
		const viewTop = FEED.scrollTop;
		const vh = FEED.clientHeight;
		const target = e.deltaY > 0 ? viewTop + vh : viewTop - vh;
		FEED.scrollTo({ top: target, behavior: 'smooth' });
	}, { passive: true });

	// Composer logic
	const composeBtn = document.getElementById('mComposeBtn');
	const modal = document.getElementById('mComposer');
	const closeBtn = document.getElementById('mCloseCompose');
	const form = document.getElementById('mComposeForm');
	const textEl = document.getElementById('mText');
	const tagEl = document.getElementById('mTag');
	const projEl = document.getElementById('mProject');

	function openComposer(prefill){
		if (typeof prefill === 'string') textEl.value = prefill;
		modal.setAttribute('aria-hidden','false');
		setTimeout(()=> textEl.focus(), 40);
	}
	function closeComposer(){
		modal.setAttribute('aria-hidden','true');
		form.reset();
	}

	composeBtn && composeBtn.addEventListener('click', ()=> openComposer());
	closeBtn && closeBtn.addEventListener('click', closeComposer);
	modal && modal.addEventListener('click', (e)=>{ if (e.target === modal) closeComposer(); });
	document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') closeComposer(); });

	form && form.addEventListener('submit', (e) => {
		e.preventDefault();
		const text = (textEl.value||'').replace(/\s+/g,' ').trim(); if (!text) return;
		const currentUser = (window.CCAuth && CCAuth.getUser && CCAuth.getUser()) || 'guest@example.com';
		const post = { id: 'pm'+Math.random().toString(36).slice(2,8), author: currentUser, text, likes: [], comments: [], tag: (tagEl.value||'').trim(), project: (projEl.value||'').trim(), createdAt: now() };
		state.posts.push(post);
		if (state.posts.length > 120) state.posts = state.posts.slice(-120);
		save(state); closeComposer(); render();
		FEED.scrollTo({ top: 0, behavior: 'smooth' });
	});

	// Initial render
	document.addEventListener('DOMContentLoaded', render);
})();
