# Expo media implementation notes

This reference is intentionally version-aware. Expo native modules must match the project's Expo SDK. Before coding, consult the current official docs and use `npx expo install` rather than guessing package versions.

## Module selection

- `expo-camera`: live camera preview, photo capture, and video recording with `CameraView`.
- `expo-image-picker`: native photo/video library selection and optional system camera handoff where appropriate.
- `expo-document-picker`: arbitrary document/file selection.
- `expo-audio`: microphone permission, audio recording, and playback. Follow the current Expo Audio API for the installed SDK; do not use deprecated `expo-av` recording examples in a new project unless the SDK documentation explicitly requires them.

## Installation pattern

```bash
npx expo install expo-camera expo-image-picker expo-document-picker expo-audio
```

Install only modules actually used. Then run:

```bash
npx expo install --check
npx expo-doctor
```

## Documentation entry points

- Camera: https://docs.expo.dev/versions/latest/sdk/camera/
- Image Picker: https://docs.expo.dev/versions/latest/sdk/imagepicker/
- Document Picker: https://docs.expo.dev/versions/latest/sdk/document-picker/
- Audio: https://docs.expo.dev/versions/latest/sdk/audio/

## Development build considerations

Expo Go includes a fixed set of native modules. If a selected module/API or config plugin is not supported by the installed Expo Go client, create a development build and rebuild after native configuration changes. Do not claim device capture works based only on a successful TypeScript build or Metro export.

## URI handling

Picker and recorder results commonly provide local file URIs. Keep those URIs as opaque strings and pass through metadata. Their lifetime and accessibility can vary by platform and source. If later processing requires durable access, copy into app-controlled storage or upload in the separate integration layer. Do not assume a URI is an HTTP URL or can be used after app data is cleared.
