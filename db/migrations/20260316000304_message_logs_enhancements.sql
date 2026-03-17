-- Migration: 20260316000304_message_logs_enhancements.sql
-- Purpose: Extend message_logs table with direction, thread_key, and unread-tracking columns

BEGIN;

-- Add direction column to distinguish inbound vs outbound messages
ALTER TABLE public.message_logs
ADD COLUMN IF NOT EXISTS direction text DEFAULT 'outbound',
ADD CONSTRAINT valid_direction CHECK (direction IN ('inbound', 'outbound'));

-- Add thread_key for grouping related messages into conversations
ALTER TABLE public.message_logs
ADD COLUMN IF NOT EXISTS thread_key text;
CREATE INDEX IF NOT EXISTS idx_message_logs_thread_key ON public.message_logs(thread_key);

-- Add unread-tracking columns
-- is_read: marks whether the message has been viewed by recipient staff
ALTER TABLE public.message_logs
ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_message_logs_is_read ON public.message_logs(is_read) WHERE is_read = false;

-- read_by: which staff member read this message (nullable until read)
ALTER TABLE public.message_logs
ADD COLUMN IF NOT EXISTS read_by uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL;

-- read_at: when was this message read
ALTER TABLE public.message_logs
ADD COLUMN IF NOT EXISTS read_at_timestamp timestamp with time zone;

-- Timestamps for inbound message reception (separate from sent/delivered for clarity)
ALTER TABLE public.message_logs
ADD COLUMN IF NOT EXISTS received_at timestamp with time zone;

-- For inbound messages, track the Twilio message SID for replies
ALTER TABLE public.message_logs
ADD COLUMN IF NOT EXISTS twilio_inbound_message_sid text;

-- Create composite index for efficient conversation retrieval
CREATE INDEX IF NOT EXISTS idx_message_logs_thread_created 
ON public.message_logs(thread_key, created_at DESC)
WHERE thread_key IS NOT NULL;

-- Create index for finding unread messages for a staff member
CREATE INDEX IF NOT EXISTS idx_message_logs_unread_for_staff
ON public.message_logs(staff_id, is_read, created_at DESC)
WHERE is_read = false AND direction = 'inbound';

COMMIT;
