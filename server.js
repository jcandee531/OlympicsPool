const express = require("express");
const path = require("path");
const fs = require("fs/promises");
const crypto = require("crypto");
const cheerio = require("cheerio");

const app = express();
const PORT = process.env.PORT || 3000;
const FORCE_HTTPS = process.env.FORCE_HTTPS === "true";

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, ".data");
const DATA_FILE = path.join(DATA_DIR, "pool.json");

const MAX_MEMBERS = 10;
const REFRESH_INTERVAL_MS = 60 * 60 * 1000;

const MEDAL_SOURCE_URL =
  "https://en.wikipedia.org/api/rest_v1/page/html/2026_Winter_Olympics_medal_table";
const MEDAL_SOURCE_LABEL =
  "Wikipedia 2026 Winter Olympics medal table (REST API)";

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

const TIER_IDS = ["tier-1", "tier-2", "tier-3", "tier-4", "tier-5"];

app.set("trust proxy", 1);
app.use((req, res, next) => {
  if (FORCE_HTTPS && req.header("x-forwarded-proto") !== "https") {
    return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  }
  return next();
});

app.use(express.json({ limit: "200kb" }));
app.use(express.static(__dirname, { extensions: ["html"] }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/entries", async (_req, res) => {
  const data = await loadData();
  const lockStatus = applyAutoLock(data);
  await saveData(data);
  res.json({
    entries: data.entries,
    locked: lockStatus.locked,
    deadline: lockStatus.deadline,
    maxMembers: MAX_MEMBERS,
  });
});

app.post("/api/entries", async (req, res) => {
  const data = await loadData();
  const lockStatus = applyAutoLock(data);
  if (lockStatus.locked) {
    return res.status(423).json({ error: "Pool is locked." });
  }

  const { entry, error } = validateEntryPayload(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  if (data.entries.length >= MAX_MEMBERS) {
    return res
      .status(400)
      .json({ error: `Pool is full (${MAX_MEMBERS} members).` });
  }

  if (isMemberNameUsed(data.entries, entry.memberName)) {
    return res.status(409).json({ error: "Member name already exists." });
  }

  const now = Date.now();
  const newEntry = {
    ...entry,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };

  data.entries.push(newEntry);
  await saveData(data);
  res.status(201).json({ entry: newEntry });
});

app.put("/api/entries/:id", async (req, res) => {
  const data = await loadData();
  const lockStatus = applyAutoLock(data);
  if (lockStatus.locked) {
    return res.status(423).json({ error: "Pool is locked." });
  }

  const entryId = req.params.id;
  const index = data.entries.findIndex((entry) => entry.id === entryId);
  if (index === -1) {
    return res.status(404).json({ error: "Entry not found." });
  }

  const { entry, error } = validateEntryPayload(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  if (isMemberNameUsed(data.entries, entry.memberName, entryId)) {
    return res.status(409).json({ error: "Member name already exists." });
  }

  const now = Date.now();
  const updatedEntry = {
    ...data.entries[index],
    ...entry,
    updatedAt: now,
  };

  data.entries[index] = updatedEntry;
  await saveData(data);
  res.json({ entry: updatedEntry });
});

app.delete("/api/entries/:id", async (req, res) => {
  const data = await loadData();
  const lockStatus = applyAutoLock(data);
  if (lockStatus.locked) {
    return res.status(423).json({ error: "Pool is locked." });
  }

  const entryId = req.params.id;
  const existing = data.entries.find((entry) => entry.id === entryId);
  if (!existing) {
    return res.status(404).json({ error: "Entry not found." });
  }

  data.entries = data.entries.filter((entry) => entry.id !== entryId);
  await saveData(data);
  res.json({ ok: true });
});

app.get("/api/medals", async (_req, res) => {
  const data = await loadData();
  const cache = data.medalsCache || {};
  const now = Date.now();
  const ageMs = cache.timestamp ? now - cache.timestamp : Number.POSITIVE_INFINITY;
  const shouldFetch = !cache.data || ageMs >= REFRESH_INTERVAL_MS;

  if (shouldFetch) {
    try {
      const html = await fetchMedalHtml();
      const parsed = parseMedalTable(html);
      if (!parsed) {
        throw new Error("Unable to parse medal table.");
      }
      cache.data = parsed;
      cache.timestamp = now;
      cache.sourceUrl = MEDAL_SOURCE_URL;
      cache.sourceLabel = MEDAL_SOURCE_LABEL;
      data.medalsCache = cache;
      await saveData(data);
    } catch (error) {
      if (!cache.data) {
        return res
          .status(502)
          .json({ error: "Unable to fetch medal data." });
      }
      return res.json({
        data: cache.data,
        lastUpdated: cache.timestamp,
        sourceUrl: cache.sourceUrl || MEDAL_SOURCE_URL,
        sourceLabel: cache.sourceLabel || MEDAL_SOURCE_LABEL,
        nextRefreshMs: Math.max(0, REFRESH_INTERVAL_MS - ageMs),
        stale: true,
      });
    }
  }

  res.json({
    data: cache.data,
    lastUpdated: cache.timestamp,
    sourceUrl: cache.sourceUrl || MEDAL_SOURCE_URL,
    sourceLabel: cache.sourceLabel || MEDAL_SOURCE_LABEL,
    nextRefreshMs: Math.max(
      0,
      REFRESH_INTERVAL_MS - (Date.now() - (cache.timestamp || 0))
    ),
    stale: false,
  });
});

app.post("/api/admin/lock", async (req, res) => {
  const data = await loadData();

  if ("locked" in req.body && typeof req.body.locked === "boolean") {
    data.config.locked = req.body.locked;
  }

  if ("deadline" in req.body) {
    if (req.body.deadline === null || req.body.deadline === "") {
      data.config.deadline = null;
    } else {
      const parsed = Date.parse(req.body.deadline);
      if (Number.isNaN(parsed)) {
        return res.status(400).json({ error: "Invalid deadline value." });
      }
      data.config.deadline = new Date(parsed).toISOString();
    }
  }

  const lockStatus = applyAutoLock(data);
  await saveData(data);

  res.json({
    locked: lockStatus.locked,
    deadline: lockStatus.deadline,
  });
});

app.listen(PORT, () => {
  console.log(`Medal pool app listening on port ${PORT}`);
});

function defaultData() {
  return {
    entries: [],
    config: {
      locked: false,
      deadline: null,
    },
    medalsCache: {
      timestamp: null,
      data: null,
      sourceUrl: MEDAL_SOURCE_URL,
      sourceLabel: MEDAL_SOURCE_LABEL,
    },
  };
}

async function loadData() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    const data = {
      ...defaultData(),
      ...parsed,
      config: { ...defaultData().config, ...(parsed.config || {}) },
      medalsCache: {
        ...defaultData().medalsCache,
        ...(parsed.medalsCache || {}),
      },
    };
    normalizeMedalCache(data);
    return data;
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(error);
    }
    const data = defaultData();
    normalizeMedalCache(data);
    return data;
  }
}

async function saveData(data) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

function applyAutoLock(data) {
  if (!data.config) data.config = { locked: false, deadline: null };
  if (data.config.deadline) {
    const deadlineMs = Date.parse(data.config.deadline);
    if (!Number.isNaN(deadlineMs) && Date.now() >= deadlineMs) {
      data.config.locked = true;
    }
  }
  return { locked: data.config.locked, deadline: data.config.deadline };
}

function normalizeMedalCache(data) {
  if (!data.medalsCache) data.medalsCache = {};
  const cache = data.medalsCache;
  const sourceChanged =
    cache.sourceUrl && cache.sourceUrl !== MEDAL_SOURCE_URL;

  if (sourceChanged) {
    cache.data = null;
    cache.timestamp = null;
  }

  cache.sourceUrl = MEDAL_SOURCE_URL;
  cache.sourceLabel = MEDAL_SOURCE_LABEL;
}

function validateEntryPayload(body) {
  const memberName = String(body.memberName || "").trim();
  const teamName = String(body.teamName || "").trim();
  const picks = body.picks || {};

  if (!memberName || !teamName) {
    return { error: "Member name and team name are required." };
  }

  const missingTier = TIER_IDS.find((tierId) => !picks[tierId]);
  if (missingTier) {
    return { error: "One country per tier is required." };
  }

  return {
    entry: {
      memberName,
      teamName,
      picks: TIER_IDS.reduce((acc, tierId) => {
        acc[tierId] = String(picks[tierId]).trim();
        return acc;
      }, {}),
    },
  };
}

function isMemberNameUsed(entries, memberName, ignoreId) {
  const normalized = memberName.toLowerCase();
  return entries.some(
    (entry) =>
      entry.id !== ignoreId &&
      entry.memberName.toLowerCase() === normalized
  );
}

async function fetchMedalHtml() {
  const response = await fetch(MEDAL_SOURCE_URL, {
    headers: { "User-Agent": "MedalPoolBot/1.0" },
  });
  if (!response.ok) {
    throw new Error(`Medal source request failed (${response.status}).`);
  }
  return response.text();
}

function parseMedalTable(html) {
  const $ = cheerio.load(html);
  let medalTable = null;

  $("table.wikitable").each((_index, table) => {
    const headerText = $(table).find("tr").first().text().toLowerCase();
    if (
      headerText.includes("gold") &&
      (headerText.includes("noc") || headerText.includes("nation"))
    ) {
      medalTable = table;
      return false;
    }
    return true;
  });

  if (!medalTable) return null;

  const rows = $(medalTable).find("tr").toArray();
  if (!rows.length) return null;

  const headerCells = $(rows[0]).find("th").toArray();
  const headers = headerCells.map((cell) =>
    $(cell).text().trim().toLowerCase()
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
    const cells = $(row).find("th, td").toArray();
    if (!cells.length) return;

    const countryCell = cells[indices.country];
    if (!countryCell) return;

    const rawName =
      $(countryCell).find("a").first().text() || $(countryCell).text();
    const cleanedName = cleanCountryName(rawName);
    const countryName = normalizeCountryName(cleanedName);
    if (!countryName || countryName.toLowerCase().includes("total")) return;

    const gold = parseMedalValue($(cells[indices.gold]).text());
    const silver = parseMedalValue($(cells[indices.silver]).text());
    const bronze = parseMedalValue($(cells[indices.bronze]).text());

    data[countryName] = {
      gold,
      silver,
      bronze,
      points: gold * 3 + silver * 2 + bronze * 1,
    };
  });

  return data;
}

function parseMedalValue(text) {
  const value = parseInt(String(text).replace(/[^\d]/g, ""), 10);
  return Number.isFinite(value) ? value : 0;
}

function cleanCountryName(name) {
  return String(name)
    .replace(/\[[^\]]*]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCountryName(name) {
  return COUNTRY_ALIASES[name] || name;
}
