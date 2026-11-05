# Expo and CLI reference

Read only the sections that match the chosen stack. Commands change between releases; when a flag or
script is rejected, check `--help` or the official docs (docs.expo.dev, reactnative.dev) rather than guessing.

## Contents
- Expo templates
- Testing (jest-expo + RNTL)
- Linting and formatting
- Navigation with React Navigation (bare CLI)
- Environment variables
- Running on devices
- Config files to know

## Expo templates
`create-expo-app` accepts `--template`:
- default (no flag): TypeScript + Expo Router + demo screens
- `blank-typescript`: minimal TypeScript app, no router
- `blank`: minimal JavaScript app
- `tabs`: tab navigation starter (may overlap with the default; check availability)

Add Expo Router to a blank project only if the app needs more than one screen:
```bash
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
```
Then set `"main": "expo-router/entry"` in `package.json` and add a `scheme` to `app.json`. Follow the current
Expo Router installation docs for any additional steps.

## Testing (jest-expo + RNTL)
```bash
npx expo install jest-expo jest @types/jest --dev
npm install --save-dev @testing-library/react-native
```
`package.json`:
```json
{
  "scripts": { "test": "jest --watchAll=false" },
  "jest": { "preset": "jest-expo" }
}
```
Smoke test, `components/__tests__/Hello-test.tsx`:
```tsx
import { render, screen } from '@testing-library/react-native'
import { Text } from 'react-native'

test('renders text', () => {
  render(<Text>Hello</Text>)
  expect(screen.getByText('Hello')).toBeTruthy()
})
```
If the template already includes jest-expo, don't reinstall it. Keep whatever it set up.

## Linting and formatting
Expo's template includes ESLint with `eslint-config-expo`. Use it via:
```bash
npx expo lint
```
Add Prettier without rule conflicts:
```bash
npm install --save-dev prettier eslint-config-prettier
```
`.prettierrc`:
```json
{ "semi": false, "singleQuote": true, "trailingComma": "all" }
```
Add `"format": "prettier --write ."`. Only impose this style if the user has no preference; match existing style otherwise.

## Navigation with React Navigation (bare CLI)
```bash
npm install @react-navigation/native @react-navigation/native-stack react-native-screens react-native-safe-area-context
cd ios && pod install   # macOS only; the user must run this
```
Wrap the app in `<NavigationContainer>` and define screens with `createNativeStackNavigator()`.
Native modules need the iOS pods installed and an app rebuild, which the agent can't do; say so at hand-off.

## Environment variables
Expo: create `.env` with `EXPO_PUBLIC_API_URL=...` and read it as `process.env.EXPO_PUBLIC_API_URL`.
These are inlined into the bundle at build time and visible to anyone with the app. Never store secrets.
Keep `.env*.local` in `.gitignore` and commit a `.env.example`.

## Running on devices
| Goal | Command | Notes |
|---|---|---|
| Quick try on a phone | `npx expo start`, scan QR in Expo Go | No native code beyond Expo Go's built-ins |
| iOS simulator | `npx expo start`, press `i` | macOS + Xcode only |
| Android emulator | `npx expo start`, press `a` | Android Studio + an AVD |
| Custom native code | `npx expo run:ios` / `npx expo run:android` | Generates `ios/`/`android/` via prebuild and compiles |
| Cloud builds | EAS Build (`npx eas-cli build`) | Requires an Expo account; only set up if asked |

## Config files to know
- `app.json` / `app.config.ts`: app name, slug, scheme, icons, splash, bundle identifiers, plugins
- `tsconfig.json`: extends `expo/tsconfig.base`, holds the `@/*` alias
- `metro.config.js`: bundler config; most projects never need to create it
- `eas.json`: EAS build profiles; created only if the user adopts EAS
