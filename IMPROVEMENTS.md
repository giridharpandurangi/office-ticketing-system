# Improvements Log

All changes made to the codebase beyond the original implementation.

---

## Backend

### Bug Fixes
- **SQL query placeholders** (`routes/tickets.js`) — Filter params were missing the `$` prefix (e.g. `$1`, `$2`), causing all filtered ticket queries to fail with a database error.
- **File upload MIME type check** (`routes/tickets.js`) — The old regex never matched `application/pdf` or Word MIME types. Replaced with a proper `Set` of allowed MIME types.
- **Assignment-only updates** (`routes/tickets.js`) — Assigning a ticket without changing status no longer requires a comment (only status changes do). Previously this would return a 400 error.

### Security
- **Helmet** (`server.js`) — Added `helmet` middleware for standard HTTP security headers (X-Frame-Options, CSP, etc.).
- **CORS** (`server.js`) — Left open (`cors()`) intentionally. This is a local office network app and restricting CORS caused login failures due to how the React dev proxy forwards requests. Not a concern for a LAN-only deployment.
- **Rate limiting** (`server.js`) — Added `express-rate-limit`: 10 requests/15min on auth endpoints, 200/15min on all other API routes.
- **JWT secret guard** (`server.js`) — Server now refuses to start if `JWT_SECRET` is missing or still set to the default placeholder value.
- **Admin ticket access** (`routes/tickets.js`) — Admins can now update ticket status, not just engineers. The `engineerOnly` middleware was replaced with an inline check for `engineer || admin`.
- **nodemailer upgrade** — Upgraded from `<=8.0.4` to `8.0.7` to fix a high-severity SMTP command injection vulnerability (CVE: GHSA-c7w3-x93f-qmm8 and others).

---

## Frontend

### Bug Fixes
- **Hardcoded `localhost:5200`** (`pages/TicketDetail.js`) — Attachment links pointed to `http://localhost:5200/uploads/...`, breaking for any user not on the same machine. Changed to relative `/uploads/` path.
- **`badge-in_progress` CSS mismatch** (`App.css`) — The CSS class was `badge-in-progress` (hyphen) but the status value from the database is `in_progress` (underscore). Added both selectors so the badge renders correctly.
- **Description truncation** (`pages/Dashboard.js`) — `"..."`  was always appended even for short descriptions. Now only added when the description actually exceeds 100 characters.
- **Admin "View Tickets" button** (`pages/AdminPanel.js`) — Button existed but had no `onClick` handler. Now navigates to the dashboard.
- **Navbar `<a href>` tags** (`App.js`) — Replaced with React Router `<Link>` to avoid full page reloads on navigation.
- **Corrupted localStorage guard** (`App.js`) — Added try/catch around `JSON.parse(userData)` so a corrupted stored value doesn't crash the app on load.

### UX Improvements
- **Double-submit prevention** (`Dashboard.js`, `TicketDetail.js`, `AdminPanel.js`) — All form submit buttons are disabled while a request is in flight. Loading text shown on the button.
- **Category filter** (`pages/Dashboard.js`) — The filter bar was missing a category dropdown even though the backend supported it. Added.
- **Context-aware heading** (`pages/Dashboard.js`) — Dashboard title now shows "My Tickets" for regular users and "All Tickets" for engineers/admins.
- **Role change confirmation** (`pages/AdminPanel.js`) — Changing a user's role in the dropdown now shows a confirmation dialog before calling the API. Previously it fired immediately on any dropdown change.
- **Pagination** (`pages/Dashboard.js`) — Ticket list now paginates at 10 per page instead of loading everything at once.
- **Comment styling** (`pages/TicketDetail.js`) — Comments now have a left border accent and better spacing. Timestamps aligned to the right.
- **Description whitespace** (`pages/TicketDetail.js`) — Added `white-space: pre-wrap` so multi-line descriptions and comments render correctly.
- **Mobile responsiveness** (`App.css`) — Added a `@media (max-width: 768px)` block: navbar wraps, filters stack vertically, table hides less important columns, cards have reduced padding.

### Code Quality
- **Shared Axios instance** (`src/api/axios.js`) — Created a single Axios instance with request/response interceptors. All pages now import `api` from this file instead of manually calling `localStorage.getItem('token')` and setting `Authorization` headers in every component. The response interceptor also handles 401s globally by clearing storage and redirecting to `/login`.
- **`useCallback` on fetch functions** (`pages/Dashboard.js`) — `fetchTickets` and `fetchCategories` were missing `useCallback`, causing React lint warnings and potential stale closure bugs in `useEffect`.

---

## New Files
| File | Purpose |
|------|---------|
| `frontend/src/api/axios.js` | Shared Axios instance with auth interceptor |
| `IMPROVEMENTS.md` | This file |

## Dependencies Added
| Package | Version | Reason |
|---------|---------|--------|
| `helmet` | 8.0.0 | HTTP security headers |
| `express-rate-limit` | 7.5.0 | Brute-force protection on auth routes |
| `nodemailer` | 8.0.7 | Upgraded from vulnerable version |
