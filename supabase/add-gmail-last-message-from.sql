-- Migration: Add last_message_from to gmail_threads
-- Tracks who sent the last message in a thread (for "Needs Reply" / "Awaiting" indicators)
-- Run this in Supabase SQL Editor

ALTER TABLE gmail_threads ADD COLUMN IF NOT EXISTS last_message_from text NOT NULL DEFAULT '';
