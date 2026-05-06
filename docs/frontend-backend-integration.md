# Frontend And Backend Integration Guide

This note explains how the demo page in [tools/ws-demo-client.html](tools/ws-demo-client.html) talks to the NestJS websocket backend, and why the UI is responsible for most of the realtime behavior.

## Big Picture

The backend already owns the persistent source of truth. The frontend is responsible for:

1. connecting to the socket server,
2. joining a room,
3. collecting the note content from the editor,
4. sending updates as the user types,
5. rendering any server broadcasts back into the UI.

The backend is responsible for:

1. authenticating the socket,
2. resolving the room,
3. saving the note,
4. incrementing the version,
5. broadcasting note updates and conflicts.

That split is important. The frontend controls interaction timing, but the backend controls correctness.

The practical implication is simple: the backend should stay boring and predictable, while the frontend should absorb the friction of typing, buffering, and user feedback.

## Frontend Event Flow

The demo client follows this sequence:

1. The user enters the socket URL and JWT token.
2. The client opens a Socket.IO connection with the token in the handshake query.
3. The user joins a room.
4. The client asks the backend for a note snapshot.
5. The editor listens for `input` events.
6. Typing schedules a debounced `update_note` emit.
7. The server responds with either `note_updated` or `note_conflict`.
8. The UI updates the textarea, version field, and status display from that server response.

That flow matters because the user never manually “submits” a note in the product sense. The frontend is effectively publishing edit intent continuously, and the backend is confirming which edit became the source of truth.

## Why The UI Uses Debounce

The editor does not send a websocket message on every single keystroke immediately. Instead, it waits a short pause before writing.

That gives three benefits:

1. fewer writes to the database,
2. less network chatter,
3. a smoother typing experience.

The client also keeps a small in-flight queue so a second update can be scheduled safely while the previous save is still being acknowledged.

Without that queue, a user who types quickly would produce overlapping websocket writes and version mismatches. Debounce handles frequency; the in-flight guard handles ordering.

## Data Contract

The frontend sends this payload when it saves:

```json
{
  "roomName": "test-room",
  "content": "current editor text",
  "clientVersion": 3
}
```

The backend uses that payload in [src/controller/note/note.gateway.ts](src/controller/note/note.gateway.ts) to:

1. resolve the room by name,
2. validate the content and version,
3. persist the note,
4. broadcast `note_updated` or `note_conflict`.

If the content is empty, that is still a valid edit. The backend should distinguish between an intentionally empty note and a missing payload.

## What The Frontend Updates

When the server emits `note_updated`, the client:

1. writes the canonical content back into the textarea,
2. updates the version input,
3. updates the on-screen status and metrics.

When the server emits `note_conflict`, the client:

1. restores the latest server content,
2. updates the version input,
3. keeps the user from silently overwriting a newer edit.

The UI also mirrors the latest accepted version back into the numeric version field so the next autosave stays aligned with the server.

## Why This Was Mostly Frontend Work

The realtime backend already existed. The UI change was to stop treating note updates as a button-driven action and start treating them as an editing flow.

In other words, the server already knew how to store and broadcast note changes. The frontend had to learn when to send those changes.

That is the reason this feature improved a lot without a backend rewrite: the server already had the correct primitives.

## Practical Mental Model For A Junior Engineer

Think of the frontend as the conductor and the backend as the ledger.

The conductor decides when a note should be saved, but the ledger decides whether the save is valid and what version becomes official.

That is why the frontend can create a much better typing experience without changing the core backend architecture.

Put more concretely:

1. Frontend decides when to emit.
2. Backend decides whether to accept.
3. Frontend renders the accepted answer back to the user.

That loop is the backbone of most realtime editors.

## Implementation Notes

The current client uses a few small pieces of state to make the experience feel stable:

1. `autosaveTimer` waits for typing to pause.
2. `saveInFlight` prevents duplicate overlapping writes.
3. `saveQueuedWhileInFlight` ensures a newer edit still gets sent after the previous one finishes.
4. `latestVersion` keeps the client and server in sync after every accepted update.

Those controls are what make the UI feel responsive without making the backend do unnecessary work.

## Files To Read Together

- [tools/ws-demo-client.html](tools/ws-demo-client.html)
- [src/controller/note/note.gateway.ts](src/controller/note/note.gateway.ts)
- [src/repository/note.repository.ts](src/repository/note.repository.ts)
