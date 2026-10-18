// Browser SQLite3 via localStorage persistence
// We use a simple JSON-based storage since sql.js requires WASM files
// that are complex to bundle. We implement a lightweight SQLite-like
// interface backed by localStorage for full browser compatibility.

export interface Candidate {
  id?: number;
  fio: string;
  b_date: string;
  b_place: string;
  addr: string;
  phone: string;
  email: string;
  marital: string;
  langs: string;
  hobby: string;
  edu: string;
  exp: string;
  mot: string;
  created_at: string;
}

export interface TestResult {
  id?: number;
  candidate_id: number;
  factor_scores: string; // JSON array of 12 numbers
  responses: string;     // JSON array of 33x4 arrays
  ai_conclusion: string;
  created_at: string;
}

const DB_KEY = 'hr_kazan_db';

interface DBStore {
  candidates: (Candidate & { id: number })[];
  test_results: (TestResult & { id: number })[];
  _seq: { candidates: number; test_results: number };
}

function loadDB(): DBStore {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw) as DBStore;
  } catch {}
  return {
    candidates: [],
    test_results: [],
    _seq: { candidates: 0, test_results: 0 },
  };
}

function saveDB(db: DBStore) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

// ---- Candidates ----

export function insertCandidate(c: Omit<Candidate, 'id'>): number {
  const db = loadDB();
  db._seq.candidates += 1;
  const newRec = { ...c, id: db._seq.candidates };
  db.candidates.push(newRec);
  saveDB(db);
  return newRec.id;
}

export function getAllCandidates(): (Candidate & { id: number })[] {
  return loadDB().candidates;
}

export function getCandidateById(id: number): (Candidate & { id: number }) | undefined {
  return loadDB().candidates.find((c) => c.id === id);
}

export function deleteCandidate(id: number) {
  const db = loadDB();
  db.candidates = db.candidates.filter((c) => c.id !== id);
  db.test_results = db.test_results.filter((r) => r.candidate_id !== id);
  saveDB(db);
}

// ---- Test Results ----

export function insertTestResult(r: Omit<TestResult, 'id'>): number {
  const db = loadDB();
  db._seq.test_results += 1;
  const newRec = { ...r, id: db._seq.test_results };
  db.test_results.push(newRec);
  saveDB(db);
  return newRec.id;
}

export function getResultByCandidate(candidate_id: number): (TestResult & { id: number }) | undefined {
  return loadDB().test_results.find((r) => r.candidate_id === candidate_id);
}

export function getAllResults(): (TestResult & { id: number })[] {
  return loadDB().test_results;
}

export function getDBStats() {
  const db = loadDB();
  return {
    candidates: db.candidates.length,
    results: db.test_results.length,
  };
}

export function exportDBJSON(): string {
  return JSON.stringify(loadDB(), null, 2);
}
