-- ============================================================
-- Supabase schema for Birthday Gift Box Game
-- Run this in Supabase SQL Editor (copy/paste the whole file).
-- ============================================================
--
-- Design: single JSONB blob per player_id.
--
-- The entire client state (resources, buildings, crafting,
-- harvest timers, parts, etc.) is stored as one JSONB column.
-- This matches the save/load code in src/services/db.ts, which
-- serializes the Zustand store to a single object and upserts
-- it as one row. Postgres guarantees single-row atomicity for
-- UPSERT, so there's no way to partially apply a state change.
--
-- Only two player_ids are used in production:
--   - 'seoyeon'  — the real game, served at the root path /
--   - 'debug'    — the debug save, served at /debug
--
-- The path-based routing is wired via vercel.json (rewrites
-- /debug → /index.html) and src/services/db.ts (reads
-- window.location.pathname at module load).
-- ============================================================

-- Drop the old stale table from the previous column-per-field
-- design if it's still around. Safe to run on a fresh project.
DROP TABLE IF EXISTS game_saves CASCADE;

-- Main save table: one row per player.
CREATE TABLE IF NOT EXISTS player_saves (
    player_id  TEXT PRIMARY KEY,
    state      JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-bump updated_at on every UPDATE.
CREATE OR REPLACE FUNCTION player_saves_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS player_saves_updated_at ON player_saves;
CREATE TRIGGER player_saves_updated_at
    BEFORE UPDATE ON player_saves
    FOR EACH ROW
    EXECUTE FUNCTION player_saves_touch_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================
--
-- This is a single-recipient birthday gift. We don't have real
-- user auth — the client uses the Supabase anon key directly.
-- Anyone with the anon key and knowledge of a player_id can
-- read/write that row. That is acceptable here because:
--   (1) the deployment URL is private (only the recipient has
--       the link),
--   (2) there are exactly two hardcoded player_ids ('seoyeon',
--       'debug') — no enumeration of strangers' saves,
--   (3) the worst-case blast radius is "someone overwrites the
--       birthday save", which is recoverable from backups.
--
-- If this project were ever reused for anything sensitive, the
-- right fix is to switch to Supabase Auth and scope policies by
-- auth.uid(). For this gift, wide-open anon policies are fine.
-- ============================================================

ALTER TABLE player_saves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon read"   ON player_saves;
DROP POLICY IF EXISTS "anon insert" ON player_saves;
DROP POLICY IF EXISTS "anon update" ON player_saves;
DROP POLICY IF EXISTS "anon delete" ON player_saves;

CREATE POLICY "anon read"
    ON player_saves FOR SELECT
    USING (true);

CREATE POLICY "anon insert"
    ON player_saves FOR INSERT
    WITH CHECK (true);

CREATE POLICY "anon update"
    ON player_saves FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY "anon delete"
    ON player_saves FOR DELETE
    USING (true);

-- ============================================================
-- Usage from the client (see src/services/db.ts):
--
--   // upsert
--   await supabase
--       .from('player_saves')
--       .upsert({ player_id, state, updated_at: new Date().toISOString() },
--               { onConflict: 'player_id' });
--
--   // load
--   const { data } = await supabase
--       .from('player_saves')
--       .select('state')
--       .eq('player_id', player_id)
--       .maybeSingle();
--
--   // delete
--   await supabase.from('player_saves').delete().eq('player_id', player_id);
-- ============================================================
