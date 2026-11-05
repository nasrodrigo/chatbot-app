---
name: multimodal-chatbot-ui
description: Build the presentation layer and device-side input workflows for a React Native multimodal chatbot app. Use when asked to create a chatbot interface that accepts text, images, audio, video, camera captures, recordings, or files, while deliberately leaving chatbot intelligence, prompts, backend calls, model integration, and message-generation logic unimplemented.
---

# Multimodal Chatbot UI (React Native / Expo)

Build a polished mobile chat interface and the app-side media acquisition/state layer only. The output must make every user-provided input available to a future chatbot implementation through typed state or a clearly documented submission payload. Do not implement chatbot logic, AI/model calls, backend services, message interpretation, streaming, or persistence unless separately requested.

## 1. Project setup and stack

First inspect the repository and follow the existing conventions. For a new project, follow the `react-native-project-setup` skill:

- Expo managed workflow by default; use bare React Native CLI only when explicitly requested or required by an existing native app.
- TypeScript by default.
- Expo Router for multi-screen apps; keep the app minimal if only one screen is needed.
- Use the repository's package manager and lockfile; otherwise npm.
- Use `npx expo install <package>` for Expo/native dependencies so versions match the installed Expo SDK.
- Read `references/expo-and-cli.md` from the setup skill for scaffold, navigation, and verification commands.

State the stack assumptions briefly before implementation. Do not scaffold over a non-empty target directory or overwrite existing work without permission.

## 2. Scope boundary

### Implement

- Chat screen UI: header, conversation list, message bubbles, timestamps/status placeholders, empty state, composer, attachment tray, previews, remove/retry controls, loading/disabled visual states.
- Text entry and local draft state.
- Device media acquisition: camera photo, image/video library, generic file picker, audio recording, video recording.
- Runtime permissions and clear permission-denied/cancel/error handling.
- Local attachment metadata and URI state, ready for later chatbot integration.
- A typed adapter/callback boundary for handing the draft text and selected attachments to future code.
- Basic accessibility, safe-area handling, keyboard avoidance, and responsive layouts.

### Do not implement

- LLM/chatbot prompts, agent behavior, intent detection, or response generation.
- Network requests, API keys, backend endpoints, upload services, cloud storage, or message persistence.
- Fake assistant replies or simulated AI behavior. Use neutral sample UI data only when necessary to demonstrate layout, and label it as sample data.
- Automatic upload or transmission of media. Acquiring a file and storing its local URI in state is the goal.

If the user asks for chatbot logic later, treat that as a separate scope extension.

## 3. Input capabilities and Expo modules

Inspect the installed Expo SDK and consult the current official Expo documentation before selecting APIs. Install compatible versions with `npx expo install`.

| Capability | Preferred Expo approach | Required behavior |
|---|---|---|
| Take a photo | `expo-camera` (`CameraView`, permission hook, `takePictureAsync`) | Open an in-app camera view, request camera permission when needed, capture, return to chat with preview and metadata. |
| Choose image/video | `expo-image-picker` | Open the system picker, allow image and video selection, handle cancellation, retain each selected asset URI and metadata. |
| Choose arbitrary file | `expo-document-picker` | Open native document picker, preserve name, MIME type, size when available, and URI. Copy to app cache only if the later workflow requires durable local access; document the choice. |
| Record audio | `expo-audio` | Request microphone permission, start/stop recording, expose resulting URI, MIME/format, duration when available, and preview/playback controls. |
| Record video | `expo-camera` (`CameraView` recording APIs) | Request camera and microphone permissions, record/stop, return URI and available dimensions/duration metadata. |

Use `expo-image-picker` for library media rather than implementing a custom gallery browser. A photo capture flow can use `expo-camera`; do not assume the image picker is a live camera preview.

If the selected Expo SDK has changed an API, follow its current official docs rather than copying outdated method names. Avoid mixing legacy and current APIs from different SDK generations.

## 4. Data contract: keep inputs in app state

Create a reusable typed model (adjust names only to match project conventions):

```ts
export type AttachmentKind = 'image' | 'video' | 'audio' | 'file';

export type ChatAttachment = {
  id: string;
  kind: AttachmentKind;
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
  durationMs?: number;
  width?: number;
  height?: number;
  source: 'camera' | 'library' | 'file-picker' | 'audio-recorder' | 'video-recorder';
  createdAt: string;
};

export type ChatDraft = {
  text: string;
  attachments: ChatAttachment[];
};
```

Keep the composer state separate from rendered chat history. At minimum expose:

```ts
const [draftText, setDraftText] = useState('');
const [draftAttachments, setDraftAttachments] = useState<ChatAttachment[]>([]);
```

Create pure helpers for adding, removing, validating, and clearing attachments. Generate stable IDs at acquisition time. Prevent accidental duplicate insertion when a picker callback fires more than once. Do not store raw binary/base64 in React state; store the local URI and metadata.

Provide a future-facing callback, for example:

```ts
type OnSubmitDraft = (draft: ChatDraft) => void;
```

The submit button should call this callback with `{ text, attachments }`, then clear the draft only according to an explicit UX decision. In the scaffolded app, the callback may be a no-op or log metadata in development; it must not call an AI or backend service. Make the boundary obvious in code, e.g. `onSubmitDraft` or `handleDraftSubmit`.

Do not treat a local URI as a permanent URL. Document that URIs can be temporary and that future upload/processing code may need to copy the asset into app-controlled storage or upload it before use.

## 5. UI behavior

Create a single coherent chat screen unless the user requests more screens.

### Composer

- Multiline text input with controlled `draftText`.
- Attachment button opening a small action sheet/menu with: Take photo, Choose photo/video, Choose file, Record audio, Record video.
- Send button enabled when trimmed text is non-empty or at least one attachment exists.
- Show attachment chips/cards above the composer with type icon, filename, optional thumbnail/duration/size, and remove action.
- Support mixed content in one draft: text plus any number of attachments, subject to reasonable app-side limits.

### Previews

- Images: thumbnail preview.
- Videos: thumbnail if available, otherwise video icon, filename and duration.
- Audio: audio icon, filename/duration and a local playback control if straightforward.
- Files: file-type icon, filename and size.
- Avoid autoplaying audio/video.
- Provide a clear error state if a preview cannot load while retaining the attachment metadata when possible.

### Conversation list

Use a message model for UI only. It may render placeholder/sample messages, but do not invent generated assistant responses. Keep the visual message history separate from `ChatDraft` so future chatbot code can own the conversation model.

## 6. Permissions and lifecycle

- Request permissions just in time, when the user selects the relevant action, not all at startup.
- Explain why access is needed before or alongside the native permission prompt when appropriate.
- Handle denied, permanently denied, restricted, cancelled, unavailable hardware, and recording failures without crashing.
- Never assume camera, microphone, or library permission has been granted.
- Stop camera preview and active recordings when leaving the relevant screen or unmounting.
- Prevent simultaneous camera/audio/video recording sessions unless explicitly designed and tested.
- Follow platform requirements for Android and iOS permission descriptions/configuration. Use Expo config plugins/app config as required by the chosen modules and SDK.
- Do not ask for full photo-library access if the system picker can provide selected assets without it.

## 7. Validation and limits

- Validate supported MIME types/extensions and reasonable file-size/duration limits at the UI boundary. If no limits are specified, choose conservative configurable defaults and document them; do not silently discard files.
- Handle missing MIME type, file size, duration, or dimensions as optional metadata.
- Keep the URI and metadata intact when the preview is unavailable.
- Do not read an entire large video/audio file into memory.
- Show user-readable errors and allow removal/retry.

## 8. Suggested code organization

Match the existing project structure. A reasonable Expo Router layout is:

```text
app/
  (tabs)/ or index.tsx
components/chat/
  ChatScreen.tsx
  MessageList.tsx
  ChatComposer.tsx
  AttachmentTray.tsx
  AttachmentPreview.tsx
  AttachmentActionMenu.tsx
hooks/
  useChatDraft.ts
  useMediaAcquisition.ts
lib/media/
  permissions.ts
  attachmentMappers.ts
  validation.ts
types/
  chat.ts
```

Keep platform acquisition APIs out of presentational components. Components should receive callbacks and typed data as props. Keep permission handling and mapping native picker/camera results into `ChatAttachment` in hooks or service helpers.

## 9. Implementation workflow

1. Inspect project files, package manager, Expo SDK, existing navigation, and styling conventions.
2. If no project exists, scaffold using `react-native-project-setup` defaults.
3. Install only the modules needed for requested acquisition features with `npx expo install`.
4. Implement the TypeScript attachment contract and draft-state hook first.
5. Implement the chat layout and composer using controlled state.
6. Implement one acquisition flow at a time: library/file picker, camera photo, audio recording, video recording.
7. Map each native result to `ChatAttachment`; do not leak module-specific asset types into the UI.
8. Add preview, remove, permission, cancellation, and error states.
9. Wire send to the typed local callback boundary only. Confirm there are no model/backend/network calls.
10. Run typecheck, lint, tests, Expo doctor, and Android/iOS Metro exports where possible. Use the setup skill's `scripts/verify.sh` if present.
11. Report what was verified and what still requires a physical device. Camera, microphone, and recording behavior must be tested on real devices or supported development builds; simulators/emulators may not provide all hardware behavior.

## 10. Acceptance checklist

- [ ] Text can be entered, edited, and cleared.
- [ ] Camera photo capture returns a local URI and metadata into the draft.
- [ ] Image and video library selection returns local URIs and metadata.
- [ ] Generic file selection returns URI, filename, and available MIME/size metadata.
- [ ] Audio recording can start, stop, preview, and add its URI to the draft.
- [ ] Video recording can start, stop, preview, and add its URI to the draft.
- [ ] Multiple attachment kinds can coexist with text in one draft.
- [ ] Each attachment can be removed independently.
- [ ] Permission denial and picker cancellation do not crash or corrupt draft state.
- [ ] Send produces a typed `ChatDraft` callback value without invoking chatbot/backend logic.
- [ ] No base64/binary media is stored in React state.
- [ ] No media is uploaded or transmitted by this implementation.
- [ ] Typecheck/lint/bundle checks pass, or remaining failures are reported precisely.

## 11. Handoff

Summarize:

- UI screens/components and device input features implemented.
- The `ChatDraft` / `ChatAttachment` state contract and where the future chatbot implementation receives it.
- Installed Expo modules and any app config/plugin changes.
- Run commands and whether a development build is required.
- Verification results and physical-device checks still needed.
- Explicitly state that chatbot intelligence, API integration, uploads, and persistence were not implemented.
