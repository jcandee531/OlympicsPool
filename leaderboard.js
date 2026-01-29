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

let entries = [];
let medalData = {};
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
    title.innerHTML = `<strong>${escapeHTML(
      entry.memberName
    )}</strong> • ${escapeHTML(entry.teamName)}`;

    const meta = document.createElement("div");
    meta.className = "entry-meta";
    const totalPoints = calculateEntryPoints(entry);
    meta.textContent = `Points: ${totalPoints}`;

    const picks = document.createElement("div");
    picks.className = "entry-picks";
    TIER_ORDER.forEach((tier) => {
      const country = entry.picks?.[tier];
      if (!country) return;
      const row = document.createElement("div");
      row.textContent = `${TIER_LABELS[tier] || tier}: ${formatCountryLabel(
        country
      )}`;
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
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${escapeHTML(entry.memberName)}</td>
      <td>${escapeHTML(entry.teamName)}</td>
      <td>${entry.points}</td>
      <td>${escapeHTML(
        Object.values(entry.picks)
          .map((country) => formatCountryLabel(country))
          .join(", ")
      )}</td>
    `;
    tbody.appendChild(row);
  });
}

function calculateEntryPoints(entry) {
  return Object.values(entry.picks || {}).reduce((total, country) => {
    return total + (medalData[country]?.points || 0);
  }, 0);
}

function updateEntryCount() {
  const badge = document.getElementById("entry-count");
  badge.textContent = `${entries.length} entries`;
}

function updateMedalDisplays() {
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

function formatCountryLabel(country) {
  const flag = getFlagEmoji(country);
  return flag ? `${flag} ${country}` : country;
}

function getFlagEmoji(country) {
  const code = COUNTRY_CODES[country];
  if (!code) return "🏳️";
  return isoToFlagEmoji(code);
}

function isoToFlagEmoji(code) {
  if (!code || code.length !== 2) return "";
  return code
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
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

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
