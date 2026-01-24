const MEDAL_SOURCE_URL =
  "https://en.wikipedia.org/api/rest_v1/page/html/2022_Winter_Olympics_medal_table";
const MEDAL_SOURCE_LABEL =
  "Wikipedia 2022 Winter Olympics medal table (REST API)";
const REFRESH_INTERVAL_MS = 60 * 60 * 1000;
const MAX_MEMBERS = 10;

const POINT_VALUES = {
  gold: 3,
  silver: 2,
  bronze: 1,
};

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

const COUNTRY_ALIASES = {
  "People's Republic of China": "China",
  "Republic of Korea": "South Korea",
  "Korea": "South Korea",
  "Russian Olympic Committee": "ROC",
  "United States of America": "United States",
  "Great Britain and Northern Ireland": "Great Britain",
  "Chinese Taipei (TPE)": "Chinese Taipei",
  "Timor Leste": "Timor-Leste",
  "Hong Kong, China": "Hong Kong",
  "Virgin Islands, U.S.": "Virgin Islands",
  "Czechia": "Czech Republic",
};

const STORAGE_KEYS = {
  entries: "winter-olympics-pool-entries",
  medals: "winter-olympics-medal-cache",
};

let medalData = {};
let medalLastUpdated = null;
let isFetching = false;
let editingEntryId = null;

const tierConfig = buildTiers();

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("medal-source-link").href = MEDAL_SOURCE_URL;
  document.getElementById("medal-source-link").textContent =
    MEDAL_SOURCE_LABEL;

  renderTierSelects();
  renderTierReference();
  renderEntries();
  renderStandings();
  renderCountryPoints();
  updateEntryCount();

  document
    .getElementById("entry-form")
    .addEventListener("submit", handleEntrySubmit);
  document.getElementById("reset-form").addEventListener("click", resetForm);
  document
    .getElementById("refresh-button")
    .addEventListener("click", handleRefreshClick);

  loadMedals();
  setInterval(() => loadMedals(), REFRESH_INTERVAL_MS);
  setInterval(updateRefreshStatus, 60 * 1000);
});

function buildTiers() {
  const assigned = new Set([...TIER_1, ...TIER_2, ...TIER_3, ...TIER_4]);
  const tier5 = ALL_COUNTRIES.filter((country) => !assigned.has(country));

  warnIfDuplicateCountries();

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

function warnIfDuplicateCountries() {
  const all = [...TIER_1, ...TIER_2, ...TIER_3, ...TIER_4];
  const seen = new Set();
  const duplicates = [];
  all.forEach((country) => {
    if (seen.has(country)) {
      duplicates.push(country);
    }
    seen.add(country);
  });
  if (duplicates.length) {
    console.warn("Duplicate tier countries found:", duplicates);
  }
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
      item.textContent = country;
      list.appendChild(item);
    });

    card.appendChild(header);
    card.appendChild(desc);
    card.appendChild(list);
    container.appendChild(card);
  });
}

function handleEntrySubmit(event) {
  event.preventDefault();
  const memberName = document.getElementById("member-name").value.trim();
  const teamName = document.getElementById("team-name").value.trim();
  const selections = getSelections();

  if (!memberName || !teamName) {
    return setFormMessage("Please enter member and team names.", "error");
  }

  if (!selectionsComplete(selections)) {
    return setFormMessage("Please select one country per tier.", "error");
  }

  const entries = loadEntries();
  const existingMember = entries.find(
    (entry) =>
      entry.memberName.toLowerCase() === memberName.toLowerCase() &&
      entry.id !== editingEntryId
  );
  if (existingMember) {
    return setFormMessage(
      "That member already has an entry. Edit instead.",
      "error"
    );
  }

  if (!editingEntryId && entries.length >= MAX_MEMBERS) {
    return setFormMessage(
      `This pool is full (${MAX_MEMBERS} members).`,
      "error"
    );
  }

  const payload = {
    id: editingEntryId || String(Date.now()),
    memberName,
    teamName,
    picks: selections,
    createdAt: editingEntryId
      ? entries.find((entry) => entry.id === editingEntryId)?.createdAt ||
        Date.now()
      : Date.now(),
  };

  const updatedEntries = editingEntryId
    ? entries.map((entry) => (entry.id === editingEntryId ? payload : entry))
    : [...entries, payload];

  saveEntries(updatedEntries);
  resetForm();
  setFormMessage("Entry saved.", "success");
  renderEntries();
  renderStandings();
  updateEntryCount();
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

function renderEntries() {
  const container = document.getElementById("entries-list");
  const entries = loadEntries();
  container.innerHTML = "";

  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent =
      "No entries yet. Add up to 10 pool members above.";
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

    const actions = document.createElement("div");
    actions.className = "entry-actions";
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "button--secondary";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => editEntry(entry.id));

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "button--secondary";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => removeEntry(entry.id));

    actions.appendChild(editButton);
    actions.appendChild(removeButton);
    header.appendChild(title);
    header.appendChild(actions);

    const meta = document.createElement("div");
    meta.className = "entry-meta";
    const totalPoints = calculateEntryPoints(entry);
    meta.textContent = `Points: ${totalPoints}`;

    const picks = document.createElement("div");
    picks.className = "entry-picks";
    tierConfig.forEach((tier) => {
      const row = document.createElement("div");
      row.textContent = `${tier.label}: ${entry.picks[tier.id] || "-"}`;
      picks.appendChild(row);
    });

    card.appendChild(header);
    card.appendChild(meta);
    card.appendChild(picks);
    container.appendChild(card);
  });
}

function editEntry(entryId) {
  const entries = loadEntries();
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

function removeEntry(entryId) {
  const entries = loadEntries();
  const filtered = entries.filter((entry) => entry.id !== entryId);
  saveEntries(filtered);
  renderEntries();
  renderStandings();
  updateEntryCount();
}

function updateEntryCount() {
  const count = loadEntries().length;
  const badge = document.getElementById("entry-count");
  badge.textContent = `${count} / ${MAX_MEMBERS} entries used`;
}

function renderStandings() {
  const tbody = document.querySelector("#standings-table tbody");
  const entries = loadEntries();
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
      <td>${escapeHTML(Object.values(entry.picks).join(", "))}</td>
    `;
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
    tr.innerHTML = `
      <td>${escapeHTML(row.country)}</td>
      <td>${row.gold}</td>
      <td>${row.silver}</td>
      <td>${row.bronze}</td>
      <td>${row.points}</td>
    `;
    tbody.appendChild(tr);
  });
}

function calculateEntryPoints(entry) {
  return Object.values(entry.picks).reduce((total, country) => {
    return total + (medalData[country]?.points || 0);
  }, 0);
}

function handleRefreshClick() {
  const canFetch = canFetchMedals();
  if (!canFetch) {
    setFetchMessage("Refresh available once per hour.");
    return;
  }
  loadMedals();
}

function canFetchMedals() {
  const cache = loadMedalCache();
  if (!cache) return true;
  return Date.now() - cache.timestamp >= REFRESH_INTERVAL_MS;
}

function loadMedals() {
  if (isFetching) return;

  const cache = loadMedalCache();
  if (cache) {
    medalData = cache.data || {};
    medalLastUpdated = cache.timestamp;
    updateMedalDisplays();
  }

  if (!canFetchMedals()) {
    updateRefreshStatus();
    return;
  }

  isFetching = true;
  updateRefreshStatus();
  setFetchMessage("Fetching latest medal table...");

  fetch(MEDAL_SOURCE_URL, { headers: { Accept: "text/html" } })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }
      return response.text();
    })
    .then((html) => {
      const parsed = parseMedalTable(html);
      if (!parsed) {
        throw new Error("Unable to parse medal table.");
      }
      medalData = parsed;
      medalLastUpdated = Date.now();
      saveMedalCache({ timestamp: medalLastUpdated, data: medalData });
      updateMedalDisplays();
      setFetchMessage("Medal table updated.");
    })
    .catch((error) => {
      console.error(error);
      setFetchMessage("Unable to fetch medal data right now.");
    })
    .finally(() => {
      isFetching = false;
      updateRefreshStatus();
    });
}

function parseMedalTable(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const tables = Array.from(doc.querySelectorAll("table.wikitable"));
  const medalTable = tables.find((table) => {
    const headerText = table
      .querySelector("tr")
      ?.textContent.toLowerCase();
    return (
      headerText &&
      headerText.includes("gold") &&
      (headerText.includes("noc") || headerText.includes("nation"))
    );
  });

  if (!medalTable) return null;

  const rows = Array.from(medalTable.querySelectorAll("tr"));
  const headerCells = Array.from(rows[0].querySelectorAll("th"));
  const headers = headerCells.map((cell) =>
    cell.textContent.trim().toLowerCase()
  );

  const indices = {
    country: headers.findIndex(
      (text) =>
        text.includes("noc") || text.includes("nation") || text.includes("team")
    ),
    gold: headers.findIndex((text) => text.startsWith("gold")),
    silver: headers.findIndex((text) => text.startsWith("silver")),
    bronze: headers.findIndex((text) => text.startsWith("bronze")),
  };

  if (indices.country === -1) return null;

  const data = {};
  rows.slice(1).forEach((row) => {
    const cells = Array.from(row.querySelectorAll("th, td"));
    if (!cells.length) return;

    const countryCell = cells[indices.country];
    if (!countryCell) return;

    const rawName =
      countryCell.querySelector("a")?.textContent ||
      countryCell.textContent;
    const countryName = normalizeCountryName(rawName.trim());

    if (!countryName || countryName.toLowerCase().includes("total")) return;

    const gold = parseMedalValue(cells[indices.gold]?.textContent || "0");
    const silver = parseMedalValue(cells[indices.silver]?.textContent || "0");
    const bronze = parseMedalValue(cells[indices.bronze]?.textContent || "0");

    data[countryName] = {
      gold,
      silver,
      bronze,
      points:
        gold * POINT_VALUES.gold +
        silver * POINT_VALUES.silver +
        bronze * POINT_VALUES.bronze,
    };
  });

  return data;
}

function parseMedalValue(text) {
  const value = parseInt(text.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(value) ? value : 0;
}

function normalizeCountryName(name) {
  if (COUNTRY_ALIASES[name]) return COUNTRY_ALIASES[name];
  return name;
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

  const cache = loadMedalCache();
  if (cache) {
    lastUpdatedEl.textContent = formatTimestamp(cache.timestamp);
  } else if (medalLastUpdated) {
    lastUpdatedEl.textContent = formatTimestamp(medalLastUpdated);
  }

  const remaining = cache
    ? Math.max(0, REFRESH_INTERVAL_MS - (Date.now() - cache.timestamp))
    : 0;

  if (remaining === 0) {
    nextRefreshEl.textContent = "Ready";
    refreshButton.disabled = isFetching;
  } else {
    nextRefreshEl.textContent = formatDuration(remaining);
    refreshButton.disabled = true;
  }
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

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.entries);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (error) {
    console.error(error);
    return [];
  }
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEYS.entries, JSON.stringify(entries));
}

function loadMedalCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.medals);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

function saveMedalCache(cache) {
  localStorage.setItem(STORAGE_KEYS.medals, JSON.stringify(cache));
}

function escapeHTML(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
