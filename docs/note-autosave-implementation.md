# Note Autosave Implementation

This repository already had the core realtime backend behavior needed for collaborative note editing. The change in this task was to make the client send note updates while the user types, instead of waiting for a manual button click.

## What Changed

The implementation lives in the websocket demo client at [tools/ws-demo-client.html](tools/ws-demo-client.html).

The note editor now listens to the `input` event on the textarea and schedules a debounced save. That means every keypress can contribute to a save, but the app waits a short moment before sending the update so it does not flood the server with one request per character.

The old manual button still works. It now reuses the same save path as autosave so there is only one code path for note writes.

## Why This Is Mostly Frontend

The backend already exposed the realtime contract:

1. The client sends `update_note` with `roomName`, `content`, and `clientVersion`.
2. The gateway persists the note through [src/controller/note/note.gateway.ts](src/controller/note/note.gateway.ts).
3. The server broadcasts `note_updated` to everyone in the room.

Because of that, the backend did not need a new event or a new persistence model. The missing piece was simply that the UI only emitted `update_note` when the user clicked the button.

## How The Autosave Works

The client uses three pieces of state:

1. `autosaveTimer` delays the write until typing pauses briefly.
2. `saveInFlight` prevents overlapping writes from being sent at the same time.
3. `saveQueuedWhileInFlight` remembers that the user kept typing while the previous save was still in progress.

That queue matters because this app uses optimistic versioning. Every accepted update increments the note version on the server. If the client sends a later keystroke using an old version number, the server will reject it as a conflict. By waiting for the previous save to finish before sending the next one, the client stays aligned with the server version.

## Event Flow

The flow now looks like this:

1. The user types in the textarea.
2. The client resets a 350 ms timer.
3. When typing pauses, the client emits `update_note`.
4. The server validates the room and version, then stores the new content.
5. The server broadcasts `note_updated` to every socket in the room.
6. Every client updates its visible content and version state.

## Senior-Level Notes

This is a good example of keeping the backend protocol stable while improving the client behavior.

The important design choice is not to fire one database write for every keydown. Even though the UI reacts to every keystroke, the implementation still batches edits with a debounce. That is the practical middle ground between responsiveness and server load.

If you wanted to take this further in a production editor, the next upgrade would be to replace full-content writes with an operational transform or CRDT model. For this codebase, a debounced full-document save is the correct level of complexity.

## Files Involved

- [tools/ws-demo-client.html](tools/ws-demo-client.html)
- [src/controller/note/note.gateway.ts](src/controller/note/note.gateway.ts)

## How To Verify

1. Open the demo client.
2. Connect with a valid token.
3. Join a room and load the snapshot.
4. Type into the note textarea.
5. Confirm the event log shows repeated `update_note` and `note_updated` activity without needing the save button.
