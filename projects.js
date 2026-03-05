(function () {
  const PROJECTS_KEY = "cc:projects:v1";
  const UI_KEY = "cc:projects:ui:v1";
  const SOCIAL_KEY = "cc:social:v2";
  const PROJECTS_SEED_VERSION_KEY = "cc:projects:seed-version";
  const PROJECTS_SEED_VERSION = 3;

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

  const FILTER_KIND_LABEL = {
    discipline: "Discipline",
    status: "Status",
    type: "Type",
    search: "Search",
  };

  const FILTER_OPTIONS = {
    discipline: ["all", "dev", "design", "marketing", "product", "ops"],
    status: ["all", "planned", "active", "review", "completed", "archived"],
    type: ["all", "featured", "seeking", "standard"],
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
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object" && typeof value.length === "number") {
      return Array.from(value);
    }
    return [];
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
    const source = project && typeof project === "object" ? project : {};
    const createdAt = normalizeStr(source.createdAt, nowIso());
    const updatedAt = normalizeStr(source.updatedAt, createdAt);
    const tags = toArray(source.tags).map((t) => normalizeStr(t, "")).filter(Boolean);
    const stack = toArray(source.stack).map((t) => normalizeStr(t, "")).filter(Boolean);
    const goals = toArray(source.goals).map((g) => normalizeStr(g, "")).filter(Boolean);
    const members = toArray(source.members)
      .map((m) => ({ name: normalizeStr(m && m.name, "Team member"), role: normalizeStr(m && m.role, "Contributor") }))
      .filter((m) => m.name);
    const milestones = toArray(source.milestones)
      .map((m) => ({
        title: normalizeStr(m && m.title, "Milestone"),
        due: normalizeStr(m && m.due, "TBD"),
        state: ["todo", "doing", "done"].includes((m && m.state) || "") ? m.state : "todo",
      }))
      .filter((m) => m.title);
    const activity = toArray(source.activity)
      .map((a) => ({ text: normalizeStr(a && a.text, "Updated project"), createdAt: normalizeStr(a && a.createdAt, updatedAt) }))
      .filter((a) => a.text);

    const ownerType = ["my", "community", "shared"].includes(source.ownerType) ? source.ownerType : "community";
    const status = ["planned", "active", "review", "completed", "archived"].includes(source.status)
      ? source.status
      : "planned";
    const discipline = ["dev", "design", "marketing", "product", "ops"].includes(source.discipline)
      ? source.discipline
      : "dev";
    const projectType = ["standard", "featured", "seeking"].includes(source.projectType)
      ? source.projectType
      : (source.isFeatured ? "featured" : "standard");

    return {
      id: normalizeStr(source.id, `seed-${i + 1}`),
      ownerType,
      title: normalizeStr(source.title, "Untitled Project"),
      summary: normalizeStr(source.summary, "No summary yet."),
      description: normalizeStr(source.description, "No description provided yet."),
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
      isFeatured: Boolean(source.isFeatured || projectType === "featured"),
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
        id: "my-realestate-site",
        ownerType: "my",
        title: "Luxury Real Estate Listing Site",
        summary: "Modern property showcase site with map search, listing pages, and lead capture forms.",
        description:
          "Portfolio-ready real estate website concept focused on premium visuals, fast listing discovery, and a smooth contact flow for agents and buyers.",
        status: "active",
        discipline: "dev",
        projectType: "featured",
        tags: ["real-estate", "web", "portfolio"],
        stack: ["HTML", "CSS", "JavaScript"],
        goals: ["Launch listing browse UX", "Improve map + filter discoverability", "Ship polished lead form flow"],
        members: [
          { name: "Tyler", role: "Frontend" },
          { name: "Maya", role: "UX" },
        ],
        milestones: [
          { title: "Homepage + listings layout", due: "2026-03-14", state: "done" },
          { title: "Property detail templates", due: "2026-03-18", state: "doing" },
          { title: "Lead capture QA pass", due: "2026-03-22", state: "todo" },
        ],
        activity: [
          { text: "Refined filter controls for listing search", createdAt: ts(140) },
          { text: "Updated hero and typography contrast", createdAt: ts(55) },
        ],
        createdAt: ts(6000),
        updatedAt: ts(40),
        isFeatured: true,
      },
      {
        id: "my-figma-design-kit",
        ownerType: "my",
        title: "Figma Component Kit",
        summary: "Reusable Figma components and interaction patterns for product landing pages.",
        description:
          "A design kit used to accelerate mockups, align spacing/typography, and keep UI decisions consistent across marketing and product pages.",
        status: "planned",
        discipline: "design",
        projectType: "standard",
        tags: ["figma", "design-system", "components"],
        stack: ["Figma", "Design Tokens"],
        goals: ["Finalize button and card variants", "Document spacing and typography usage"],
        members: [
          { name: "Tyler", role: "Design" },
          { name: "Alex", role: "Frontend" },
        ],
        milestones: [
          { title: "Core component library setup", due: "2026-03-19", state: "doing" },
          { title: "Usage docs and handoff notes", due: "2026-03-23", state: "todo" },
        ],
        activity: [{ text: "Added metallic CTA and form states", createdAt: ts(320) }],
        createdAt: ts(6800),
        updatedAt: ts(260),
      },
      {
        id: "my-realestate-admin-console",
        ownerType: "my",
        title: "Real Estate Admin Console",
        summary: "Internal dashboard for listings, agents, and lead workflows.",
        description:
          "Desktop-focused admin interface prototype for real estate operations with status tracking, listing moderation, and pipeline visibility.",
        status: "review",
        discipline: "ops",
        projectType: "standard",
        tags: ["real-estate", "dashboard", "admin"],
        stack: ["JavaScript", "Charts", "CSS"],
        goals: ["Finalize listing moderation flow", "Improve dashboard readability"],
        members: [
          { name: "Tyler", role: "Frontend" },
          { name: "Sam", role: "Ops" },
        ],
        milestones: [
          { title: "Ops table interactions", due: "2026-03-17", state: "doing" },
          { title: "QA checklist", due: "2026-03-21", state: "todo" },
        ],
        activity: [{ text: "Refined table and status badge hierarchy", createdAt: ts(180) }],
        createdAt: ts(7100),
        updatedAt: ts(130),
      },
      {
        id: "my-figma-mobile-flow-mock",
        ownerType: "my",
        title: "Figma Mobile Flow Mock",
        summary: "Early mobile user-flow mockups for the future responsive redesign phase.",
        description:
          "Figma exploration focused on navigation hierarchy, simplified cards, and readable controls for small-screen project browsing.",
        status: "active",
        discipline: "design",
        projectType: "seeking",
        tags: ["figma", "mobile", "ux"],
        stack: ["Figma", "Prototype Flows"],
        goals: ["Validate mobile information hierarchy", "Prepare handoff frames"],
        members: [
          { name: "Tyler", role: "Design" },
          { name: "Mia", role: "UX Reviewer" },
        ],
        milestones: [
          { title: "Navigation flow prototype", due: "2026-03-16", state: "doing" },
          { title: "Usability critique", due: "2026-03-20", state: "todo" },
        ],
        activity: [{ text: "Updated bottom-nav exploration in Figma", createdAt: ts(95) }],
        createdAt: ts(5400),
        updatedAt: ts(80),
      },
      {
        id: "my-client-portal-mvp",
        ownerType: "my",
        title: "Client Project Portal MVP",
        summary: "Simple collaboration portal concept for client updates and approvals.",
        description:
          "A lightweight project portal demo showing status updates, approvals, shared notes, and milestone visibility for client-facing workflows.",
        status: "planned",
        discipline: "product",
        projectType: "standard",
        tags: ["portal", "client", "mvp"],
        stack: ["HTML", "CSS", "JavaScript"],
        goals: ["Define MVP scope", "Prototype status + approval interactions"],
        members: [
          { name: "Tyler", role: "Product" },
          { name: "Alex", role: "Frontend" },
        ],
        milestones: [
          { title: "Scope brief", due: "2026-03-18", state: "todo" },
          { title: "Interaction prototype", due: "2026-03-23", state: "todo" },
        ],
        activity: [{ text: "Outlined MVP journey and permission states", createdAt: ts(430) }],
        createdAt: ts(8600),
        updatedAt: ts(420),
      },
      {
        id: "my-brand-content-refresh",
        ownerType: "my",
        title: "Brand + Content Refresh",
        summary: "Messaging and page-content refresh for portfolio positioning and clarity.",
        description:
          "Cross-page rewrite effort to improve copy hierarchy, improve readability, and better explain the collaboration-first value proposition.",
        status: "completed",
        discipline: "marketing",
        projectType: "featured",
        tags: ["content", "branding", "portfolio"],
        stack: ["Content Strategy", "Docs"],
        goals: ["Sharpen positioning copy", "Improve CTA clarity across pages"],
        members: [
          { name: "Tyler", role: "Owner" },
          { name: "Nora", role: "Content" },
        ],
        milestones: [
          { title: "Messaging pass", due: "2026-03-03", state: "done" },
          { title: "Final proofread", due: "2026-03-05", state: "done" },
        ],
        activity: [{ text: "Published finalized copy across core pages", createdAt: ts(720) }],
        createdAt: ts(12800),
        updatedAt: ts(700),
        isFeatured: true,
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
        id: "community-figma-accessibility-audit",
        ownerType: "community",
        title: "Figma Accessibility Audit Sprint",
        summary: "Community review of contrast, spacing, and readable component states in Figma mockups.",
        description:
          "Designers and developers collaborate on accessibility-first improvements to reusable Figma files before implementation.",
        status: "review",
        discipline: "design",
        projectType: "seeking",
        tags: ["figma", "accessibility", "review"],
        stack: ["Figma", "WCAG Checklist"],
        goals: ["Audit key components", "Create accessible token recommendations"],
        members: [
          { name: "Mia", role: "Design" },
          { name: "Jordan", role: "QA" },
        ],
        milestones: [
          { title: "Contrast audit pass", due: "2026-03-13", state: "doing" },
          { title: "Design handoff recommendations", due: "2026-03-17", state: "todo" },
        ],
        activity: [{ text: "Flagged low-contrast chip variants for revision", createdAt: ts(150) }],
        createdAt: ts(9000),
        updatedAt: ts(110),
      },
      {
        id: "community-realestate-analytics",
        ownerType: "community",
        title: "Real Estate Market Pulse Dashboard",
        summary: "Collaborative dashboard concept to track property trends and neighborhood insights.",
        description:
          "Cross-discipline project combining product planning, data storytelling, and frontend implementation for real estate analytics.",
        status: "active",
        discipline: "product",
        projectType: "standard",
        tags: ["real-estate", "dashboard", "analytics"],
        stack: ["JavaScript", "Charts", "Figma"],
        goals: ["Define useful KPI set", "Prototype trend and map visualizations"],
        members: [
          { name: "Nora", role: "Product" },
          { name: "Sam", role: "Frontend" },
        ],
        milestones: [
          { title: "Dashboard wireframes", due: "2026-03-12", state: "done" },
          { title: "Interactive chart prototype", due: "2026-03-18", state: "doing" },
        ],
        activity: [{ text: "Published first KPI shortlist for community feedback", createdAt: ts(210) }],
        createdAt: ts(9800),
        updatedAt: ts(95),
      },
      {
        id: "community-open-housing-map",
        ownerType: "community",
        title: "Open Housing Map",
        summary: "Community map concept for listing affordable and available housing resources.",
        description:
          "A collaborative civic-tech style map project where contributors curate location data and accessibility notes for housing opportunities.",
        status: "active",
        discipline: "dev",
        projectType: "seeking",
        tags: ["real-estate", "map", "community"],
        stack: ["JavaScript", "Map APIs", "GeoJSON"],
        goals: ["Improve map filters", "Add contributor review workflow"],
        members: [
          { name: "Jordan", role: "Developer" },
          { name: "Mia", role: "Design" },
        ],
        milestones: [
          { title: "Map data validation", due: "2026-03-15", state: "doing" },
          { title: "Public beta prep", due: "2026-03-22", state: "todo" },
        ],
        activity: [{ text: "Added neighborhood accessibility tags", createdAt: ts(170) }],
        createdAt: ts(9300),
        updatedAt: ts(120),
      },
      {
        id: "community-figma-ui-challenge",
        ownerType: "community",
        title: "Figma UI Challenge Week",
        summary: "Open challenge to redesign common collaboration screens in Figma.",
        description:
          "Weekly Figma challenge where designers and developers propose practical improvements to dashboard, feed, and project card interfaces.",
        status: "planned",
        discipline: "design",
        projectType: "featured",
        tags: ["figma", "challenge", "ui"],
        stack: ["Figma", "Design Critique"],
        goals: ["Encourage design collaboration", "Collect reusable UI patterns"],
        members: [
          { name: "Mia", role: "Host" },
          { name: "Alex", role: "Frontend Reviewer" },
        ],
        milestones: [
          { title: "Challenge brief publish", due: "2026-03-18", state: "todo" },
          { title: "Submission review stream", due: "2026-03-24", state: "todo" },
        ],
        activity: [{ text: "Drafted challenge prompts and judging rubric", createdAt: ts(290) }],
        createdAt: ts(10400),
        updatedAt: ts(275),
        isFeatured: true,
      },
      {
        id: "community-startup-content-lab",
        ownerType: "community",
        title: "Startup Content Lab",
        summary: "Collaborative content sprint for founders sharing product progress updates.",
        description:
          "Founders and creators co-write launch notes, progress posts, and user update templates that are easier to read and ship consistently.",
        status: "review",
        discipline: "marketing",
        projectType: "standard",
        tags: ["startup", "content", "growth"],
        stack: ["Docs", "Content Templates"],
        goals: ["Improve clarity of progress updates", "Create reusable launch templates"],
        members: [
          { name: "Nora", role: "Marketing" },
          { name: "Devin", role: "Advisor" },
        ],
        milestones: [
          { title: "Template set v1", due: "2026-03-12", state: "done" },
          { title: "Community feedback pass", due: "2026-03-19", state: "doing" },
        ],
        activity: [{ text: "Collected founder feedback on update templates", createdAt: ts(240) }],
        createdAt: ts(11200),
        updatedAt: ts(205),
      },
      {
        id: "community-product-discovery-circle",
        ownerType: "community",
        title: "Product Discovery Circle",
        summary: "Peer group for validating feature ideas and prioritization decisions.",
        description:
          "A recurring collaboration group where teams share hypotheses, roadmap tradeoffs, and user feedback before implementation.",
        status: "completed",
        discipline: "product",
        projectType: "standard",
        tags: ["product", "discovery", "research"],
        stack: ["Research Notes", "Roadmap"],
        goals: ["Improve feature prioritization quality", "Reduce avoidable scope churn"],
        members: [
          { name: "Jordan", role: "Product" },
          { name: "Sam", role: "Facilitator" },
        ],
        milestones: [
          { title: "Discovery session series", due: "2026-03-02", state: "done" },
          { title: "Playbook summary", due: "2026-03-06", state: "done" },
        ],
        activity: [{ text: "Published final discovery session takeaways", createdAt: ts(980) }],
        createdAt: ts(14900),
        updatedAt: ts(960),
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
      {
        id: "shared-portfolio-case-studies",
        ownerType: "shared",
        title: "Portfolio Case Study Pack",
        summary: "Shared templates and writing framework for documenting project outcomes clearly.",
        description:
          "A collaborative resource that helps teams and individual creators package their projects into high-quality portfolio case studies.",
        status: "active",
        discipline: "marketing",
        projectType: "standard",
        tags: ["portfolio", "content", "case-study"],
        stack: ["Markdown", "Notion", "Figma"],
        goals: ["Standardize case study sections", "Improve story clarity for project outcomes"],
        members: [
          { name: "Tyler", role: "Owner" },
          { name: "Nora", role: "Content" },
        ],
        milestones: [
          { title: "Case study template draft", due: "2026-03-11", state: "done" },
          { title: "Peer review round", due: "2026-03-16", state: "doing" },
        ],
        activity: [{ text: "Added before/after structure guidance", createdAt: ts(130) }],
        createdAt: ts(7600),
        updatedAt: ts(85),
      },
      {
        id: "shared-figma-handbook",
        ownerType: "shared",
        title: "Figma Collaboration Handbook",
        summary: "Shared standards for file organization, naming, and handoff between design and dev.",
        description:
          "Practical operating guide for collaborative Figma work so contributors can move faster with fewer handoff issues.",
        status: "completed",
        discipline: "ops",
        projectType: "featured",
        tags: ["figma", "handoff", "collaboration"],
        stack: ["Figma", "Docs"],
        goals: ["Reduce file chaos", "Improve developer-ready design specs"],
        members: [
          { name: "Mia", role: "Design" },
          { name: "Alex", role: "Frontend" },
        ],
        milestones: [
          { title: "Naming conventions finalized", due: "2026-03-01", state: "done" },
          { title: "Handoff checklist adopted", due: "2026-03-04", state: "done" },
        ],
        activity: [{ text: "Handbook adopted by shared workspace teams", createdAt: ts(620) }],
        createdAt: ts(15400),
        updatedAt: ts(600),
        isFeatured: true,
      },
      {
        id: "shared-realestate-template-pack",
        ownerType: "shared",
        title: "Real Estate Site Template Pack",
        summary: "Shared starter templates for property listings, detail pages, and agent profiles.",
        description:
          "Cross-team template initiative so contributors can quickly prototype and present real estate website concepts with consistent quality.",
        status: "active",
        discipline: "dev",
        projectType: "featured",
        tags: ["real-estate", "templates", "frontend"],
        stack: ["HTML", "CSS", "JavaScript"],
        goals: ["Standardize page templates", "Improve handoff from design to code"],
        members: [
          { name: "Tyler", role: "Frontend" },
          { name: "Alex", role: "UI Engineer" },
        ],
        milestones: [
          { title: "Template library v1", due: "2026-03-13", state: "doing" },
          { title: "Shared documentation", due: "2026-03-19", state: "todo" },
        ],
        activity: [{ text: "Added standardized listing-detail template pair", createdAt: ts(145) }],
        createdAt: ts(9700),
        updatedAt: ts(90),
        isFeatured: true,
      },
      {
        id: "shared-figma-plugin-experiments",
        ownerType: "shared",
        title: "Figma Plugin Experiments",
        summary: "Shared experiments for automating repetitive design-system tasks in Figma.",
        description:
          "Team-led exploration of plugin workflows to automate naming, token syncing, and component quality checks.",
        status: "review",
        discipline: "design",
        projectType: "seeking",
        tags: ["figma", "plugin", "automation"],
        stack: ["Figma Plugins", "Scripting"],
        goals: ["Reduce manual design cleanup", "Improve consistency in handoff files"],
        members: [
          { name: "Mia", role: "Design Systems" },
          { name: "Devon", role: "Automation" },
        ],
        milestones: [
          { title: "Plugin prototype tests", due: "2026-03-16", state: "doing" },
          { title: "Adoption recommendation", due: "2026-03-22", state: "todo" },
        ],
        activity: [{ text: "Validated token-sync plugin behavior", createdAt: ts(220) }],
        createdAt: ts(10800),
        updatedAt: ts(175),
      },
      {
        id: "shared-release-retro-board",
        ownerType: "shared",
        title: "Release Retrospective Board",
        summary: "Shared board for release learnings, regressions, and follow-up actions.",
        description:
          "Operational collaboration board used by product, design, and engineering to capture release outcomes and improve the next cycle.",
        status: "active",
        discipline: "ops",
        projectType: "standard",
        tags: ["retro", "release", "operations"],
        stack: ["Kanban", "Runbook"],
        goals: ["Capture actionable release learnings", "Track remediation ownership"],
        members: [
          { name: "Sam", role: "Ops" },
          { name: "Jordan", role: "Product" },
        ],
        milestones: [
          { title: "Retro board structure", due: "2026-03-10", state: "done" },
          { title: "Action-item tracking rollout", due: "2026-03-17", state: "doing" },
        ],
        activity: [{ text: "Added post-release issue taxonomy", createdAt: ts(190) }],
        createdAt: ts(11700),
        updatedAt: ts(160),
      },
      {
        id: "shared-growth-experiment-library",
        ownerType: "shared",
        title: "Growth Experiment Library",
        summary: "Shared catalog of messaging and outreach experiments with outcomes.",
        description:
          "A collaborative repository of growth tests, hypotheses, and outcomes so teams can reuse proven tactics and avoid repeating failed tests.",
        status: "planned",
        discipline: "marketing",
        projectType: "standard",
        tags: ["growth", "experiments", "knowledge-base"],
        stack: ["Docs", "Analytics"],
        goals: ["Centralize growth learnings", "Improve experiment quality over time"],
        members: [
          { name: "Nora", role: "Growth" },
          { name: "Tyler", role: "Product" },
        ],
        milestones: [
          { title: "Experiment template spec", due: "2026-03-18", state: "todo" },
          { title: "Initial library population", due: "2026-03-25", state: "todo" },
        ],
        activity: [{ text: "Drafted scoring criteria for experiment outcomes", createdAt: ts(360) }],
        createdAt: ts(12300),
        updatedAt: ts(330),
      },
    ].map(normalizeProject);
  }

  function mergeMissingSeedProjects(projects) {
    const existing = toArray(projects).map(normalizeProject);
    const seen = new Set(existing.map((project) => project.id));
    const missing = seedProjects().filter((project) => !seen.has(project.id));
    if (!missing.length) return existing;
    return [...existing, ...missing];
  }

  function loadState() {
    let storedSeedVersion = 0;
    try {
      storedSeedVersion = Number(localStorage.getItem(PROJECTS_SEED_VERSION_KEY) || 0);
    } catch (_) {
      storedSeedVersion = 0;
    }

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
        localStorage.setItem(PROJECTS_SEED_VERSION_KEY, String(PROJECTS_SEED_VERSION));
      } catch (_) {
        // Best-effort persistence for demo mode.
      }
      return seeded;
    }

    let projects = raw.projects.map(normalizeProject);
    const mergedProjects = mergeMissingSeedProjects(projects);
    const hasNewSeedEntries = mergedProjects.length !== projects.length;
    projects = mergedProjects;

    if (hasNewSeedEntries || storedSeedVersion < PROJECTS_SEED_VERSION) {
      try {
        localStorage.setItem(PROJECTS_KEY, JSON.stringify({ projects }));
        localStorage.setItem(PROJECTS_SEED_VERSION_KEY, String(PROJECTS_SEED_VERSION));
      } catch (_) {
        // Best-effort persistence for demo mode.
      }
    }

    return { projects };
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

  function valueLabelForFilter(kind, value) {
    if (kind === "discipline") return DISCIPLINE_LABEL[value] || "All";
    if (kind === "status") return STATUS_LABEL[value] || "All";
    if (kind === "type") return TYPE_LABEL[value] || "All";
    return value;
  }

  function getActiveFilters() {
    const active = [];
    if (ui.filters.discipline !== "all") {
      active.push({
        kind: "discipline",
        label: FILTER_KIND_LABEL.discipline,
        value: ui.filters.discipline,
        valueLabel: valueLabelForFilter("discipline", ui.filters.discipline),
      });
    }
    if (ui.filters.status !== "all") {
      active.push({
        kind: "status",
        label: FILTER_KIND_LABEL.status,
        value: ui.filters.status,
        valueLabel: valueLabelForFilter("status", ui.filters.status),
      });
    }
    if (ui.filters.type !== "all") {
      active.push({
        kind: "type",
        label: FILTER_KIND_LABEL.type,
        value: ui.filters.type,
        valueLabel: valueLabelForFilter("type", ui.filters.type),
      });
    }

    const query = ui.search.trim();
    if (query) {
      active.push({
        kind: "search",
        label: FILTER_KIND_LABEL.search,
        value: query,
        valueLabel: query,
      });
    }

    return active;
  }

  function renderActiveFilters() {
    if (!els.projectsActiveFilters) return;

    const active = getActiveFilters();
    if (!active.length) {
      els.projectsActiveFilters.hidden = true;
      els.projectsActiveFilters.innerHTML = "";
      return;
    }

    const pills = active
      .map((item) => {
        const ariaLabel = `Remove ${item.label} filter: ${item.valueLabel}`;
        return `
          <button
            type="button"
            class="chip projects-active-pill"
            data-action="remove-filter"
            data-filter-kind="${escapeHTML(item.kind)}"
            aria-label="${escapeHTML(ariaLabel)}"
          >
            <span class="projects-active-pill-key">${escapeHTML(item.label)}</span>
            <span class="projects-active-pill-value">${escapeHTML(item.valueLabel)}</span>
            <span class="projects-active-pill-close" aria-hidden="true">×</span>
          </button>
        `;
      })
      .join("");

    els.projectsActiveFilters.hidden = false;
    els.projectsActiveFilters.innerHTML = `
      <span class="projects-active-label">Active filters</span>
      <div class="projects-active-pills" role="group" aria-label="Selected filters">
        ${pills}
      </div>
      <button
        type="button"
        class="btn subtle projects-active-clear"
        data-action="clear-filters"
        aria-label="Clear all filters"
      >
        Clear all
      </button>
    `;
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
    renderActiveFilters();
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
      const applied = getActiveFilters().map((item) => `${item.label}: ${item.valueLabel}`);

      const text = `${VIEW_LABEL[ui.view]} • ${ui.sort} sort${applied.length ? ` • ${applied.join(", ")}` : ""}`;
      els.projectsSavedView.textContent = text;
    }

    if (els.projectsMainHeading) {
      els.projectsMainHeading.textContent = `${VIEW_LABEL[ui.view]} workspace (${filteredList.length})`;
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
    const allowedValues = FILTER_OPTIONS[kind] || [];
    const nextValue = allowedValues.includes(value) ? value : "all";
    const opts = options || {};
    const shouldPersist = opts.persist !== false;
    const shouldRender = opts.render !== false;

    ui.filters[kind] = nextValue;

    const chips = toArray(els.filterButtonsByKind && els.filterButtonsByKind[kind]);
    chips.forEach((chip) => {
      chip.setAttribute("aria-pressed", String(chip.dataset.filterValue === nextValue));
    });

    if (shouldPersist) saveUi();
    if (shouldRender) renderProjects();
  }

  function removeActiveFilter(kind) {
    if (kind === "search") {
      clearTimeout(searchTimer);
      ui.search = "";
      if (els.projectsSearch) els.projectsSearch.value = "";
      saveUi();
      renderProjects();
      return;
    }

    if (!FILTER_OPTIONS[kind]) return;
    setFilter(kind, "all");
  }

  function clearAllFilters() {
    resetUiState({ preserveView: true });
  }

  function resetUiState(options) {
    const opts = options || {};
    const preserveView = opts.preserveView !== false;
    const nextView = preserveView ? ui.view : DEFAULT_UI.view;

    clearTimeout(searchTimer);
    ui = { ...DEFAULT_UI, view: nextView, filters: { ...DEFAULT_UI.filters } };
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
        const kind = btn.dataset.filterKind;
        const value = btn.dataset.filterValue;
        if (!kind || !value) return;
        const isSameSelection = ui.filters[kind] === value;
        const nextValue = isSameSelection && value !== "all" ? "all" : value;
        setFilter(kind, nextValue);
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
      els.resetProjectsUiBtn.addEventListener("click", clearAllFilters);
    }

    if (els.projectsEmptyResetBtn) {
      els.projectsEmptyResetBtn.addEventListener("click", clearAllFilters);
    }

    if (els.projectsActiveFilters) {
      els.projectsActiveFilters.addEventListener("click", (event) => {
        const btn = event.target.closest("button[data-action]");
        if (!btn) return;

        if (btn.dataset.action === "remove-filter") {
          const kind = btn.dataset.filterKind;
          if (kind) removeActiveFilter(kind);
          return;
        }

        if (btn.dataset.action === "clear-filters") {
          clearAllFilters();
        }
      });
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
    els.projectsActiveFilters = document.getElementById("projectsActiveFilters");

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
