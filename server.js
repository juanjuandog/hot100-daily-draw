const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const HOT100 = require("./hot100-data");

const PORT = 4173;
const CYCLE_TOTAL_DAYS = 15;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const DB_PATH = path.join(DATA_DIR, "hot100.db");
const PROBLEMS_BY_ID = new Map(HOT100.map((problem) => [problem.id, problem]));

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS completed_problems (
    problem_id INTEGER PRIMARY KEY,
    completed_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS draw_sessions (
    draw_date TEXT PRIMARY KEY,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS daily_draws (
    draw_date TEXT NOT NULL,
    problem_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (draw_date, problem_id)
  );

  CREATE TABLE IF NOT EXISTS cycles (
    cycle_id INTEGER PRIMARY KEY AUTOINCREMENT,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    completed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS cycle_days (
    cycle_id INTEGER NOT NULL,
    day_number INTEGER NOT NULL,
    planned_count INTEGER NOT NULL,
    draw_date TEXT,
    PRIMARY KEY (cycle_id, day_number)
  );

  CREATE TABLE IF NOT EXISTS cycle_problem_progress (
    cycle_id INTEGER NOT NULL,
    problem_id INTEGER NOT NULL,
    assigned_day INTEGER NOT NULL,
    draw_date TEXT NOT NULL,
    completed_at TEXT,
    PRIMARY KEY (cycle_id, problem_id)
  );
`);

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === "/api/state" && req.method === "GET") {
      return sendJson(res, 200, getAppState());
    }

    if (url.pathname === "/api/draw" && req.method === "POST") {
      createTodayDrawIfNeeded();
      return sendJson(res, 200, getAppState());
    }

    if (url.pathname === "/api/complete" && req.method === "POST") {
      const body = await readJsonBody(req);
      markCompleted(body.problemId);
      return sendJson(res, 200, getAppState());
    }

    if (req.method !== "GET") {
      return sendJson(res, 405, { error: "Method not allowed" });
    }

    return serveStatic(url.pathname, res);
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: "Server error" });
  }
});

server.listen(PORT, () => {
  console.log(`Hot100 app is running at http://localhost:${PORT}`);
  console.log(`SQLite database: ${DB_PATH}`);
});

function serveStatic(pathname, res) {
  const route = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.join(ROOT, route);

  if (!filePath.startsWith(ROOT)) {
    return sendText(res, 403, "Forbidden", "text/plain; charset=utf-8");
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return sendText(res, 404, "Not found", "text/plain; charset=utf-8");
  }

  const ext = path.extname(filePath);
  const contentType = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8"
  }[ext] || "application/octet-stream";

  return sendText(res, 200, fs.readFileSync(filePath), contentType);
}

function getAppState() {
  const today = getTodayKey();
  const cycle = getActiveCycle();

  if (!cycle) {
    return {
      today,
      cycleNumber: getNextCycleNumber(),
      cycleDay: 1,
      cycleTotalDays: CYCLE_TOTAL_DAYS,
      todayQuota: getPlannedCounts()[0],
      todayRemaining: 0,
      hasDrawToday: false,
      completedCount: 0,
      remainingCount: HOT100.length,
      todayProblems: []
    };
  }

  reconcileCycleProblems(cycle.cycle_id);

  const hasDrawToday = Boolean(getTodayCycleDay(cycle.cycle_id, today));
  const drawnDaysCount = getDrawnDaysCount(cycle.cycle_id);
  const todayDay = getTodayCycleDay(cycle.cycle_id, today);
  const completedCount = getCycleCompletedCount(cycle.cycle_id);
  const remainingCount = HOT100.length - completedCount;
  const todayProblems = todayDay ? getTodayProblems(cycle.cycle_id, today) : [];

  return {
    today,
    cycleNumber: cycle.cycle_id,
    cycleDay: todayDay?.day_number || Math.min(drawnDaysCount + 1, CYCLE_TOTAL_DAYS),
    cycleTotalDays: CYCLE_TOTAL_DAYS,
    todayQuota: todayDay?.planned_count || getNextPlannedQuota(cycle.cycle_id),
    todayRemaining: todayProblems.length,
    hasDrawToday,
    completedCount,
    remainingCount,
    todayProblems
  };
}

function createTodayDrawIfNeeded() {
  const today = getTodayKey();
  let cycle = getActiveCycle();

  if (cycle && getCycleCompletedCount(cycle.cycle_id) >= HOT100.length) {
    closeCycle(cycle.cycle_id);
    cycle = null;
  }

  if (!cycle) {
    cycle = createCycle();
  }

  reconcileCycleProblems(cycle.cycle_id);

  const existingDay = getTodayCycleDay(cycle.cycle_id, today);
  if (existingDay) {
    return;
  }

  const nextDay = getNextUndrawnDay(cycle.cycle_id);
  if (!nextDay) {
    return;
  }

  const assignedIds = new Set(
    db.prepare("SELECT problem_id FROM cycle_problem_progress WHERE cycle_id = ?").all(cycle.cycle_id).map((row) => row.problem_id)
  );
  const selected = shuffle(HOT100.filter((problem) => !assignedIds.has(problem.id)))
    .slice(0, Math.min(nextDay.planned_count, HOT100.length - assignedIds.size));
  const now = new Date().toISOString();
  db.prepare("INSERT OR IGNORE INTO draw_sessions (draw_date, created_at) VALUES (?, ?)").run(today, now);
  db.prepare("UPDATE cycle_days SET draw_date = ? WHERE cycle_id = ? AND day_number = ?")
    .run(today, cycle.cycle_id, nextDay.day_number);
  const insert = db.prepare(`
    INSERT OR IGNORE INTO cycle_problem_progress (cycle_id, problem_id, assigned_day, draw_date, completed_at)
    VALUES (?, ?, ?, ?, NULL)
  `);

  for (const problem of selected) {
    insert.run(cycle.cycle_id, problem.id, nextDay.day_number, today);
  }
}

function markCompleted(problemId) {
  const cycle = getActiveCycle();
  const now = new Date().toISOString();
  if (!cycle || !PROBLEMS_BY_ID.has(problemId)) {
    throw new Error(`Unknown problem id: ${problemId}`);
  }

  db.prepare(`
    UPDATE cycle_problem_progress
    SET completed_at = COALESCE(completed_at, ?)
    WHERE cycle_id = ? AND problem_id = ?
  `).run(now, cycle.cycle_id, problemId);

  db.prepare("INSERT OR IGNORE INTO completed_problems (problem_id, completed_at) VALUES (?, ?)")
    .run(problemId, now);

  if (getCycleCompletedCount(cycle.cycle_id) >= HOT100.length) {
    closeCycle(cycle.cycle_id);
  }
}

function getTodayKey() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function shuffle(list) {
  const copy = [...list];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function getActiveCycle() {
  return db.prepare("SELECT * FROM cycles WHERE status = 'active' ORDER BY cycle_id DESC LIMIT 1").get();
}

function getNextCycleNumber() {
  const row = db.prepare("SELECT COALESCE(MAX(cycle_id), 0) AS max_cycle FROM cycles").get();
  return row.max_cycle + 1;
}

function createCycle() {
  const now = new Date().toISOString();
  db.prepare("INSERT INTO cycles (status, created_at, completed_at) VALUES ('active', ?, NULL)").run(now);
  const cycle = getActiveCycle();
  const insertDay = db.prepare(`
    INSERT INTO cycle_days (cycle_id, day_number, planned_count, draw_date)
    VALUES (?, ?, ?, NULL)
  `);
  const counts = getPlannedCounts();

  counts.forEach((count, index) => {
    insertDay.run(cycle.cycle_id, index + 1, count);
  });

  return cycle;
}

function closeCycle(cycleId) {
  db.prepare("UPDATE cycles SET status = 'completed', completed_at = ? WHERE cycle_id = ?")
    .run(new Date().toISOString(), cycleId);
}

function getPlannedCounts() {
  const base = Math.floor(HOT100.length / CYCLE_TOTAL_DAYS);
  const extra = HOT100.length % CYCLE_TOTAL_DAYS;
  const counts = Array.from({ length: CYCLE_TOTAL_DAYS }, (_, index) => base + (index < extra ? 1 : 0));
  return shuffle(counts);
}

function getTodayCycleDay(cycleId, today) {
  return db.prepare(`
    SELECT day_number, planned_count
    FROM cycle_days
    WHERE cycle_id = ? AND draw_date = ?
    LIMIT 1
  `).get(cycleId, today);
}

function getNextUndrawnDay(cycleId) {
  return db.prepare(`
    SELECT day_number, planned_count
    FROM cycle_days
    WHERE cycle_id = ? AND draw_date IS NULL
    ORDER BY day_number ASC
    LIMIT 1
  `).get(cycleId);
}

function getDrawnDaysCount(cycleId) {
  const row = db.prepare(`
    SELECT COUNT(*) AS count
    FROM cycle_days
    WHERE cycle_id = ? AND draw_date IS NOT NULL
  `).get(cycleId);
  return row.count;
}

function getNextPlannedQuota(cycleId) {
  const row = getNextUndrawnDay(cycleId);
  return row?.planned_count ?? 0;
}

function getCycleCompletedCount(cycleId) {
  const row = db.prepare(`
    SELECT COUNT(*) AS count
    FROM cycle_problem_progress
    WHERE cycle_id = ? AND completed_at IS NOT NULL
  `).get(cycleId);
  return row.count;
}

function getTodayProblems(cycleId, today) {
  const ids = db.prepare(`
    SELECT problem_id
    FROM cycle_problem_progress
    WHERE cycle_id = ? AND draw_date = ? AND completed_at IS NULL
    ORDER BY assigned_day ASC, problem_id ASC
  `).all(cycleId, today).map((row) => row.problem_id);
  return ids.map((id) => PROBLEMS_BY_ID.get(id)).filter(Boolean);
}

function reconcileCycleProblems(cycleId) {
  const invalidRows = db.prepare(`
    SELECT problem_id, assigned_day, draw_date, completed_at
    FROM cycle_problem_progress
    WHERE cycle_id = ?
  `).all(cycleId).filter((row) => !PROBLEMS_BY_ID.has(row.problem_id));

  if (!invalidRows.length) {
    return;
  }

  const deleteStmt = db.prepare(`
    DELETE FROM cycle_problem_progress
    WHERE cycle_id = ? AND problem_id = ?
  `);

  for (const row of invalidRows) {
    deleteStmt.run(cycleId, row.problem_id);
  }

  const assignedIds = new Set(
    db.prepare("SELECT problem_id FROM cycle_problem_progress WHERE cycle_id = ?").all(cycleId).map((row) => row.problem_id)
  );
  const replacements = shuffle(HOT100.filter((problem) => !assignedIds.has(problem.id)));
  const insertStmt = db.prepare(`
    INSERT INTO cycle_problem_progress (cycle_id, problem_id, assigned_day, draw_date, completed_at)
    VALUES (?, ?, ?, ?, NULL)
  `);

  invalidRows.forEach((row, index) => {
    const replacement = replacements[index];

    if (!replacement) {
      return;
    }

    assignedIds.add(replacement.id);
    insertStmt.run(cycleId, replacement.id, row.assigned_day, row.draw_date ?? getTodayKey());
  });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;
    });

    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

function sendJson(res, statusCode, payload) {
  sendText(res, statusCode, JSON.stringify(payload), "application/json; charset=utf-8");
}

function sendText(res, statusCode, payload, contentType) {
  res.writeHead(statusCode, { "Content-Type": contentType });
  res.end(payload);
}
