const API_BASE = "";
const ENTRY_REFRESH_MS = 30 * 1000;
const MEDAL_REFRESH_MS = 5 * 60 * 1000;

const ALL_COUNTRIES = [
  "Albania",
  "American Samoa",
  "Andorra",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Belarus",
  "Belgium",
  "Bolivia",
  "Bosnia and Herzegovina",
  "Brazil",
  "Bulgaria",
  "Canada",
  "Chile",
  "China",
  "Chinese Taipei",
  "Colombia",
  "Croatia",
  "Cyprus",
  "Czech Republic",
  "Denmark",
  "Ecuador",
  "Eritrea",
  "Estonia",
  "Finland",
  "France",
  "Georgia",
  "Germany",
  "Ghana",
  "Great Britain",
  "Greece",
  "Haiti",
  "Hong Kong",
  "Hungary",
  "Iceland",
  "India",
  "Iran",
  "Ireland",
  "Israel",
  "Italy",
  "Jamaica",
  "Japan",
  "Kazakhstan",
  "Kosovo",
  "Kyrgyzstan",
  "Latvia",
  "Lebanon",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Madagascar",
  "Malaysia",
  "Malta",
  "Mexico",
  "Moldova",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Morocco",
  "Netherlands",
  "New Zealand",
  "Nigeria",
  "North Macedonia",
  "Norway",
  "Pakistan",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Puerto Rico",
  "ROC",
  "Romania",
  "San Marino",
  "Saudi Arabia",
  "Serbia",
  "Slovakia",
  "Slovenia",
  "South Korea",
  "Spain",
  "Sweden",
  "Switzerland",
  "Thailand",
  "Timor-Leste",
  "Trinidad and Tobago",
  "Turkey",
  "Ukraine",
  "United States",
  "Uzbekistan",
  "Virgin Islands",
];

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

const FLAG_CDN_BASE = "https://flagcdn.com";
const OLYMPIC_FLAG_URL =
  "https://upload.wikimedia.org/wikipedia/commons/5/5c/Olympic_flag.svg";
const FALLBACK_FLAG_SVG = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="18" viewBox="0 0 24 18"><rect width="24" height="18" rx="3" fill="#e2e8f0"/><path d="M0 6h24v6H0z" fill="#cbd5f5"/></svg>'
)}`;

const TIER_1 = [
  "Norway",
  "Germany",
  "United States",
  "Canada",
  "Netherlands",
  "Austria",
  "Switzerland",
  "Sweden",
  "France",
  "ROC",
  "China",
  "Japan",
  "Italy",
];

const TIER_2 = [
  "South Korea",
  "Great Britain",
  "Finland",
  "Czech Republic",
  "Slovakia",
  "Slovenia",
  "Poland",
  "Latvia",
  "Ukraine",
  "Belarus",
  "Australia",
  "New Zealand",
  "Hungary",
  "Belgium",
  "Spain",
];

const TIER_3 = [
  "Kazakhstan",
  "Georgia",
  "Estonia",
  "Lithuania",
  "Romania",
  "Serbia",
  "Croatia",
  "Bulgaria",
  "Greece",
  "Turkey",
  "Argentina",
  "Brazil",
  "Chile",
  "Mexico",
  "Israel",
  "Ireland",
  "Iceland",
  "Andorra",
  "Liechtenstein",
  "Monaco",
];

const TIER_4 = [
  "Armenia",
  "Azerbaijan",
  "Bosnia and Herzegovina",
  "Colombia",
  "Cyprus",
  "Denmark",
  "Hong Kong",
  "India",
  "Iran",
  "Jamaica",
  "Lebanon",
  "Luxembourg",
  "Moldova",
  "Mongolia",
  "Montenegro",
  "Morocco",
  "North Macedonia",
  "Portugal",
  "Puerto Rico",
  "San Marino",
  "Saudi Arabia",
  "Thailand",
  "Trinidad and Tobago",
  "Uzbekistan",
  "Chinese Taipei",
];

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
let maxMembers = 10;
let editingEntryId = null;
let isFetchingMedals = false;
let isLoadingEntries = false;

const tierConfig = buildTiers();

document.addEventListener("DOMContentLoaded", () => {
  renderTierSelects();
  renderTierReference();
  renderEntries();
  renderStandings();
  renderCountryPoints();
  updateEntryCount();
  initThemeToggle();

  document
    .getElementById("entry-form")
    .addEventListener("submit", handleEntrySubmit);
  document.getElementById("reset-form").addEventListener("click", resetForm);
  document
    .getElementById("refresh-button")
    .addEventListener("click", handleRefreshClick);

  document
    .getElementById("admin-form")
    .addEventListener("submit", handleAdminSubmit);
  document
    .getElementById("admin-unlock")
    .addEventListener("click", handleAdminUnlock);

  loadEntries();
  loadMedals();

  setInterval(loadEntries, ENTRY_REFRESH_MS);
  setInterval(loadMedals, MEDAL_REFRESH_MS);
  setInterval(updateRefreshStatus, 60 * 1000);
});

function buildTiers() {
  const assigned = new Set([...TIER_1, ...TIER_2, ...TIER_3, ...TIER_4]);
  const tier5 = ALL_COUNTRIES.filter((country) => !assigned.has(country));

  return [
    {
      id: "tier-1",
      label: "Tier 1: Medal favorites",
      description: "Most likely to medal often.",
      countries: [...TIER_1].sort(),
    },
    {
      id: "tier-2",
      label: "Tier 2: Strong contenders",
      description: "Regular medal contenders.",
      countries: [...TIER_2].sort(),
    },
    {
      id: "tier-3",
      label: "Tier 3: Midfield",
      description: "Occasional medal winners and deep teams.",
      countries: [...TIER_3].sort(),
    },
    {
      id: "tier-4",
      label: "Tier 4: Emerging programs",
      description: "Developing winter sports programs.",
      countries: [...TIER_4].sort(),
    },
    {
      id: "tier-5",
      label: "Tier 5: Longshots",
      description: "Least likely to medal.",
      countries: tier5.sort(),
    },
  ];
}

function renderTierSelects() {
  const container = document.getElementById("tier-selects");
  container.innerHTML = "";
  tierConfig.forEach((tier) => {
    const label = document.createElement("label");
    label.textContent = tier.label;

    const select = document.createElement("select");
    select.required = true;
    select.dataset.tierId = tier.id;

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select a country";
    select.appendChild(placeholder);

    tier.countries.forEach((country) => {
      const option = document.createElement("option");
      option.value = country;
      option.textContent = country;
      select.appendChild(option);
    });

    label.appendChild(select);
    container.appendChild(label);
  });
}

function renderTierReference() {
  const container = document.getElementById("tiers-list");
  container.innerHTML = "";
  tierConfig.forEach((tier) => {
    const card = document.createElement("div");
    card.className = "tier-card";
    const header = document.createElement("h3");
    header.textContent = tier.label;
    const desc = document.createElement("p");
    desc.className = "muted";
    desc.textContent = tier.description;

    const list = document.createElement("ul");
    tier.countries.forEach((country) => {
      const item = document.createElement("li");
      item.appendChild(createCountryLabel(country));
      list.appendChild(item);
    });

    card.appendChild(header);
    card.appendChild(desc);
    card.appendChild(list);
    container.appendChild(card);
  });
}

async function loadEntries() {
  if (isLoadingEntries) return;
  isLoadingEntries = true;
  renderEntries();
  try {
    const data = await apiRequest("/api/entries");
    entries = data.entries || [];
    lockStatus = { locked: data.locked, deadline: data.deadline || null };
    if (Number.isFinite(data.maxMembers)) {
      maxMembers = data.maxMembers;
    }
    updateEntryCount();
    updateLockStatusUI();
    syncAdminDeadline();
  } catch (error) {
    console.error(error);
    setFormMessage("Unable to load entries right now.", "error");
  } finally {
    isLoadingEntries = false;
    renderEntries();
    renderStandings();
  }
}

async function loadMedals() {
  if (isFetchingMedals) return;
  isFetchingMedals = true;
  updateRefreshStatus();
  setFetchMessage("Fetching latest medal table...");

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
  } finally {
    isFetchingMedals = false;
    updateRefreshStatus();
  }
}

function updateMedalSource() {
  const link = document.getElementById("medal-source-link");
  if (!link) return;
  if (medalMeta.sourceUrl) {
    link.href = medalMeta.sourceUrl;
  }
  link.textContent = medalMeta.sourceLabel || "Medal table source";
}

function handleRefreshClick() {
  const remaining = medalMeta.nextRefreshAt
    ? Math.max(0, medalMeta.nextRefreshAt - Date.now())
    : 0;
  if (remaining > 0) {
    setFetchMessage("Refresh available once per hour.");
    return;
  }
  loadMedals();
}

async function handleEntrySubmit(event) {
  event.preventDefault();
  if (lockStatus.locked) {
    return setFormMessage("Entries are locked.", "error");
  }

  const memberName = document.getElementById("member-name").value.trim();
  const teamName = document.getElementById("team-name").value.trim();
  const selections = getSelections();

  if (!memberName || !teamName) {
    return setFormMessage("Please enter member and team names.", "error");
  }

  if (!selectionsComplete(selections)) {
    return setFormMessage("Please select one country per tier.", "error");
  }

  try {
    if (editingEntryId) {
      await apiRequest(`/api/entries/${editingEntryId}`, {
        method: "PUT",
        body: JSON.stringify({ memberName, teamName, picks: selections }),
      });
    } else {
      await apiRequest("/api/entries", {
        method: "POST",
        body: JSON.stringify({ memberName, teamName, picks: selections }),
      });
    }
    resetForm();
    setFormMessage("Entry saved.", "success");
    await loadEntries();
  } catch (error) {
    setFormMessage(error.message || "Unable to save entry.", "error");
  }
}

function getSelections() {
  const selections = {};
  tierConfig.forEach((tier) => {
    const select = document.querySelector(`select[data-tier-id="${tier.id}"]`);
    selections[tier.id] = select.value;
  });
  return selections;
}

function selectionsComplete(selections) {
  return tierConfig.every((tier) => selections[tier.id]);
}

function resetForm() {
  editingEntryId = null;
  document.getElementById("entry-form").reset();
  setFormMessage("");
}

function setFormMessage(message, type) {
  const messageEl = document.getElementById("form-message");
  messageEl.textContent = message;
  messageEl.className = "message";
  if (type === "error") {
    messageEl.classList.add("message--error");
  }
  if (type === "success") {
    messageEl.classList.add("message--success");
  }
}

function setLockMessage(message, type) {
  const messageEl = document.getElementById("lock-message");
  messageEl.textContent = message;
  messageEl.className = "message";
  if (type === "error") {
    messageEl.classList.add("message--error");
  }
}

function renderEntries() {
  const container = document.getElementById("entries-list");
  container.innerHTML = "";

  if (isLoadingEntries) {
    const loading = document.createElement("p");
    loading.className = "muted";
    loading.textContent = "Loading entries...";
    container.appendChild(loading);
    return;
  }

  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = `No entries yet. Add up to ${maxMembers} pool members above.`;
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

    const actions = document.createElement("div");
    actions.className = "entry-actions";
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "button--secondary";
    editButton.textContent = "Edit";
    editButton.disabled = lockStatus.locked;
    editButton.addEventListener("click", () => editEntry(entry.id));

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "button--secondary";
    removeButton.textContent = "Remove";
    removeButton.disabled = lockStatus.locked;
    removeButton.addEventListener("click", () => removeEntry(entry.id));

    actions.appendChild(editButton);
    actions.appendChild(removeButton);
    header.appendChild(title);
    header.appendChild(actions);

    const meta = document.createElement("div");
    meta.className = "entry-meta";
    const totalPoints = calculateEntryPoints(entry);
    meta.textContent = `🏅 Points: ${totalPoints}`;

    const picks = document.createElement("div");
    picks.className = "entry-picks";
    tierConfig.forEach((tier) => {
      const row = document.createElement("div");
      row.className = "entry-pick";
      const pick = entry.picks[tier.id];
      row.appendChild(document.createTextNode(`${tier.label}: `));
      if (pick) {
        row.appendChild(createCountryLabel(pick));
      } else {
        row.appendChild(document.createTextNode("-"));
      }
      picks.appendChild(row);
    });

    card.appendChild(header);
    card.appendChild(meta);
    card.appendChild(picks);
    container.appendChild(card);
  });
}

function editEntry(entryId) {
  const entry = entries.find((item) => item.id === entryId);
  if (!entry) return;

  editingEntryId = entryId;
  document.getElementById("member-name").value = entry.memberName;
  document.getElementById("team-name").value = entry.teamName;
  tierConfig.forEach((tier) => {
    const select = document.querySelector(`select[data-tier-id="${tier.id}"]`);
    select.value = entry.picks[tier.id] || "";
  });
  setFormMessage("Editing entry. Save to apply changes.");
}

async function removeEntry(entryId) {
  if (lockStatus.locked) {
    setFormMessage("Entries are locked.", "error");
    return;
  }

  try {
    await apiRequest(`/api/entries/${entryId}`, { method: "DELETE" });
    await loadEntries();
  } catch (error) {
    setFormMessage(error.message || "Unable to remove entry.", "error");
  }
}

function updateEntryCount() {
  const badge = document.getElementById("entry-count");
  badge.textContent = `${entries.length} / ${maxMembers} entries used`;
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
    const countries = getEntryPicksInOrder(entry);
    countriesCell.appendChild(createCountryList(countries));
    row.appendChild(countriesCell);

    tbody.appendChild(row);
  });
}

function renderCountryPoints() {
  const tbody = document.querySelector("#countries-table tbody");
  tbody.innerHTML = "";

  const rows = ALL_COUNTRIES.map((country) => {
    const record = medalData[country] || {
      gold: 0,
      silver: 0,
      bronze: 0,
      points: 0,
    };
    return { country, ...record };
  }).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return a.country.localeCompare(b.country);
  });

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    const countryCell = document.createElement("td");
    countryCell.appendChild(createCountryLabel(row.country));
    tr.appendChild(countryCell);
    tr.appendChild(createCell(row.gold));
    tr.appendChild(createCell(row.silver));
    tr.appendChild(createCell(row.bronze));
    tr.appendChild(createCell(row.points));
    tbody.appendChild(tr);
  });
}

function calculateEntryPoints(entry) {
  return Object.values(entry.picks).reduce((total, country) => {
    return total + (medalData[country]?.points || 0);
  }, 0);
}

function updateMedalDisplays() {
  renderStandings();
  renderCountryPoints();
  updateRefreshStatus();
}

function updateRefreshStatus() {
  const lastUpdatedEl = document.getElementById("last-updated");
  const nextRefreshEl = document.getElementById("next-refresh");
  const refreshButton = document.getElementById("refresh-button");

  if (medalMeta.lastUpdated) {
    lastUpdatedEl.textContent = formatTimestamp(medalMeta.lastUpdated);
  } else {
    lastUpdatedEl.textContent = "Never";
  }

  const remaining = medalMeta.nextRefreshAt
    ? Math.max(0, medalMeta.nextRefreshAt - Date.now())
    : 0;

  if (remaining === 0) {
    nextRefreshEl.textContent = "Ready";
    refreshButton.disabled = isFetchingMedals;
  } else {
    nextRefreshEl.textContent = formatDuration(remaining);
    refreshButton.disabled = true;
  }
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

  setLockMessage(
    locked ? "Entries are locked. Viewing only." : "",
    locked ? "error" : ""
  );
  toggleEntryForm(!locked);
}

function toggleEntryForm(enabled) {
  const form = document.getElementById("entry-form");
  const controls = form.querySelectorAll("input, select, button");
  controls.forEach((control) => {
    control.disabled = !enabled;
  });
}

function setFetchMessage(message) {
  const el = document.getElementById("fetch-message");
  el.textContent = message;
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

async function handleAdminSubmit(event) {
  event.preventDefault();
  const token = document.getElementById("admin-token").value.trim();
  const deadlineValue = document.getElementById("admin-deadline").value;
  const lockNow = document.getElementById("admin-lock-now").checked;

  if (!token) {
    return setAdminMessage("Admin token is required.", "error");
  }

  const payload = { locked: lockNow };
  if (deadlineValue) {
    payload.deadline = new Date(deadlineValue).toISOString();
  } else {
    payload.deadline = null;
  }

  try {
    await apiRequest("/api/admin/lock", {
      method: "POST",
      headers: { "x-admin-token": token },
      body: JSON.stringify(payload),
    });
    setAdminMessage("Admin settings updated.", "success");
    document.getElementById("admin-lock-now").checked = false;
    await loadEntries();
  } catch (error) {
    setAdminMessage(error.message || "Unable to update admin settings.", "error");
  }
}

async function handleAdminUnlock() {
  const token = document.getElementById("admin-token").value.trim();
  if (!token) {
    return setAdminMessage("Admin token is required.", "error");
  }

  try {
    await apiRequest("/api/admin/lock", {
      method: "POST",
      headers: { "x-admin-token": token },
      body: JSON.stringify({ locked: false, deadline: null }),
    });
    setAdminMessage("Pool unlocked and deadline cleared.", "success");
    await loadEntries();
  } catch (error) {
    setAdminMessage(error.message || "Unable to unlock pool.", "error");
  }
}

function setAdminMessage(message, type) {
  const messageEl = document.getElementById("admin-message");
  messageEl.textContent = message;
  messageEl.className = "message";
  if (type === "error") {
    messageEl.classList.add("message--error");
  }
  if (type === "success") {
    messageEl.classList.add("message--success");
  }
}

function syncAdminDeadline() {
  const input = document.getElementById("admin-deadline");
  if (!input || document.activeElement === input) return;
  if (!lockStatus.deadline) {
    input.value = "";
    return;
  }
  input.value = toLocalDatetimeValue(lockStatus.deadline);
}

function toLocalDatetimeValue(isoString) {
  const date = new Date(isoString);
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getEntryPicksInOrder(entry) {
  return tierConfig
    .map((tier) => entry.picks[tier.id])
    .filter((country) => Boolean(country));
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
  wrapper.appendChild(createFlagImage(country));
  const name = document.createElement("span");
  name.textContent = country;
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
  if (country === "ROC") return OLYMPIC_FLAG_URL;
  const code = COUNTRY_CODES[country];
  if (code) return `${FLAG_CDN_BASE}/${code}.svg`;
  return FALLBACK_FLAG_SVG;
}

async function apiRequest(path, options = {}) {
  const config = {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  };

  const response = await fetch(`${API_BASE}${path}`, config);
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
