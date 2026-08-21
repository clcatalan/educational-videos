# iOS App — Backend & Admin Portal Integration

This directory holds the native iOS client for the Educational Lecture Platform. There is no separate mobile API — this app is just another REST client of the same Express/Postgres backend that powers `frontend/` (the learner web app) and `admin/` (the content management portal).

## Before you start

1. Get the backend running locally (see the root `README.md` "Backend Setup" section):
   ```bash
   cd backend
   npm install
   createdb tmr_lectures
   cp .env.example .env   # edit DATABASE_URL if needed
   npm run db:migrate
   npm run db:seed
   npm run dev             # listens on http://localhost:5001
   ```
2. Optionally run the admin portal if you need to attach a quiz link to a lecture to test against:
   ```bash
   cd admin
   npm install
   npm start                # http://localhost:3001
   ```

## Connecting to the backend

- Base URL for local dev:
  - **iOS Simulator**: `http://localhost:5001` works directly — the simulator shares your Mac's network stack.
  - **Physical device** on the same Wi-Fi: use your Mac's LAN IP instead of `localhost`, e.g. `http://192.168.x.x:5001`.
- **App Transport Security**: the local backend serves plain HTTP, not HTTPS. Add a temporary ATS exception for your dev host in `Info.plist` (`NSAppTransportSecurity` → `NSExceptionDomains`). Don't ship that in production — production should sit behind HTTPS.
- CORS is wide open on the backend (`app.use(cors())`), but that only matters for browsers anyway — native HTTP clients aren't subject to it.

## Auth model

There's no token/session auth yet — intentionally minimal at this stage of the project:

- `POST /api/auth/register` `{ username }` → `{ user }`
- `POST /api/auth/login` `{ username }` → `{ user }` (no password check)

`user` shape:
```json
{
  "id": 5,
  "username": "admin",
  "isAdmin": true,
  "preferredLectureIds": [1, 3],
  "preferencesSet": true
}
```

Persist `user.id` on-device (Keychain is fine, even though the web app just uses `localStorage`). Regular learner endpoints below don't need any auth header. Only admin-only endpoints (under `/api/admin/*`, used by the admin portal, not this app) require an `x-user-id` header belonging to a user with `isAdmin: true`.

## Endpoints this app will need

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/lectures` | List lectures. Optional `?category=` filter. |
| GET | `/api/lectures/:id` | Single lecture detail. |
| GET | `/api/categories` | Distinct category list, for filter chips. |
| GET | `/api/lectures/:id/quiz` | `{ id, lectureId, link }`, or 404 if no quiz link has been set for that lecture yet. |
| POST | `/api/users/:id/watched` | Body `{ lectureId }` — records/bumps watch history. |
| PUT | `/api/users/:id/preferences` | Body `{ preferredIds: number[] }` — saves the learner's lecture interests. |

Lecture object shape:
```json
{
  "id": 1,
  "title": "Unbelievable Moments from Planet Earth | 20 Years of Planet Earth",
  "description": "...",
  "instructor": "BBC Earth",
  "duration": "29m",
  "category": "Documentary",
  "thumbnail": "https://img.youtube.com/vi/.../hqdefault.jpg",
  "videoUrl": "https://www.youtube.com/embed/..."
}
```

## Content lives in the admin portal, not this app

Lecture metadata and quiz links are authored in `admin/` (port 3001), not in this app or the backend directly. This app is a read-only consumer:

- Don't build a quiz-authoring UI on iOS.
- For "show the user a link once a condition is met," mirror `frontend/src/components/QuizConfirmDialog.js`: once a video ends, the web app calls `GET /api/lectures/:id/quiz` and, if a link is present, shows it in a modal that hands off to the browser rather than rendering the quiz in-app. On iOS, that's `SFSafariViewController` / `UIApplication.shared.open(url)`. Reuse that same "fetch a link, hand off externally" shape for any other link-driven flow rather than re-implementing quiz UI on-device.
- If a lecture has no quiz link yet, `GET /api/lectures/:id/quiz` returns 404 — treat that as "nothing to show," same as the web client does.

## Local dev checklist

- [ ] Backend running on `:5001`
- [ ] DB migrated + seeded
- [ ] Admin portal running on `:3001` if you need to attach a quiz link for testing
- [ ] App's base URL config points at your Mac's LAN IP if testing on a physical device, not `localhost`
