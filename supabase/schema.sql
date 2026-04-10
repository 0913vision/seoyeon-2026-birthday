-- ============================================================
-- Supabase schema for Birthday Gift Box Game
-- Run this in Supabase SQL Editor to set up the database.
-- ============================================================

-- Game saves table
-- Each row = one player's complete game state
CREATE TABLE IF NOT EXISTS game_saves (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id TEXT NOT NULL UNIQUE,  -- URL param or anonymous ID
    current_day INTEGER NOT NULL DEFAULT 1,
    tutorial_step INTEGER NOT NULL DEFAULT 0,
    box_stage INTEGER NOT NULL DEFAULT 1,
    packaging_started_at BIGINT,  -- Unix timestamp ms
    box_harvested BOOLEAN NOT NULL DEFAULT FALSE,
    resources JSONB NOT NULL DEFAULT '{
        "wood": {"amount": 2000, "unlocked": true},
        "flower": {"amount": 0, "unlocked": false},
        "stone": {"amount": 0, "unlocked": false},
        "metal": {"amount": 0, "unlocked": false},
        "gem": {"amount": 0, "unlocked": false}
    }'::jsonb,
    buildings JSONB NOT NULL DEFAULT '{
        "box": {"built": true, "position": {"row": 8, "col": 8}},
        "wood_farm": {"built": true, "position": {"row": 3, "col": 4}},
        "woodshop": {"built": false},
        "flower_farm": {"built": false},
        "quarry": {"built": false},
        "mine": {"built": false},
        "jewelshop": {"built": false},
        "gem_cave": {"built": false}
    }'::jsonb,
    parts_completed INTEGER[] NOT NULL DEFAULT '{}',
    parts_attached INTEGER[] NOT NULL DEFAULT '{}',
    woodshop_crafting JSONB NOT NULL DEFAULT '{"partId": null, "startedAt": null}'::jsonb,
    jewelshop_crafting JSONB NOT NULL DEFAULT '{"partId": null, "startedAt": null}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at on save
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER game_saves_updated_at
    BEFORE UPDATE ON game_saves
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Index for fast player lookup
CREATE INDEX IF NOT EXISTS idx_game_saves_player_id ON game_saves(player_id);

-- Row Level Security (optional, for multi-player)
ALTER TABLE game_saves ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access (for URL-based player IDs)
CREATE POLICY "Anyone can read their own save"
    ON game_saves FOR SELECT
    USING (true);

CREATE POLICY "Anyone can insert their own save"
    ON game_saves FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Anyone can update their own save"
    ON game_saves FOR UPDATE
    USING (true);

-- ============================================================
-- Usage from Supabase JS client:
--
-- Save:
--   supabase.from('game_saves').upsert({ player_id: 'xxx', ...state })
--
-- Load:
--   supabase.from('game_saves').select('*').eq('player_id', 'xxx').single()
--
-- Delete:
--   supabase.from('game_saves').delete().eq('player_id', 'xxx')
-- ============================================================
