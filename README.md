# ChatBot App

ChatBot App is a full-stack chatbot application with a React Native and Expo client and a TypeScript API. The app supports text conversations and attachments such as photos, videos, files, and voice notes.

## Project structure

```text
chatbot-app/
├── ui/  # Expo React Native client
└── api/  # Express 5 and TypeScript API
```

The mobile client creates conversations through the API and sends messages to the LangChain-backed chatbot service. Conversations currently use in-memory storage and reset when the API process restarts.

## Features

- Text chat with persistent conversation IDs during the current API session
- Light and dark interface themes
- Photos and videos from the device library
- Camera photos and video recordings
- Document attachments
- Voice recording
- Google Gemini integration through LangChain and LangGraph

## Prerequisites

- Node.js 22 or newer
- npm
- A Google API key with access to the configured Gemini model
- Expo CLI support on the Android or iOS device
- Android Studio, an Android emulator, or a physical device

## API setup

From the repository root:

```powershell
cd api
Copy-Item .env.example .env
npm install
```

Add the Google API key to `api/.env`:

```dotenv
GOOGLE_API_KEY=your_api_key_here
```

The supported API configuration is:

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `GOOGLE_API_KEY` | Yes for chat replies | None | Google API key used by the chatbot service |
| `PORT` | No | `3000` | HTTP server port |
| `LOG_LEVEL` | No | `info` | Pino log level |
| `NODE_ENV` | No | `development` | Runtime environment |
| `CORS_ORIGIN` | No | None | Comma-separated browser origins allowed by CORS |

Start the API:

```powershell
npm run dev
```

The API listens on `http://localhost:3000` by default. Verify it with:

```powershell
Invoke-WebRequest http://localhost:3000/health
```

## Mobile app setup

Open a second terminal:

```powershell
cd ui
npm install
npx expo start
```

Then press:

- `a` to open an Android emulator
- `i` to open the iOS simulator on macOS
- Scan the QR code with Expo Go on a compatible device

### Connect to the API

The client defaults to:

- Android emulator: `http://192.168.2.32:3000`
- Other platforms: `http://localhost:3000`

For a physical Android device or a different emulator network, create `ui/.env.local`:

```dotenv
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_LAN_IP:3000
```

Restart Expo after changing the environment file. On Windows, allow inbound traffic to the API port if the device cannot connect:

```powershell
New-NetFirewallRule -DisplayName "Chat Cheff API" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

Use the computer's LAN IP rather than `localhost` when running on a physical device.

## API endpoints

All resource endpoints are under `/api/v1`.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Check API health |
| `GET` | `/api/v1/conversations` | List conversations |
| `POST` | `/api/v1/conversations` | Create a conversation |
| `GET` | `/api/v1/conversations/:id` | Get a conversation |
| `DELETE` | `/api/v1/conversations/:id` | Delete a conversation |
| `POST` | `/api/v1/conversations/:id/messages` | Send a message and receive a Gemini response |

## Development commands

### API

```powershell
cd api
npm run dev       # Development server with auto-reload
npm test          # Run tests
npm run typecheck # TypeScript type-check
npm run lint      # Run ESLint
npm run build     # Compile to dist/
npm start         # Run the compiled API
```

### Mobile app

```powershell
cd ui
npx expo start
npx tsc --noEmit
npx expo-doctor
npx expo export --platform android
npx expo export --platform ios
```

Camera, microphone, and recording features may require a compatible development build or physical device for reliable hardware testing.

## Notes and limitations

- Conversations and messages are stored in memory and are lost when the API restarts.
- Attachment content is included in API requests; production deployments should enforce appropriate request-size and storage limits.
- The API is intended for local development unless secured and deployed with the appropriate infrastructure.
