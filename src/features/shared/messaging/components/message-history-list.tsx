/**
 * Shared Message History List Component
 * 
 * Displays a list of messages with status and timestamps
 * Used by both admin contacts page and staff messaging interface
 */

import { MessageLogRecord } from '../types/messaging.types';

interface MessageHistoryListProps {
  messages: MessageLogRecord[];
  emptyText?: string;
  onMessageClick?: (message: MessageLogRecord) => void;
}

export function MessageHistoryList({
  messages,
  emptyText = 'No messages',
  onMessageClick,
}: MessageHistoryListProps) {
  if (messages.length === 0) {
    return <p className="text-sm text-gray-500">{emptyText}</p>;
  }

  return (
    <div className="space-y-3">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className="cursor-pointer rounded-md border border-gray-200 p-3 hover:bg-gray-50 transition-colors"
          onClick={() => onMessageClick?.(msg)}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-gray-900">{msg.subject || 'Message'}</p>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                msg.status === 'delivered'
                  ? 'bg-green-100 text-green-800'
                  : msg.status === 'failed'
                  ? 'bg-red-100 text-red-800'
                  : msg.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {msg.status}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {new Date(msg.created_at).toLocaleString()} · {msg.channels?.join(', ') || '-'}
          </p>
          <p className="mt-2 line-clamp-2 text-sm text-gray-700">{msg.body}</p>
        </div>
      ))}
    </div>
  );
}
