(function () {
  const PROJECTS_KEY = "cc:projects:v1";
  const UI_KEY = "cc:projects:ui:v1";
  const SOCIAL_KEY = "cc:social:v2";

  const DEFAULT_UI = {
    view: "my",
    sort: "recent",
    search: "",
    filters: {
      discipline: "all",
      status: "all",
      type: "all",
    },
  };

  const VIEW_LABEL = {
    my: "My Projects",
    community: "Community Projects",
    shared: "Shared Projects",
  };

  const STATUS_LABEL = {
    planned: "Planned",
    active: "Active",
    review: "In Review",
    completed: "Completed",
    archived: "Archived",
  };

  const DISCIPLINE_LABEL = {
    dev: "Dev",
    design: "Design",
    marketing: "Marketing",
    product: "Product",
    ops: "Ops",
  };

  const TYPE_LABEL = {
    standard: "Standard",
    featured: "Featured",
    seeking: "Seeking Collaborators",
  };

  const els = {};
  let state = { projects: [] };
  let ui = { ...DEFAULT_UI, filters: { ...DEFAULT_UI.filters } };
  let detailProjectId = null;
  let toastTimer = null;
  let searchTimer = null;

  function nowIso() {
    return new Date().toISOString();
  }

  function safeParse(str, fallback) {
    try {
      return JSON.parse(str);
    } catch (_) {
      return fallback;
    }
  }

  function uid(prefix) {
    return `${prefix}${Math.random().toString(36).slice(2, 8)}`;
  }

  function toArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function normalizeStr(value, fallback) {
    const out = typeof value === "string" ? value.trim() : "";
    return out || fallback;
  }

  function parseCommaList(value) {
    return String(value || "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  function parseLines(value) {
    return String(value || "")
      .split("\n")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  function parseMembers(value) {
    return parseLines(value).map((line) => {
      const parts = line.includes("|") ? line.split("|") : line.split(",");
      const [nameRaw, roleRaw] = parts.map((p) => (p || "").trim());
      return {
        name: nameRaw || "Team member",
        role: roleRaw || "Contributor",
      };
    });
  }

  function parseMilestones(value) {
    return parseLines(value).map((line) => {
      const parts = line.split("|").map((p) => (p || "").trim());
      const [titleRaw, dueRaw, stateRaw] = parts;
      const milestoneState = ["todo", "doing", "done"].includes((stateRaw || "").toLowerCase())
        ? stateRaw.toLowerCase()
        : "todo";
      return {
        title: titleRaw || "Milestone",
        due: dueRaw || "TBD",
        state: milestoneState,
      };
    });
  }

  function formatDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "Unknown";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    if (!Number.isFinite(diff) || diff < 0) return "just now";
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return formatDate(iso);
  }

  function escapeHTML(input) {
    return String(input || "").replace(/[&<>\"]/g, (char) => {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char] || char;
    });
  }

  function currentUserEmail() {
    return (window.CCAuth && window.CCAuth.getUser && window.CCAuth.getUser()) || "guest@example.com";
  }

  function normalizeProject(project, i) {
    const createdAt = normalizeStr(project.createdAt, nowIso());
    const updatedAt = normalizeStr(project.updatedAt, createdAt);
    const tags = toArray(project.tags).map((t) => normalizeStr(t, "")).filter(Boolean);
    const stack = toArray(project.stack).map((t) => normalizeStr(t, "")).filter(Boolean);
    const goals = toArray(project.goals).map((g) => normalizeStr(g, "")).filter(Boolean);
    const members = toArray(project.members)
      .map((m) => ({ name: normalizeStr(m && m.name, "Team member"), role: normalizeStr(m && m.role, "Contributor") }))
      .filter((m) => m.name);
    const milestones = toArray(project.milestones)
      .map((m) => ({
        title: normalizeStr(m && m.title, "Milestone"),
        due: normalizeStr(m && m.due, "TBD"),
        state: ["todo", "doing", "done"].includes((m && m.state) || "") ? m.state : "todo",
      }))
      .filter((m) => m.title);
    const activity = toArray(project.activity)
      .map((a) => ({ text: normalizeStr(a && a.text, "Updated project"), createdAt: normalizeStr(a && a.createdAt, updatedAt) }))
      .filter((a) => a.text);

    const ownerType = ["my", "community", "shared"].includes(project.ownerType) ? project.ownerType : "community";
    const status = ["planned", "active", "review", "completed", "archived"].includes(project.status)
      ? project.status
      : "planned";
    const discipline = ["dev", "design", "marketing", "product", "ops"].includes(project.discipline)
      ? project.discipline
      : "dev";
    const projectType = ["standard", "featured", "seeking"].includes(project.projectType)
      ? project.projectType
      : (project.isFeatured ? "featured" : "standard");

    return {
      id: normalizeStr(project.id, `seed-${i + 1}`),
      ownerType,
      title: normalizeStr(project.title, "Untitled Project"),
      summary: normalizeStr(project.summary, "No summary yet."),
      description: normalizeStr(project.description, "No description provided yet."),
      status,
      discipline,
      projectType,
      tags,
      stack,
      goals,
      members,
      milestones,
      activity,
      updatedAt,
      createdAt,
      isFeatured: Boolean(project.isFeatured || projectType === "featured"),
    };
  }

  function seedProjects() {
    const now = Date.now();
    const ts = (mins) => new Date(now - mins * 60000).toISOString();

    return [
      {
        id: "my-ui-refresh",
        ownerType: "my",
        title: "Desktop UI Refresh Sprint",
        summary: "Polish desktop-first layouts for portfolio readiness across core pages.",
        description:
          "Refining the visual system and interaction quality for About, Features, Projects, and Social. Focus is on readability, desktop hierarchy, and consistent metallic styling.",
        status: "active",
        discipline: "design",
        projectType: "featured",
        tags: ["ui", "desktop", "portfolio"],
        stack: ["HTML", "CSS", "JavaScript"],
        goals: ["Finalize projects hub experience", "Align typography rhythm", "Improve component consistency"],
        members: [
          { name: "Tyler", role: "Product / Design" },
          { name: "Alex", role: "Frontend" },
        ],
        milestones: [
          { title: "Projects hub overhaul", due: "2026-03-15", state: "doing" },
          { title: "Desktop QA pass", due: "2026-03-20", state: "todo" },
          { title: "Portfolio release prep", due: "2026-03-24", state: "todo" },
        ],
        activity: [
          { text: "Updated About and Features page hierarchy", createdAt: ts(90) },
          { text: "Polished CTA alignment and spacing", createdAt: ts(35) },
        ],
        createdAt: ts(1800),
        updatedAt: ts(25),
        isFeatured: true,
      },
      {
        id: "my-social-sync",
        ownerType: "my",
        title: "Social Feed Demo Sync",
        summary: "Keep Social feed interactions aligned with project-share demo behavior.",
        description:
          "This project tracks improvements to local storage contracts and cross-page demo interactions between Projects and Social.",
        status: "review",
        discipline: "dev",
        projectType: "standard",
        tags: ["social", "localStorage", "integration"],
        stack: ["JavaScript", "LocalStorage"],
        goals: ["Ensure share-to-social payload compatibility", "Improve seeded feed story"],
        members: [
          { name: "Tyler", role: "Owner" },
          { name: "Sam", role: "QA" },
        ],
        milestones: [
          { title: "Payload contract check", due: "2026-03-08", state: "done" },
          { title: "UX regression pass", due: "2026-03-11", state: "doing" },
        ],
        activity: [{ text: "Validated project post rendering in Social feed", createdAt: ts(70) }],
        createdAt: ts(4200),
        updatedAt: ts(65),
      },
      {
        id: "community-open-docs",
        ownerType: "community",
        title: "Open Documentation Jam",
        summary: "Community-led project to improve onboarding docs for new collaborators.",
        description:
          "Contributors from design, dev, and product are working together to make docs easier to follow and more actionable.",
        status: "active",
        discipline: "product",
        projectType: "seeking",
        tags: ["docs", "onboarding", "collaboration"],
        stack: ["Markdown", "Notion", "Figma"],
        goals: ["Reduce onboarding confusion", "Improve first-week contribution success"],
        members: [
          { name: "Mia", role: "Design" },
          { name: "Jordan", role: "Product" },
          { name: "Devin", role: "Developer Advocate" },
        ],
        milestones: [
          { title: "Draft information architecture", due: "2026-03-10", state: "done" },
          { title: "Rewrite quick-start section", due: "2026-03-16", state: "doing" },
          { title: "Community review", due: "2026-03-21", state: "todo" },
        ],
        activity: [
          { text: "New contributors requested clearer setup steps", createdAt: ts(340) },
          { text: "Added docs roadmap and owner table", createdAt: ts(120) },
        ],
        createdAt: ts(8000),
        updatedAt: ts(100),
      },
      {
        id: "community-campaign-kit",
        ownerType: "community",
        title: "Creator Campaign Kit",
        summary: "Build reusable assets for launch announcements and progress updates.",
        description:
          "A cross-functional community project to produce templates for social posts, teaser visuals, and launch messaging.",
        status: "planned",
        discipline: "marketing",
        projectType: "standard",
        tags: ["launch", "marketing", "assets"],
        stack: ["Canva", "Figma", "Copywriting"],
        goals: ["Standardize launch messaging", "Speed up campaign creation"],
        members: [
          { name: "Nora", role: "Marketing" },
          { name: "Alex", role: "Designer" },
        ],
        milestones: [{ title: "Template scope alignment", due: "2026-03-19", state: "todo" }],
        activity: [{ text: "Initial concept brief approved", createdAt: ts(900) }],
        createdAt: ts(12000),
        updatedAt: ts(900),
      },
      {
        id: "shared-design-system",
        ownerType: "shared",
        title: "Shared Design System Tokens",
        summary: "Collaborative token and component standards used across app pages.",
        description:
          "This shared project coordinates naming, spacing scales, and state styles so pages feel like one system.",
        status: "active",
        discipline: "design",
        projectType: "featured",
        tags: ["design-system", "tokens", "consistency"],
        stack: ["CSS", "Design Tokens"],
        goals: ["Unify interactive states", "Stabilize heading hierarchy", "Improve component parity"],
        members: [
          { name: "Tyler", role: "Owner" },
          { name: "Mia", role: "Design" },
          { name: "Alex", role: "Frontend" },
        ],
        milestones: [
          { title: "Token audit", due: "2026-03-06", state: "done" },
          { title: "Projects v2 styles", due: "2026-03-12", state: "doing" },
          { title: "Cross-page polish", due: "2026-03-18", state: "todo" },
        ],
        activity: [
          { text: "Aligned button geometry across pages", createdAt: ts(240) },
          { text: "Removed obsolete project wrapper selectors", createdAt: ts(60) },
        ],
        createdAt: ts(5200),
        updatedAt: ts(45),
        isFeatured: true,
      },
      {
        id: "shared-infra-playbook",
        ownerType: "shared",
        title: "Infra Operations Playbook",
        summary: "Shared operational checklist and release routine for stable deploys.",
        description:
          "A practical playbook to make release cadence safer and improve handoffs between product and engineering contributors.",
        status: "completed",
        discipline: "ops",
        projectType: "standard",
        tags: ["ops", "release", "playbook"],
        stack: ["Runbooks", "Checklists"],
        goals: ["Reduce release regressions", "Standardize rollout steps"],
        members: [
          { name: "Sam", role: "Ops" },
          { name: "Devon", role: "Engineer" },
        ],
        milestones: [
          { title: "Draft runbook", due: "2026-02-18", state: "done" },
          { title: "Team review", due: "2026-02-24", state: "done" },
          { title: "Adopt as default", due: "2026-03-02", state: "done" },
        ],
        activity: [{ text: "Playbook published to shared docs", createdAt: ts(1800) }],
        createdAt: ts(18000),
        updatedAt: ts(1600),
      },
    ].map(normalizeProject);
  }

  function loadState() {
    let raw = null;
    try {
      raw = safeParse(localStorage.getItem(PROJECTS_KEY) || "null", null);
    } catch (_) {
      raw = null;
    }
    if (!raw || !Array.isArray(raw.projects) || !raw.projects.length) {
      const seeded = { projects: seedProjects() };
      try {
        localStorage.setItem(PROJECTS_KEY, JSON.stringify(seeded));
      } catch (_) {
        // Best-effort persistence for demo mode.
      }
      return seeded;
    }
    return { projects: raw.projects.map(normalizeProject) };
  }

  function saveState() {
    try {
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(state));
    } catch (_) {
      // Best-effort persistence for demo mode.
    }
  }

  function sanitizeUi(nextUi) {
    const candidate = nextUi || {};
    const view = ["my", "community", "shared"].includes(candidate.view) ? candidate.view : DEFAULT_UI.view;
    const sort = ["recent", "active", "alpha"].includes(candidate.sort) ? candidate.sort : DEFAULT_UI.sort;
    const filters = {
      discipline: ["all", "dev", "design", "marketing", "product", "ops"].includes(candidate.filters && candidate.filters.discipline)
        ? candidate.filters.discipline
        : "all",
      status: ["all", "planned", "active", "review", "completed", "archived"].includes(candidate.filters && candidate.filters.status)
        ? candidate.filters.status
        : "all",
      type: ["all", "featured", "seeking", "standard"].includes(candidate.filters && candidate.filters.type)
        ? candidate.filters.type
        : "all",
    };

    return {
      view,
      sort,
      search: normalizeStr(candidate.search || "", ""),
      filters,
    };
  }

  function loadUi() {
    let stored = null;
    try {
      stored = safeParse(localStorage.getItem(UI_KEY) || "null", null);
    } catch (_) {
      stored = null;
    }
    return sanitizeUi({ ...DEFAULT_UI, ...(stored || {}) });
  }

  function saveUi() {
    try {
      localStorage.setItem(UI_KEY, JSON.stringify(ui));
    } catch (_) {
      // Best-effort persistence for demo mode.
    }
  }

  function isFeaturedProject(project) {
    return Boolean(project.isFeatured || project.projectType === "featured");
  }

  function isSeekingProject(project) {
    if (project.projectType === "seeking") return true;
    return (project.tags || []).some((tag) => String(tag).toLowerCase().includes("seeking"));
  }

  function matchesTypeFilter(project, type) {
    if (type === "all") return true;
    if (type === "featured") return isFeaturedProject(project);
    if (type === "seeking") return isSeekingProject(project);
    return !isFeaturedProject(project) && !isSeekingProject(project);
  }

  function applyViewFilterSortSearch() {
    const query = ui.search.trim().toLowerCase();
    let result = state.projects.filter((project) => project.ownerType === ui.view);

    result = result.filter((project) => {
      if (ui.filters.discipline !== "all" && project.discipline !== ui.filters.discipline) return false;
      if (ui.filters.status !== "all" && project.status !== ui.filters.status) return false;
      if (!matchesTypeFilter(project, ui.filters.type)) return false;

      if (!query) return true;

      const haystack = [
        project.title,
        project.summary,
        project.description,
        ...(project.tags || []),
        ...(project.stack || []),
        ...(project.goals || []),
        ...(project.members || []).map((m) => `${m.name} ${m.role}`),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });

    const sorted = result.slice();
    if (ui.sort === "alpha") {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else if (ui.sort === "active") {
      sorted.sort((a, b) => {
        const delta = (b.activity || []).length - (a.activity || []).length;
        if (delta !== 0) return delta;
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      });
    } else {
      sorted.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }

    return sorted;
  }

  function statusClass(status) {
    return `status-${status}`;
  }

  function projectCardHtml(project) {
    const tags = (project.tags || []).slice(0, 3).map((t) => `<span class="chip" role="note">${escapeHTML(t)}</span>`).join("");
    const stack = (project.stack || []).slice(0, 2).join(" • ");
    const activityCount = (project.activity || []).length;

    return `
      <article class="project-item project-card-v2 ${statusClass(project.status)}" data-id="${escapeHTML(project.id)}">
        <div class="project-card-top">
          <p class="project-card-meta">${escapeHTML(VIEW_LABEL[project.ownerType] || "Projects")} • ${escapeHTML(DISCIPLINE_LABEL[project.discipline] || "General")}</p>
          <span class="project-status-badge">${escapeHTML(STATUS_LABEL[project.status] || "Planned")}</span>
        </div>
        <h3>${escapeHTML(project.title)}</h3>
        <p>${escapeHTML(project.summary)}</p>
        <div class="project-card-foot">
          <div class="chip-row" aria-label="Project tags">${tags || '<span class="chip" role="note">General</span>'}</div>
          <p class="project-card-submeta">${escapeHTML(TYPE_LABEL[project.projectType] || "Standard")} • ${escapeHTML(stack || "No stack listed")} • ${activityCount} updates</p>
        </div>
        <div class="project-card-actions">
          <button class="btn subtle" type="button" data-action="detail" data-id="${escapeHTML(project.id)}">Details</button>
          <button class="btn subtle" type="button" data-action="edit" data-id="${escapeHTML(project.id)}">Edit</button>
          <button class="btn subtle" type="button" data-action="archive" data-id="${escapeHTML(project.id)}">${project.status === "archived" ? "Restore" : "Archive"}</button>
          <button class="auth-btn" type="button" data-action="share" data-id="${escapeHTML(project.id)}">Share</button>
        </div>
      </article>
    `;
  }

  function renderProjects() {
    const list = applyViewFilterSortSearch();

    if (!els.projectsList || !els.projectsEmpty) return;

    els.projectsList.setAttribute("aria-busy", "true");

    if (!list.length) {
      els.projectsList.innerHTML = "";
      els.projectsEmpty.hidden = false;
    } else {
      els.projectsList.innerHTML = list.map(projectCardHtml).join("");
      els.projectsEmpty.hidden = true;
    }

    els.projectsList.setAttribute("aria-busy", "false");
    renderInsights(list);
  }

  function renderInsights(filteredList) {
    const inView = state.projects.filter((project) => project.ownerType === ui.view);
    const activeCount = inView.filter((project) => project.status === "active").length;
    const archivedCount = inView.filter((project) => project.status === "archived").length;
    const seekingCount = inView.filter((project) => isSeekingProject(project)).length;

    if (els.insightViewTotal) els.insightViewTotal.textContent = String(filteredList.length);
    if (els.insightActiveTotal) els.insightActiveTotal.textContent = String(activeCount);
    if (els.insightArchivedTotal) els.insightArchivedTotal.textContent = String(archivedCount);
    if (els.insightSeekingTotal) els.insightSeekingTotal.textContent = String(seekingCount);

    if (els.projectsSavedView) {
      const applied = [];
      if (ui.filters.discipline !== "all") applied.push(`discipline: ${ui.filters.discipline}`);
      if (ui.filters.status !== "all") applied.push(`status: ${ui.filters.status}`);
      if (ui.filters.type !== "all") applied.push(`type: ${ui.filters.type}`);
      if (ui.search.trim()) applied.push(`search: "${ui.search.trim()}"`);

      const text = `${VIEW_LABEL[ui.view]} • ${ui.sort} sort${applied.length ? ` • ${applied.join(", ")}` : ""}`;
      els.projectsSavedView.textContent = text;
    }

    if (els.projectsMainHeading) {
      els.projectsMainHeading.textContent = `${VIEW_LABEL[ui.view]} workspace`;
    }
  }

  function showToast(message) {
    if (!els.projectsToast) return;
    els.projectsToast.textContent = message;
    els.projectsToast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      if (els.projectsToast) els.projectsToast.hidden = true;
    }, 2200);
  }

  function setView(view, options) {
    if (!["my", "community", "shared"].includes(view)) return;
    const opts = options || {};
    const shouldPersist = opts.persist !== false;
    const shouldRender = opts.render !== false;
    const projectId = opts.projectId || null;

    ui.view = view;

    const tabs = toArray(els.viewTabs);
    tabs.forEach((btn) => {
      const active = btn.dataset.view === view;
      btn.setAttribute("aria-selected", String(active));
      btn.classList.toggle("is-active", active);
    });

    if (shouldPersist) saveUi();
    syncUrl(projectId);
    if (shouldRender) renderProjects();
  }

  function setFilter(kind, value, options) {
    if (!["discipline", "status", "type"].includes(kind)) return;
    const opts = options || {};
    const shouldPersist = opts.persist !== false;
    const shouldRender = opts.render !== false;

    ui.filters[kind] = value;

    const chips = toArray(els.filterButtonsByKind && els.filterButtonsByKind[kind]);
    chips.forEach((chip) => {
      chip.setAttribute("aria-pressed", String(chip.dataset.filterValue === value));
    });

    if (shouldPersist) saveUi();
    if (shouldRender) renderProjects();
  }

  function resetUiState() {
    clearTimeout(searchTimer);
    ui = { ...DEFAULT_UI, filters: { ...DEFAULT_UI.filters } };
    if (els.projectsSearch) els.projectsSearch.value = "";
    if (els.projectsSort) els.projectsSort.value = ui.sort;
    setView(ui.view, { persist: false, render: false, projectId: null });
    setFilter("discipline", "all", { persist: false, render: false });
    setFilter("status", "all", { persist: false, render: false });
    setFilter("type", "all", { persist: false, render: false });
    saveUi();
    syncUrl(null);
    renderProjects();
  }

  function findProjectById(id) {
    return state.projects.find((project) => project.id === id) || null;
  }

  function listHtml(items, formatter) {
    if (!items || !items.length) return "<li>None yet.</li>";
    return items.map(formatter).join("");
  }

  function hasItems(items) {
    return Array.isArray(items) && items.length > 0;
  }

  function setHidden(el, hidden) {
    if (!el) return;
    el.hidden = Boolean(hidden);
  }

  function openModal(modalEl) {
    if (!modalEl) return;
    modalEl.setAttribute("aria-hidden", "false");
    modalEl.style.display = "flex";
    document.body.classList.add("cc-projects-modal-open");
  }

  function closeModal(modalEl) {
    if (!modalEl) return;
    modalEl.setAttribute("aria-hidden", "true");
    modalEl.style.display = "";
    if (
      els.projectDetailModal &&
      els.projectFormModal &&
      els.projectDetailModal.getAttribute("aria-hidden") === "true" &&
      els.projectFormModal.getAttribute("aria-hidden") === "true"
    ) {
      document.body.classList.remove("cc-projects-modal-open");
    }
  }

  function openProjectDetail(id) {
    const project = findProjectById(id);
    if (!project || !els.projectDetailModal) return;

    detailProjectId = id;

    if (els.projectDetailTitle) els.projectDetailTitle.textContent = project.title;
    if (els.projectDetailSummary) els.projectDetailSummary.textContent = project.summary;
    if (els.projectDetailDescription) els.projectDetailDescription.textContent = project.description;

    if (els.detailStatus) els.detailStatus.textContent = STATUS_LABEL[project.status] || "Planned";
    if (els.detailDiscipline) els.detailDiscipline.textContent = DISCIPLINE_LABEL[project.discipline] || "General";
    if (els.detailUpdated) els.detailUpdated.textContent = `Updated ${timeAgo(project.updatedAt)}`;

    if (els.detailGoals) {
      const goals = hasItems(project.goals) ? project.goals.slice(0, 4) : [];
      els.detailGoals.innerHTML = listHtml(goals, (goal) => `<li>${escapeHTML(goal)}</li>`);
      setHidden(els.detailGoalsBlock, !goals.length);
    }

    if (els.detailStack) {
      const chips = project.stack.length ? project.stack : ["No stack listed"];
      els.detailStack.innerHTML = chips.map((item) => `<span class="chip" role="note">${escapeHTML(item)}</span>`).join("");
    }

    if (els.detailTags) {
      const chips = project.tags.length ? project.tags : ["General"];
      els.detailTags.innerHTML = chips.map((item) => `<span class="chip" role="note">${escapeHTML(item)}</span>`).join("");
    }

    if (els.detailMembers) {
      const members = hasItems(project.members) ? project.members.slice(0, 5) : [];
      els.detailMembers.innerHTML = listHtml(
        members,
        (member) => `<li>${escapeHTML(member.name)} • ${escapeHTML(member.role)}</li>`
      );
      setHidden(els.detailMembersBlock, !members.length);
    }

    if (els.detailMilestones) {
      const milestones = hasItems(project.milestones) ? project.milestones.slice(0, 5) : [];
      els.detailMilestones.innerHTML = listHtml(
        milestones,
        (milestone) => `<li>${escapeHTML(milestone.title)} <span class="muted">(${escapeHTML(milestone.due)} • ${escapeHTML(milestone.state)})</span></li>`
      );
      setHidden(els.detailMilestonesBlock, !milestones.length);
    }

    if (els.detailActivity) {
      const recent = (project.activity || []).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 4);
      els.detailActivity.innerHTML = listHtml(
        recent,
        (entry) => `<li>${escapeHTML(entry.text)} <span class="muted">(${timeAgo(entry.createdAt)})</span></li>`
      );
      setHidden(els.detailActivityBlock, !recent.length);
    }

    if (els.detailShareBtn) els.detailShareBtn.dataset.id = id;
    if (els.detailEditBtn) els.detailEditBtn.dataset.id = id;

    syncUrl(id);
    openModal(els.projectDetailModal);
  }

  function closeProjectDetail() {
    detailProjectId = null;
    syncUrl(null);
    closeModal(els.projectDetailModal);
  }

  function formToTextMembers(members) {
    return (members || []).map((m) => `${m.name} | ${m.role}`).join("\n");
  }

  function formToTextMilestones(milestones) {
    return (milestones || []).map((m) => `${m.title} | ${m.due} | ${m.state}`).join("\n");
  }

  function setAdvancedFieldsVisible(visible) {
    const isVisible = Boolean(visible);
    if (els.projectAdvancedFields) els.projectAdvancedFields.hidden = !isVisible;
    if (els.projectAdvancedToggle) {
      els.projectAdvancedToggle.setAttribute("aria-expanded", String(isVisible));
      els.projectAdvancedToggle.textContent = isVisible ? "Hide optional details" : "More details (optional)";
    }
  }

  function openProjectForm(mode, id) {
    if (!els.projectFormModal || !els.projectForm || !els.projectFormTitle) return;

    const isEdit = mode === "edit";
    const project = isEdit ? findProjectById(id) : null;

    els.projectForm.reset();
    setAdvancedFieldsVisible(false);

    if (els.projectFormMode) els.projectFormMode.value = isEdit ? "edit" : "create";
    if (els.projectFormId) els.projectFormId.value = project ? project.id : "";
    els.projectFormTitle.textContent = isEdit ? "Edit Project" : "New Project";

    if (project) {
      if (els.projectTitle) els.projectTitle.value = project.title;
      if (els.projectSummary) els.projectSummary.value = project.summary;
      if (els.projectDescription) els.projectDescription.value = project.description;
      if (els.projectOwnerType) els.projectOwnerType.value = project.ownerType;
      if (els.projectStatus) els.projectStatus.value = project.status;
      if (els.projectDiscipline) els.projectDiscipline.value = project.discipline;
      if (els.projectType) els.projectType.value = project.projectType;
      if (els.projectTags) els.projectTags.value = (project.tags || []).join(", ");
      if (els.projectStack) els.projectStack.value = (project.stack || []).join(", ");
      if (els.projectGoals) els.projectGoals.value = (project.goals || []).join("\n");
      if (els.projectMembers) els.projectMembers.value = formToTextMembers(project.members);
      if (els.projectMilestones) els.projectMilestones.value = formToTextMilestones(project.milestones);
      setAdvancedFieldsVisible(
        hasItems(project.stack) || hasItems(project.goals) || hasItems(project.members) || hasItems(project.milestones)
      );
    } else {
      if (els.projectOwnerType) els.projectOwnerType.value = ui.view;
      if (els.projectStatus) els.projectStatus.value = "planned";
      if (els.projectDiscipline) els.projectDiscipline.value = "dev";
      if (els.projectType) els.projectType.value = "standard";
    }

    openModal(els.projectFormModal);
    setTimeout(() => {
      if (els.projectTitle) els.projectTitle.focus();
    }, 0);
  }

  function closeProjectForm() {
    closeModal(els.projectFormModal);
  }

  function buildPayloadFromForm() {
    return {
      title: normalizeStr(els.projectTitle && els.projectTitle.value, "Untitled Project"),
      summary: normalizeStr(els.projectSummary && els.projectSummary.value, "No summary yet."),
      description: normalizeStr(els.projectDescription && els.projectDescription.value, "No description yet."),
      ownerType: normalizeStr(els.projectOwnerType && els.projectOwnerType.value, "my"),
      status: normalizeStr(els.projectStatus && els.projectStatus.value, "planned"),
      discipline: normalizeStr(els.projectDiscipline && els.projectDiscipline.value, "dev"),
      projectType: normalizeStr(els.projectType && els.projectType.value, "standard"),
      tags: parseCommaList(els.projectTags && els.projectTags.value),
      stack: parseCommaList(els.projectStack && els.projectStack.value),
      goals: parseLines(els.projectGoals && els.projectGoals.value),
      members: parseMembers(els.projectMembers && els.projectMembers.value),
      milestones: parseMilestones(els.projectMilestones && els.projectMilestones.value),
    };
  }

  function createProject(payload) {
    const createdAt = nowIso();
    const project = normalizeProject(
      {
        id: uid("proj-"),
        ...payload,
        activity: [{ text: "Project created", createdAt }],
        createdAt,
        updatedAt: createdAt,
        isFeatured: payload.projectType === "featured",
      },
      state.projects.length
    );

    state.projects.unshift(project);
    saveState();
    setView(project.ownerType, { projectId: null });
    showToast("Project created.");
  }

  function updateProject(id, payload) {
    const index = state.projects.findIndex((project) => project.id === id);
    if (index < 0) return;

    const existing = state.projects[index];
    const updatedAt = nowIso();
    const next = normalizeProject(
      {
        ...existing,
        ...payload,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt,
        isFeatured: payload.projectType === "featured",
        activity: [
          ...(existing.activity || []),
          { text: "Project details updated", createdAt: updatedAt },
        ].slice(-15),
      },
      index
    );

    state.projects[index] = next;
    saveState();
    renderProjects();

    if (
      detailProjectId === id &&
      els.projectDetailModal &&
      els.projectDetailModal.getAttribute("aria-hidden") === "false"
    ) {
      openProjectDetail(id);
    }

    showToast("Project updated.");
  }

  function toggleArchive(id) {
    const project = findProjectById(id);
    if (!project) return;

    const updatedAt = nowIso();
    const nextStatus = project.status === "archived" ? "active" : "archived";
    project.status = nextStatus;
    project.updatedAt = updatedAt;
    project.activity = [
      ...(project.activity || []),
      { text: nextStatus === "archived" ? "Project archived" : "Project restored", createdAt: updatedAt },
    ].slice(-15);

    saveState();
    renderProjects();
    if (detailProjectId === id) openProjectDetail(id);
    showToast(nextStatus === "archived" ? "Project archived." : "Project restored.");
  }

  function shareProjectToSocial(id) {
    const project = findProjectById(id);
    if (!project) return;

    const social = safeParse(localStorage.getItem(SOCIAL_KEY) || "null", null) || { posts: [] };
    if (!Array.isArray(social.posts)) social.posts = [];

    const createdAt = nowIso();
    const author = currentUserEmail();
    const tagText = (project.tags || []).slice(0, 2).map((t) => `#${String(t).replace(/\s+/g, "")}`).join(" ");
    const text = `Project update: ${project.title} — ${project.summary}${tagText ? ` ${tagText}` : ""}`;

    social.posts.push({
      id: uid("p"),
      type: "project",
      author,
      text,
      likes: [],
      comments: [],
      createdAt,
    });

    if (social.posts.length > 150) social.posts = social.posts.slice(-150);

    try {
      localStorage.setItem(SOCIAL_KEY, JSON.stringify(social));
    } catch (_) {
      showToast("Unable to share right now. Please try again.");
      return;
    }

    project.updatedAt = createdAt;
    project.activity = [
      ...(project.activity || []),
      { text: "Shared project update to Social", createdAt },
    ].slice(-15);
    saveState();
    renderProjects();
    if (detailProjectId === id) openProjectDetail(id);
    showToast("Shared to Social feed.");
  }

  function syncUrl(projectId) {
    const url = new URL(window.location.href);
    if (ui.view === "my") {
      url.searchParams.delete("view");
    } else {
      url.searchParams.set("view", ui.view);
    }

    if (projectId) {
      url.searchParams.set("project", projectId);
    } else {
      url.searchParams.delete("project");
    }

    history.replaceState(null, "", url.toString());
  }

  function applyQueryOverrides() {
    const params = new URLSearchParams(window.location.search);
    const qView = normalizeStr(params.get("view"), "").toLowerCase();
    const qProject = normalizeStr(params.get("project"), "");

    if (["my", "community", "shared"].includes(qView)) {
      ui.view = qView;
    }

    return qProject;
  }

  function bindStaticUi() {
    const tabs = toArray(els.viewTabs);
    tabs.forEach((btn) => {
      btn.addEventListener("click", () => setView(btn.dataset.view));
      btn.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
        event.preventDefault();
        const idx = tabs.indexOf(btn);
        const next = event.key === "ArrowRight" ? (idx + 1) % tabs.length : (idx - 1 + tabs.length) % tabs.length;
        tabs[next].focus();
      });
    });

    const filterBtns = toArray(els.filterButtons);
    filterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        setFilter(btn.dataset.filterKind, btn.dataset.filterValue);
      });
    });

    if (els.projectsSearch) {
      els.projectsSearch.addEventListener("input", () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          ui.search = els.projectsSearch.value || "";
          saveUi();
          renderProjects();
        }, 90);
      });
    }

    if (els.projectsSort) {
      els.projectsSort.addEventListener("change", () => {
        ui.sort = els.projectsSort.value;
        saveUi();
        renderProjects();
      });
    }

    if (els.newProjectBtn) {
      els.newProjectBtn.addEventListener("click", () => openProjectForm("create"));
    }

    if (els.resetProjectsUiBtn) {
      els.resetProjectsUiBtn.addEventListener("click", resetUiState);
    }

    if (els.projectsEmptyResetBtn) {
      els.projectsEmptyResetBtn.addEventListener("click", resetUiState);
    }

    if (els.projectsList) {
      els.projectsList.addEventListener("click", (event) => {
        const btn = event.target.closest("button[data-action][data-id]");
        if (!btn) return;
        const { action, id } = btn.dataset;
        if (action === "detail") openProjectDetail(id);
        if (action === "edit") openProjectForm("edit", id);
        if (action === "archive") toggleArchive(id);
        if (action === "share") shareProjectToSocial(id);
      });
    }

    if (els.projectAdvancedToggle) {
      els.projectAdvancedToggle.addEventListener("click", () => {
        const isExpanded = els.projectAdvancedToggle.getAttribute("aria-expanded") === "true";
        setAdvancedFieldsVisible(!isExpanded);
      });
    }

    if (els.detailEditBtn) {
      els.detailEditBtn.addEventListener("click", () => {
        const id = els.detailEditBtn.dataset.id || detailProjectId;
        if (!id) return;
        openProjectForm("edit", id);
      });
    }

    if (els.detailShareBtn) {
      els.detailShareBtn.addEventListener("click", () => {
        const id = els.detailShareBtn.dataset.id || detailProjectId;
        if (!id) return;
        shareProjectToSocial(id);
      });
    }

    if (els.projectForm) {
      els.projectForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const mode = (els.projectFormMode && els.projectFormMode.value) || "create";
        const id = (els.projectFormId && els.projectFormId.value) || "";
        const payload = buildPayloadFromForm();

        if (mode === "edit" && id) {
          updateProject(id, payload);
        } else {
          createProject(payload);
        }

        closeProjectForm();
      });
    }

    if (els.projectFormCancel) {
      els.projectFormCancel.addEventListener("click", closeProjectForm);
    }

    document.addEventListener("click", (event) => {
      const closeBtn = event.target.closest("[data-close-modal]");
      if (!closeBtn) return;
      if (closeBtn.dataset.closeModal === "detail") closeProjectDetail();
      if (closeBtn.dataset.closeModal === "form") closeProjectForm();
    });

    if (els.projectDetailModal) {
      els.projectDetailModal.addEventListener("click", (event) => {
        if (event.target === els.projectDetailModal) closeProjectDetail();
      });
    }

    if (els.projectFormModal) {
      els.projectFormModal.addEventListener("click", (event) => {
        if (event.target === els.projectFormModal) closeProjectForm();
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (els.projectFormModal && els.projectFormModal.getAttribute("aria-hidden") === "false") {
        closeProjectForm();
        return;
      }
      if (els.projectDetailModal && els.projectDetailModal.getAttribute("aria-hidden") === "false") {
        closeProjectDetail();
      }
    });
  }

  function primeElements() {
    els.projectsList = document.getElementById("projectsList");
    els.projectsEmpty = document.getElementById("projectsEmpty");
    els.projectsSearch = document.getElementById("projectsSearch");
    els.projectsSort = document.getElementById("projectsSort");
    els.projectsMainHeading = document.getElementById("projectsMainHeading");

    els.newProjectBtn = document.getElementById("newProjectBtn");
    els.resetProjectsUiBtn = document.getElementById("resetProjectsUiBtn");
    els.projectsEmptyResetBtn = document.getElementById("projectsEmptyResetBtn");

    els.insightViewTotal = document.getElementById("insightViewTotal");
    els.insightActiveTotal = document.getElementById("insightActiveTotal");
    els.insightSeekingTotal = document.getElementById("insightSeekingTotal");
    els.insightArchivedTotal = document.getElementById("insightArchivedTotal");
    els.projectsSavedView = document.getElementById("projectsSavedView");
    els.projectsToast = document.getElementById("projectsToast");

    els.projectDetailModal = document.getElementById("projectDetailModal");
    els.projectDetailTitle = document.getElementById("projectDetailTitle");
    els.projectDetailSummary = document.getElementById("projectDetailSummary");
    els.projectDetailDescription = document.getElementById("projectDetailDescription");
    els.detailStatus = document.getElementById("detailStatus");
    els.detailDiscipline = document.getElementById("detailDiscipline");
    els.detailUpdated = document.getElementById("detailUpdated");
    els.detailGoals = document.getElementById("detailGoals");
    els.detailStack = document.getElementById("detailStack");
    els.detailTags = document.getElementById("detailTags");
    els.detailMembers = document.getElementById("detailMembers");
    els.detailMilestones = document.getElementById("detailMilestones");
    els.detailActivity = document.getElementById("detailActivity");
    els.detailShareBtn = document.getElementById("detailShareBtn");
    els.detailEditBtn = document.getElementById("detailEditBtn");

    els.projectFormModal = document.getElementById("projectFormModal");
    els.projectForm = document.getElementById("projectForm");
    els.projectFormTitle = document.getElementById("projectFormTitle");
    els.projectFormMode = document.getElementById("projectFormMode");
    els.projectFormId = document.getElementById("projectFormId");
    els.projectTitle = document.getElementById("projectTitle");
    els.projectSummary = document.getElementById("projectSummary");
    els.projectDescription = document.getElementById("projectDescription");
    els.projectOwnerType = document.getElementById("projectOwnerType");
    els.projectStatus = document.getElementById("projectStatus");
    els.projectDiscipline = document.getElementById("projectDiscipline");
    els.projectType = document.getElementById("projectType");
    els.projectTags = document.getElementById("projectTags");
    els.projectStack = document.getElementById("projectStack");
    els.projectGoals = document.getElementById("projectGoals");
    els.projectMembers = document.getElementById("projectMembers");
    els.projectMilestones = document.getElementById("projectMilestones");
    els.projectAdvancedToggle = document.getElementById("projectAdvancedToggle");
    els.projectAdvancedFields = document.getElementById("projectAdvancedFields");
    els.projectFormCancel = document.getElementById("projectFormCancel");

    els.viewTabs = toArray(document.querySelectorAll("#projectsViewTabs [data-view]"));
    els.filterButtons = toArray(document.querySelectorAll("[data-filter-kind][data-filter-value]"));
    els.filterButtonsByKind = {};
    els.filterButtons.forEach((btn) => {
      const kind = btn.dataset.filterKind;
      if (!kind) return;
      if (!els.filterButtonsByKind[kind]) els.filterButtonsByKind[kind] = [];
      els.filterButtonsByKind[kind].push(btn);
    });

    els.detailGoalsBlock = document.getElementById("detailGoalsBlock");
    els.detailMembersBlock = document.getElementById("detailMembersBlock");
    els.detailMilestonesBlock = document.getElementById("detailMilestonesBlock");
    els.detailActivityBlock = document.getElementById("detailActivityBlock");
  }

  function syncControlsFromUi() {
    if (els.projectsSearch) els.projectsSearch.value = ui.search;
    if (els.projectsSort) els.projectsSort.value = ui.sort;

    setView(ui.view, { persist: false, render: false });
    setFilter("discipline", ui.filters.discipline, { persist: false, render: false });
    setFilter("status", ui.filters.status, { persist: false, render: false });
    setFilter("type", ui.filters.type, { persist: false, render: false });
  }

  function init() {
    primeElements();
    if (!els.projectsList) return;

    state = loadState();
    ui = loadUi();
    const deepProject = applyQueryOverrides();

    bindStaticUi();
    syncControlsFromUi();
    renderProjects();

    if (deepProject && findProjectById(deepProject)) {
      openProjectDetail(deepProject);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
