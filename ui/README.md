# Chat Cheff

A minimalist React Native chatbot interface built with Expo and TypeScript. It includes light and dark themes plus a typed local draft submission boundary for text, images, videos, files, and voice notes.

## Run

```powershell
npm install
npx expo start
```

Press `a` for Android, `i` for iOS (macOS only), or scan the QR code with Expo Go. Camera, microphone, and recording features require a compatible development build/device for reliable hardware testing.

The Android emulator uses `10.0.2.2` to reach the API running on the host PC. For a physical Android device, set `EXPO_PUBLIC_API_URL` in `ui/.env.local` to the PC's LAN IP (for example, `http://192.168.1.10:3000`) and restart Expo. The Windows firewall must allow inbound TCP traffic on port 3000:

```powershell
New-NetFirewallRule -DisplayName "Chat Cheff API" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

## Implementation

- UI and draft state: `App.tsx`
- Attachment contract: `types.ts`
- Media stays as local URIs and metadata; nothing is uploaded or sent to a model or backend.
- Sending a message calls the local `submit()` boundary, where future chatbot integration can be added.

## Verify

```powershell
npx tsc --noEmit
npx expo-doctor
npx expo export --platform android
npx expo export --platform ios
```
