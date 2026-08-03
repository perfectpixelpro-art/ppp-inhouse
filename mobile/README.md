# PPP HR — Mobile App (React Native / Expo)

A native iOS + Android app for the PPP employee portal. It talks to the **same
backend** as the web app (`https://hr.perfectpixelpro.app/api`) — no new server.

## What's scaffolded
- **Auth** — login + token stored in Expo SecureStore (`src/context/AuthContext.js`).
- **API layer** — axios client with auth interceptor (`src/api/`), mirroring the web app.
- **Navigation** — bottom tabs + auth-gated stack (`src/navigation/RootNavigator.js`).
- **Screens**
  - `LoginScreen` — working.
  - `AttendanceScreen` (In/Out) — working: live timer, check in/out, month balance, history.
  - `MyTasksScreen` — working: Today / Overdue / Upcoming / Completed tabs.
  - `ProfileScreen` — working: user info + logout.
  - `Projects`, `Leave` — placeholders to build next.
- **Theme** — brand colors + status colors (`src/theme.js`).

## First-time setup
```bash
cd mobile
npm install
npx expo start
```
Then scan the QR code with the **Expo Go** app on your phone, or press `a`
(Android emulator) / `i` (iOS simulator).

> The generated icons/splash are not included — add `assets/icon.png` and
> `assets/splash.png`, or run `npx expo install expo-splash-screen` and use
> Expo's defaults. Until then, Expo uses placeholders.

## Point at a local backend (optional)
Create `mobile/.env`:
```
EXPO_PUBLIC_API_URL=http://<your-computer-LAN-IP>:5001/api
```
(Phones can't reach `localhost` — use your machine's LAN IP.)

## Build installable apps
```bash
npm install -g eas-cli
eas build --platform android   # shareable .apk / .aab
eas build --platform ios       # needs an Apple Developer account
```

## What to build next (each mirrors an existing web screen)
1. **Leave** — `myLeaves()` + `applyLeave()` (already in `src/api/employee.js`).
2. **Projects** — `fetchProjects()` list → project detail.
3. **Task detail** — `fetchTask(id)` + `setTaskStatus()` (start / submit / review).
4. **Portfolio** — `fetchPortfolio()` grid of completed tasks.
5. Swap emoji tab icons for `@expo/vector-icons`.
