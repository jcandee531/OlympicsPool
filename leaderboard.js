const API_BASE = "";
const ENTRY_REFRESH_MS = 30 * 1000;
const MEDAL_REFRESH_MS = 5 * 60 * 1000;

const TIER_LABELS = {
  "tier-1": "Tier 1",
  "tier-2": "Tier 2",
  "tier-3": "Tier 3",
  "tier-4": "Tier 4",
  "tier-5": "Tier 5",
};

const TIER_ORDER = ["tier-1", "tier-2", "tier-3", "tier-4", "tier-5"];

const COUNTRY_CODES = {
  Albania: "al",
  "American Samoa": "as",
  Andorra: "ad",
  Argentina: "ar",
  Armenia: "am",
  Australia: "au",
  Austria: "at",
  Azerbaijan: "az",
  Belarus: "by",
  Belgium: "be",
  Bolivia: "bo",
  "Bosnia and Herzegovina": "ba",
  Brazil: "br",
  Bulgaria: "bg",
  Canada: "ca",
  Chile: "cl",
  China: "cn",
  "Chinese Taipei": "tw",
  Colombia: "co",
  Croatia: "hr",
  Cyprus: "cy",
  "Czech Republic": "cz",
  Denmark: "dk",
  Ecuador: "ec",
  Eritrea: "er",
  Estonia: "ee",
  Finland: "fi",
  France: "fr",
  Georgia: "ge",
  Germany: "de",
  Ghana: "gh",
  "Great Britain": "gb",
  Greece: "gr",
  Haiti: "ht",
  "Hong Kong": "hk",
  Hungary: "hu",
  Iceland: "is",
  India: "in",
  Iran: "ir",
  Ireland: "ie",
  Israel: "il",
  Italy: "it",
  Jamaica: "jm",
  Japan: "jp",
  Kazakhstan: "kz",
  Kosovo: "xk",
  Kyrgyzstan: "kg",
  Latvia: "lv",
  Lebanon: "lb",
  Liechtenstein: "li",
  Lithuania: "lt",
  Luxembourg: "lu",
  Madagascar: "mg",
  Malaysia: "my",
  Malta: "mt",
  Mexico: "mx",
  Moldova: "md",
  Monaco: "mc",
  Mongolia: "mn",
  Montenegro: "me",
  Morocco: "ma",
  Netherlands: "nl",
  "New Zealand": "nz",
  Nigeria: "ng",
  "North Macedonia": "mk",
  Norway: "no",
  Pakistan: "pk",
  Peru: "pe",
  Philippines: "ph",
  Poland: "pl",
  Portugal: "pt",
  "Puerto Rico": "pr",
  ROC: "",
  Romania: "ro",
  "San Marino": "sm",
  "Saudi Arabia": "sa",
  Serbia: "rs",
  Slovakia: "sk",
  Slovenia: "si",
  "South Korea": "kr",
  Spain: "es",
  Sweden: "se",
  Switzerland: "ch",
  Thailand: "th",
  "Timor-Leste": "tl",
  "Trinidad and Tobago": "tt",
  Turkey: "tr",
  Ukraine: "ua",
  "United States": "us",
  Uzbekistan: "uz",
  "Virgin Islands": "vi",
};

const COUNTRY_ALIASES = {
  "People's Republic of China": "China",
  "Republic of Korea": "South Korea",
  Korea: "South Korea",
  "Russian Olympic Committee": "ROC",
  "United States of America": "United States",
  "Great Britain and Northern Ireland": "Great Britain",
  "Chinese Taipei (TPE)": "Chinese Taipei",
  "Timor Leste": "Timor-Leste",
  "Hong Kong, China": "Hong Kong",
  "Virgin Islands, U.S.": "Virgin Islands",
  Czechia: "Czech Republic",
};

const FLAG_CDN_BASE = "https://flagcdn.com";
const OLYMPIC_FLAG_URL =
  "https://upload.wikimedia.org/wikipedia/commons/5/5c/Olympic_flag.svg";
const FALLBACK_FLAG_SVG = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="18" viewBox="0 0 24 18"><rect width="24" height="18" rx="3" fill="#e2e8f0"/><path d="M0 6h24v6H0z" fill="#cbd5f5"/></svg>'
)}`;

let entries = [];
let medalData = {};
let medalLookup = {};
let medalMeta = {
  lastUpdated: null,
  nextRefreshMs: 0,
  nextRefreshAt: null,
  sourceUrl: "",
  sourceLabel: "",
  stale: false,
};
let lockStatus = { locked: false, deadline: null };

document.addEventListener("DOMContentLoaded", () => {
  loadEntries();
  loadMedals();
  initThemeToggle();

  setInterval(loadEntries, ENTRY_REFRESH_MS);
  setInterval(loadMedals, MEDAL_REFRESH_MS);
  setInterval(updateRefreshStatus, 60 * 1000);
});

async function loadEntries() {
  try {
    const data = await apiRequest("/api/entries");
    entries = data.entries || [];
    lockStatus = { locked: data.locked, deadline: data.deadline || null };
    renderEntries();
    renderStandings();
    updateEntryCount();
    updateLockStatusUI();
  } catch (error) {
    console.error(error);
  }
}

async function loadMedals() {
  try {
    const data = await apiRequest("/api/medals");
    medalData = data.data || {};
    const nextRefreshMs = data.nextRefreshMs || 0;
    medalMeta = {
      lastUpdated: data.lastUpdated,
      nextRefreshMs,
      nextRefreshAt: nextRefreshMs ? Date.now() + nextRefreshMs : null,
      sourceUrl: data.sourceUrl || "",
      sourceLabel: data.sourceLabel || "Medal table source",
      stale: Boolean(data.stale),
    };
    updateMedalSource();
    updateMedalDisplays();
    setFetchMessage(
      medalMeta.stale
        ? "Using cached medal data (source temporarily unavailable)."
        : "Medal table updated."
    );
  } catch (error) {
    console.error(error);
    setFetchMessage("Unable to fetch medal data right now.");
  }
}

function renderEntries() {
  const container = document.getElementById("entries-list");
  container.innerHTML = "";

  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No entries yet.";
    container.appendChild(empty);
    return;
  }

  entries.forEach((entry) => {
    const card = document.createElement("div");
    card.className = "entry-card";

    const header = document.createElement("div");
    header.className = "entry-card__header";

    const title = document.createElement("div");
    const nameStrong = document.createElement("strong");
    nameStrong.textContent = entry.memberName;
    title.appendChild(nameStrong);
    title.appendChild(document.createTextNode(` • ${entry.teamName}`));

    const meta = document.createElement("div");
    meta.className = "entry-meta";
    const totalPoints = calculateEntryPoints(entry);
    meta.textContent = `🏅 Points: ${totalPoints}`;

    const picks = document.createElement("div");
    picks.className = "entry-picks";
    TIER_ORDER.forEach((tier) => {
      const country = entry.picks?.[tier];
      if (!country) return;
      const row = document.createElement("div");
      row.className = "entry-pick";
      row.appendChild(document.createTextNode(`${TIER_LABELS[tier] || tier}: `));
      row.appendChild(createCountryLabel(country));
      picks.appendChild(row);
    });

    header.appendChild(title);
    card.appendChild(header);
    card.appendChild(meta);
    card.appendChild(picks);
    container.appendChild(card);
  });
}

function renderStandings() {
  const tbody = document.querySelector("#standings-table tbody");
  tbody.innerHTML = "";

  if (!entries.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.className = "muted";
    cell.textContent = "No entries yet.";
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  const standings = entries
    .map((entry) => ({
      ...entry,
      points: calculateEntryPoints(entry),
    }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return a.teamName.localeCompare(b.teamName);
    });

  standings.forEach((entry, index) => {
    const row = document.createElement("tr");
    row.appendChild(createCell(index + 1));
    row.appendChild(createCell(entry.memberName));
    row.appendChild(createCell(entry.teamName));
    row.appendChild(createCell(entry.points));

    const countriesCell = document.createElement("td");
    countriesCell.appendChild(
      createCountryList(getEntryPicksInOrder(entry))
    );
    row.appendChild(countriesCell);
    tbody.appendChild(row);
  });
}

function calculateEntryPoints(entry) {
  return Object.values(entry.picks || {}).reduce((total, country) => {
    const normalized = sanitizeCountryName(country);
    const record = medalLookup[normalized] || medalData[normalized];
    return total + (record?.points || 0);
  }, 0);
}

function updateEntryCount() {
  const badge = document.getElementById("entry-count");
  badge.textContent = `${entries.length} entries`;
}

function updateMedalDisplays() {
  buildMedalLookup();
  renderStandings();
  updateRefreshStatus();
}

function updateMedalSource() {
  const link = document.getElementById("medal-source-link");
  if (!link) return;
  if (medalMeta.sourceUrl) {
    link.href = medalMeta.sourceUrl;
  }
  link.textContent = medalMeta.sourceLabel || "Medal table source";
}

function updateRefreshStatus() {
  const lastUpdatedEl = document.getElementById("last-updated");
  const nextRefreshEl = document.getElementById("next-refresh");

  if (medalMeta.lastUpdated) {
    lastUpdatedEl.textContent = formatTimestamp(medalMeta.lastUpdated);
  } else {
    lastUpdatedEl.textContent = "Never";
  }

  const remaining = medalMeta.nextRefreshAt
    ? Math.max(0, medalMeta.nextRefreshAt - Date.now())
    : 0;
  nextRefreshEl.textContent =
    remaining === 0 ? "Ready" : formatDuration(remaining);
}

function updateLockStatusUI() {
  const badge = document.getElementById("lock-badge");
  const deadlineLabel = document.getElementById("lock-deadline");
  const locked = Boolean(lockStatus.locked);

  badge.textContent = locked ? "Locked" : "Open";
  badge.className = `badge ${locked ? "badge--danger" : "badge--success"}`;

  deadlineLabel.textContent = lockStatus.deadline
    ? `Deadline: ${formatTimestamp(lockStatus.deadline)}`
    : "No deadline set";
}

function setFetchMessage(message) {
  const el = document.getElementById("fetch-message");
  el.textContent = message;
}

function getEntryPicksInOrder(entry) {
  return TIER_ORDER.map((tier) => entry.picks?.[tier]).filter(Boolean);
}

function createCell(value) {
  const cell = document.createElement("td");
  cell.textContent = value;
  return cell;
}

function createCountryList(countries) {
  const list = document.createElement("div");
  list.className = "country-list";
  countries.forEach((country) => {
    list.appendChild(createCountryLabel(country));
  });
  return list;
}

function createCountryLabel(country) {
  const wrapper = document.createElement("span");
  wrapper.className = "country-label";
  const displayName = sanitizeCountryName(country) || String(country).trim();
  wrapper.appendChild(createFlagImage(displayName));
  const name = document.createElement("span");
  name.textContent = displayName;
  wrapper.appendChild(name);
  return wrapper;
}

function createFlagImage(country) {
  const img = document.createElement("img");
  img.className = "flag-icon";
  img.alt = `${country} flag`;
  img.loading = "lazy";
  img.decoding = "async";
  img.referrerPolicy = "no-referrer";
  img.src = getFlagUrl(country);
  return img;
}

function getFlagUrl(country) {
  const normalized = sanitizeCountryName(country);
  if (normalized === "ROC") return OLYMPIC_FLAG_URL;
  const code = COUNTRY_CODES[normalized];
  if (code) return `${FLAG_CDN_BASE}/${code}.svg`;
  return FALLBACK_FLAG_SVG;
}

function buildMedalLookup() {
  medalLookup = {};
  Object.entries(medalData).forEach(([country, record]) => {
    const normalized = sanitizeCountryName(country);
    if (!normalized) return;
    medalLookup[normalized] = record;
  });
}

function sanitizeCountryName(name) {
  if (!name) return "";
  let cleaned = String(name);
  cleaned = cleaned.replace(
    /^[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]\s*/u,
    ""
  );
  cleaned = cleaned.replace(/^[^A-Za-z0-9]+/, "");
  cleaned = cleaned.replace(/[*\u2020\u2021]/g, "");
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return COUNTRY_ALIASES[cleaned] || cleaned;
}

function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString();
}

function formatDuration(milliseconds) {
  const minutes = Math.ceil(milliseconds / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

async function apiRequest(path) {
  const response = await fetch(`${API_BASE}${path}`);
  let data = {};
  try {
    data = await response.json();
  } catch (error) {
    data = {};
  }
  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }
  return data;
}

function initThemeToggle() {
  const toggle = document.getElementById("theme-toggle");
  if (!toggle) return;

  const stored = localStorage.getItem("pool-theme");
  let currentTheme = stored || "system";
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  const resolveTheme = (theme) =>
    theme === "system" ? (media.matches ? "dark" : "light") : theme;

  const applyTheme = (theme) => {
    currentTheme = theme;
    const resolved = resolveTheme(theme);
    document.documentElement.setAttribute("data-theme", resolved);
    toggle.textContent =
      resolved === "dark" ? "☀️ Light mode" : "🌙 Dark mode";
    if (theme === "system") {
      localStorage.removeItem("pool-theme");
    } else {
      localStorage.setItem("pool-theme", theme);
    }
  };

  toggle.addEventListener("click", () => {
    const next = resolveTheme(currentTheme) === "dark" ? "light" : "dark";
    applyTheme(next);
  });

  media.addEventListener("change", () => {
    if (!localStorage.getItem("pool-theme")) {
      applyTheme("system");
    }
  });

  applyTheme(currentTheme);
}

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
