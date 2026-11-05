---
name: react-native-project-setup
description: Scaffold and configure a new React Native mobile app (Expo by default, or the bare React Native CLI when explicitly needed) with TypeScript, file-based navigation, linting, testing, and a verified bundle/type-check. Use this skill whenever the user or agent wants to create, start, bootstrap, initialize, or scaffold a React Native, Expo, iOS, Android, or "mobile app" project, even if they only say "build me a mobile app", "set up an app for iPhone and Android", or name a stack like "Expo + TypeScript" without saying "scaffold". For web-only React apps use react-project-setup instead.
---

# React Native Project Setup

Create a new React Native project that installs cleanly, type-checks, bundles, and is ready for the user to build features on. Mobile projects have a hazard web projects don't: native dependencies must match the framework version exactly, and an agent usually can't run a simulator. So this skill leans on the official tooling to pick compatible versions, and it is honest about what was and wasn't verified.

## 1. Decide the stack (ask only what you can't infer)

Check the request and environment first (existing files, `node -v`, package manager lockfiles). Then settle these, asking about only the choices that are genuinely ambiguous:

| Choice | Default | Switch when |
|---|---|---|
| Framework | **Expo** (managed workflow, with `expo prebuild` available for native code) | Use the **bare React Native CLI** only if the user explicitly asks for it, or is adding React Native to an existing native iOS/Android app. |
| Language | **TypeScript** | Plain JS only if the user says so. |
| Navigation | **Expo Router** (file-based, included in the default Expo template) | **React Navigation** for bare CLI projects, or if the user prefers it. |
| Package manager | What the user/repo already uses; else **npm** | pnpm/yarn/bun if requested or a lockfile exists. |
| Styling | React Native `StyleSheet` | NativeWind, Tamagui, etc. only if requested (see pitfalls). |
| Testing | **jest-expo + React Native Testing Library** | Skip if the user declines. |
| Lint/format | ESLint (Expo's config) + Prettier | Biome if requested. |

State your assumptions in one line before scaffolding so the user can correct them early. Don't add state libraries, UI kits, data-fetching libraries, or backend SDKs unless asked; list them as options at the end.

Read `references/expo-and-cli.md` for the commands and config of whichever choices apply.

## 2. Preflight

1. **Node:** confirm a current LTS (≥ 20) with `node -v`. Fail early with a clear message.
2. **Directory:** the app name should be lowercase with hyphens (Expo) or PascalCase (bare CLI). Stop and ask if the target directory exists and isn't empty.
3. **Network:** scaffolding needs the npm registry. If installs are blocked, do not hand-write a native project (see "No network" below).
4. **Local run targets (informational only):** the user's iOS simulator needs macOS + Xcode; Android needs Android Studio and a JDK. An agent sandbox normally has neither, so don't try to launch them. Mention what the user needs at hand-off.

## 3. Scaffold

**Expo (default):**
```bash
npx create-expo-app@latest <name> --yes
cd <name>
```
The default template already includes TypeScript, Expo Router, and a starter demo. If the user wants a minimal start, use `--template blank-typescript` instead and add a router only if they need multiple screens. Run `npx create-expo-app --help` if a flag is rejected; flags change between releases.

**Bare React Native CLI (only when requested):**
```bash
npx @react-native-community/cli@latest init <Name> --pm npm --skip-git-init
```
(`npx react-native init` is deprecated; don't use it.)

Then apply only the extras chosen in step 1.

**Installing libraries in Expo projects:** use `npx expo install <pkg>` instead of `npm install <pkg>` for anything with native code (and as a habit for everything Expo-related). It picks the version compatible with the project's Expo SDK. A plain `npm install` can pull an incompatible native module that builds fine and then crashes on device.

## 4. Structure and cleanup

- The default Expo template ships demo screens and example components. If the user wants a clean slate, run `npm run reset-project` (it moves the demo into an `app-example/` folder and leaves a blank `app/`), then delete `app-example/` unless the user wants to keep it. If that script doesn't exist in the generated project, remove the demo files by hand.
- Keep whichever layout the template generated (Expo Router uses `app/` or `src/app/` for routes). Put reusable pieces in `components/`, hooks in `hooks/`, and helpers in `lib/` or `utils/`, matching the template's existing convention.
- The default template configures a `@/*` path alias in `tsconfig.json`; use it rather than long relative imports.
- Update `app.json` (`name`, `slug`, `scheme`, and for bare/prebuild projects the bundle identifier and Android package) to match the user's app. Ask for the bundle identifier (e.g. `com.company.app`) if it matters; otherwise leave the default and flag it in the hand-off, because it's painful to change after store submission.
- Add a short `README.md` listing install/run/test commands and the folder layout. Make sure `.gitignore` covers `node_modules`, `.expo`, `dist`, `ios/` and `android/` (for Expo managed projects these are generated), and `.env*.local`.

## 5. Verify before declaring success

An agent can't usually run a simulator, but it can still prove a lot:

```bash
bash scripts/verify.sh <project-dir>            # type-check, lint, tests, Expo doctor
bash scripts/verify.sh <project-dir> --bundle   # also does a full Metro bundle for Android + iOS
```

The script runs only what exists in the project and reports each result. Use `--bundle` for the final check on an Expo project; it catches import errors and missing dependencies that type-checking misses. Fix failures; don't hand back an unverified project without saying so.

**Never run `npx expo start` or `npm start` in the foreground.** It is long-running and interactive, and will hang the agent. Tell the user to run it.

## No network

Don't hand-write a native project. Expo SDK, React, React Native, and native module versions are tightly coupled, and guessed version numbers produce a project that won't install or run. Instead, give the user the exact commands from step 3 and the list of customizations you would have applied, and say clearly that nothing was created or verified.

## 6. Hand-off

End with a brief summary:
- What was created, the stack, and your assumptions (including anything left at a default like the bundle identifier)
- How to run it: `npx expo start`, then press `i` (iOS simulator, macOS only), `a` (Android emulator), or scan the QR code with Expo Go on a phone
- Whether Expo Go is enough: it works for most apps, but libraries with custom native code need a **development build** (`npx expo run:ios` / `run:android`, or EAS Build)
- What was verified and what wasn't (device/simulator behavior is never verified by the agent)
- One line of optional next steps (state management, data fetching, UI library, EAS Build/Submit, OTA updates) so the user can opt in

## Common pitfalls

- **Interactive prompts hang agents.** Pass flags (`--yes`, `--template`, `--pm`) and check `--help` rather than waiting on a prompt.
- **Version drift:** use `npx expo install`, and run `npx expo install --check` to find mismatched packages. After an SDK upgrade, run `npx expo-doctor`.
- **Styling libraries:** NativeWind, Tamagui, and similar tools need babel/metro config changes that vary by version. Follow their current official install guide for the installed versions; don't reproduce setup from memory.
- **Env vars:** only variables prefixed with `EXPO_PUBLIC_` reach app code, and they are embedded in the shipped bundle. Never put secrets in them.
- **Mixed package managers:** one lockfile per project.
- **Web target:** `react-native-web` is a separate install; add it only if the user wants the app to run in a browser.
- **Existing project:** if one already exists, add to it instead of scaffolding on top, and ask before changing native configuration.
