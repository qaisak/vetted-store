-- Slop reports from the Skillshelf connector. One row per report.
-- reason is one of the fixed categories in src/worker.js; note is for reviewers only and is never shown to other users.
CREATE TABLE IF NOT EXISTS flags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listing TEXT NOT NULL,
  reason TEXT NOT NULL,
  note TEXT,
  session TEXT,
  created TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS flags_listing ON flags (listing, created);
CREATE INDEX IF NOT EXISTS flags_session ON flags (session, listing);
