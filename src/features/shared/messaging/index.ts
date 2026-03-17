/**
 * Shared Messaging Module - Barrel Exports
 * 
 * Re-export all shared messaging components, hooks, and types
 * for use across admin and staff interfaces
 */

// Hooks
export { useSendMessage } from './hooks/use-send-message';
export type { SendMessagePayload, SendMessageResult } from './hooks/use-send-message';

export { useSharedMessageThreads } from './hooks/use-shared-message-threads';

// Components
export { ContactPreferenceBadge } from './components/contact-preference-badge';

// Types
export type {
  MessageLogRecord,
  MessageThread,
  ContactPreferences,
} from './types/messaging.types';

// Re-export staff-specific hooks for backward compatibility
export { useMessageThreads, useRealtimeMessages, useMarkAsRead } from '@/features/staff/hooks/use-messages';
export { useThreadSearch } from '@/features/staff/hooks/use-thread-search';
