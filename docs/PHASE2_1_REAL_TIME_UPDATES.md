# Phase 2.1: Staff Dashboard Real-Time Message Updates

**Date:** March 16, 2026  
**Status:** IMPLEMENTATION COMPLETE  
**Scope:** Real-time SMS inbox for staff dashboard with thread view

---

## What Was Delivered

### 1. Mark-as-Read API Endpoint
**File:** [src/app/api/messages/{id}/read/route.ts](src/app/api/messages/%5Bid%5D/read/route.ts)

**Endpoint:** `PATCH /api/messages/{id}/read`

Allows staff to mark inbound messages as read. Automatically:
- Looks up staff profile from authenticated user
- Updates `is_read: true`, `read_by: staff_id`, `read_at_timestamp: now()`
- Returns success/failure JSON response

---

### 2. Message Hooks
**File:** [src/features/staff/hooks/use-messages.ts](src/features/staff/hooks/use-messages.ts)

**Exports:**

| Hook | Purpose |
|------|---------|
| `useMessageThreads()` | Fetches all inbound message threads grouped by patient |
| `useRealtimeMessages(patientId)` | Subscribes to real-time message updates for a patient |
| `useMarkAsRead()` | Mark-as-read mutation hook |

**Features:**
- Real-time Postgres change subscriptions
- Broadcast channel listening for webhook events
- Thread grouping by patient + thread_key
- Unread message counting
- Message preview text extraction

---

### 3. Message Thread Viewer Component
**File:** [src/features/staff/ui/message-thread-viewer.tsx](src/features/staff/ui/message-thread-viewer.tsx)

Displays conversation history between staff and patient. Features:

- **Auto-scroll:** Scrolls to bottom when new messages arrive
- **Auto-read:** Automatically marks inbound messages as read when viewed
- **Chronological:** Messages sorted by creation time with date dividers
- **Styling:** Inbound (amber/unread) vs outbound (blue) message bubbles
- **Timestamps:** Formatted time and "read by" indicator

**Props:**
```typescript
interface MessageThreadViewerProps {
  patientId: string;
  patientName: string;
  onMarkAsRead?: (messageId: string) => void;
}
```

---

### 4. Messages Tab Component
**File:** [src/features/staff/ui/messages-tab.tsx](src/features/staff/ui/messages-tab.tsx)

Main messages interface for staff dashboard. Features:

- **Thread List:** Sidebar showing all message threads
- **Unread Badge:** Red bubble with count of unread messages
- **Thread Preview:** Last message preview text
- **Selection:** Click to open full conversation in viewer
- **Loading State:** Spinner while fetching threads
- **Error Handling:** User-friendly error messages

**Architecture:**
```
┌──────────────────────┬──────────────────┐
│  Thread List         │  Thread Viewer   │
│  (useMessageThreads) │  (Real-time)     │
│                      │                  │
│  • Patient Name      │  • Full History  │
│  • Unread Count      │  • Auto-scroll   │
│  • Last Message      │  • Auto-read     │
│  • Selection State   │  • Timestamps    │
└──────────────────────┴──────────────────┘
```

---

### 5. Receptionist Dashboard Tab System
**File:** [src/features/staff/ui/receptionist-dashboard.tsx](src/features/staff/ui/receptionist-dashboard.tsx)

Updated dashboard with tabs:

- **Schedule Tab:** Existing appointment management UI
- **Messages Tab:** New messaging interface
- **Tab Navigation:** Toggle buttons with active state styling
- **State Management:** `activeTab` state controls visibility

```tsx
const [activeTab, setActiveTab] = useState<'schedule' | 'messages'>('schedule');

// In JSX:
{activeTab === 'messages' && <MessagesTab />}
{activeTab === 'schedule' && (<>/* schedule content */</>) }
```

---

### 6. i18n Translations
**Files:** 
- [messages/en.json](messages/en.json)
- [messages/es.json](messages/es.json)

Added new translation keys:

| Key | English | Spanish |
|-----|---------|---------|
| `staff.messages.title` | Messages | Mensajes |
| `staff.messages.threads` | Message Threads | Hilos de Mensaje |
| `staff.messages.noThreads` | No message threads yet | Sin hilos de mensaje aún |
| `staff.reception.tabs.schedule` | Schedule | Cronograma |
| `staff.messages.loading` | Loading messages... | Cargando mensajes... |
| `staff.messages.read` | Read | Leído |

---

## Real-Time Architecture

```
       PATIENT SENDS SMS
              │
              ▼
        TWILIO SERVICE
              │
              ▼
     POST /api/webhooks/twilio/sms
        (Phase 2 webhook)
              │
              ├─► INSERT message_logs (is_read=false)
              │
              ├─► BROADCAST 'inbound_sms' event
              │
              ▼
     SUPABASE CHANNELS
              │
              ├─► Postgres change listener
              │   (useRealtimeMessages hook)
              │
              └─► Broadcast listener
                  (Thread list refresh)
              │
              ▼
     STAFF OPENS MESSAGE
              │
              ├─► Auto-marks as read
              │
              └─► PATCH /api/messages/{id}/read
                  (updates is_read, read_by, read_at_timestamp)
```

---

## User Flow

### 1. Patient Sends SMS
```
Patient: "Can I reschedule my appointment?"
         ↓
SMS arrives at Twilio
         ↓
Webhook processes incoming SMS
         ↓
Creates message_logs entry (is_read=false)
         ↓
Broadcasts 'inbound_sms' event
```

### 2. Staff Views Messages
```
Staff opens Messages tab
         ↓
useMessageThreads() fetches all threads
         ↓
Thread list shows unread count: [1]
         ↓
Staff clicks thread
         ↓
MessageThreadViewer loads conversation
         ↓
Auto-marks inbound messages as read
         ↓
PATCH /api/messages/{id}/read
         ↓
Database updated (is_read=true)
         ↓
UI refreshes - unread count: [0]
```

### 3. Staff Responds
```
Staff types reply in form (future Phase 2.2)
         ↓
POST /api/messages to send message
         ↓
Message logged with direction='outbound'
         ↓
Twilio sends SMS to patient
         ↓
Appears in thread automatically (real-time subscription)
```

---

## Component Dependencies

```
ReceptionistDashboard
  ├─ MessagesTab
  │   ├─ useMessageThreads() [hook]
  │   ├─ MessageThreadViewer
  │   │   ├─ useRealtimeMessages() [hook]
  │   │   ├─ useMarkAsRead() [hook]
  │   │   └─ formatDate/formatTime [helpers]
  │   └─ [conditional rendering]
  └─ [existing schedule UI]
```

---

## Data Flow Diagram

```
message_logs table
    │
    ├─► useMessageThreads()
    │   • Groups by patient
    │   • Counts unread
    │   • Returns PatientThread[]
    │   └─► MessagesTab renders thread list
    │
    ├─► useRealtimeMessages(patientId)
    │   • Subscribes to changes
    │   • Listens to broadcasts
    │   • Returns MessageLogRecord[]
    │   └─► MessageThreadViewer renders conversation
    │
    └─► useMarkAsRead()
        • PATCH /api/messages/{id}/read
        • Updates is_read + metadata
        └─► Component refetches/updates
```

---

## Testing Checklist

### Local Development
- [ ] Start dev server: `npm run dev`
- [ ] Navigate to `/staff/dashboard`
- [ ] Click "Messages" tab
- [ ] Verify tab switches successfully
- [ ] Wait for thread list to load
- [ ] Check Supabase console for realtime subscriptions
- [ ] Send test SMS to Twilio number
- [ ] Verify message appears in thread list
- [ ] Click thread to view conversation
- [ ] Verify message auto-marks as read
- [ ] Check database: `is_read=true`, `read_at_timestamp` set

### Production Deployment
- [ ] Verify websocket connection to Supabase (real-time)
- [ ] Test mark-as-read endpoint with auth
- [ ] Monitor performance with multiple threads
- [ ] Test on slow network (3G)
- [ ] Verify mobile responsiveness

---

## Known Limitations & TODOs

### Current Phase (2.1) Limitations
1. **No Message Composition:** Staff cannot send SMS directly (Phase 2.2)
2. **No Message Search:** Thread list not filterable (Phase 2.2)
3. **No Pagination:** Loads all threads at once (Phase 2.2)
4. **Limited History:** Only shows recent messages (Phase 2.3)
5. **No Attachments:** Text-only messages for now (Phase 3)

### Phase 2.2 Work
- [ ] Create message composition form
- [ ] Outbound SMS sending UI
- [ ] Message search/filter
- [ ] Thread pagination
- [ ] Typing indicators

### Phase 2.3+ Work
- [ ] Message history pagination
- [ ] Media attachment support
- [ ] Auto-reply templates
- [ ] Conversation archiving
- [ ] Message scheduling

---

## Production Readiness

**Before deploying to production:**

1. **Real-Time Monitoring**
   - [ ] Set up Sentry alerts for webhook failures
   - [ ] Monitor message delivery latency
   - [ ] Track unread count accuracy

2. **Performance**
   - [ ] Test with 100+ concurrent threads
   - [ ] Verify subscription cleanup (no memory leaks)
   - [ ] Monitor database query performance

3. **Security**
   - [ ] Verify RLS policies on message_logs
   - [ ] Test that staff can only see their patients' messages
   - [ ] Verify auth on mark-as-read endpoint

4. **UX Polish**
   - [ ] Test tab switching responsiveness
   - [ ] Verify message loading states
   - [ ] Test error messages
   - [ ] Mobile viewport adjustments

---

## Code Examples

### Fetch Thread List  
```typescript
const { threads, loading, error } = useMessageThreads();
// threads: PatientThread[]
// threads[0].unread_count = 3
// threads[0].patient_name = "John Doe"
```

### Subscribe to Real-Time Messages
```typescript
const { messages } = useRealtimeMessages(patientId);
// Auto-updates when new SMS arrives
// Auto-updates when marked as read
```

### Mark Message as Read
```typescript
const { markAsRead, loading } = useMarkAsRead();
await markAsRead(messageId);
// Updates database + updates UI
```

---

## Environment & Configuration

No new environment variables needed for Phase 2.1.

Uses existing:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `TWILIO_*` (from Phase 2)

---

## Performance Considerations

**Real-Time Subscriptions:**
- Each open thread = 1 Supabase channel subscription
- Channels cleaned up on unmount
- Max recommended: 5 concurrent threads per staff

**Database Queries:**
- `useMessageThreads()`: Single query with grouping in JavaScript
- `useRealtimeMessages()`: Single query + subscription (not paginated)
- Indexes: Already created in Phase 2 migration

**Optimization Tips:**
- Lazy load thread list (infinite scroll in Phase 2.2)
- Batch mark-as-read calls (Phase 2.2)
- Pagination for message history (Phase 2.3)

---

## Migration Path from Phase 2

| Phase | Feature | Status |
|-------|---------|--------|
| 2.0 | Inbound webhook | ✅ Complete |
| 2.1 | Real-time dashboard | ✅ Complete |
| 2.2 | Message composition | Planned |
| 2.3 | Search & pagination | Planned |
| 2.4 | Admin controls | Planned |

---

## Session Summary

**Completed:** Full real-time messaging tab for staff dashboard  
**Files Created:** 4 new files  
**Files Modified:** 1 existing  
**Translations Added:** 12 new keys (EN/ES)  
**Test Coverage:** Ready for local testing  
**Next Session:** Message composition & outbound SMS (Phase 2.2)
