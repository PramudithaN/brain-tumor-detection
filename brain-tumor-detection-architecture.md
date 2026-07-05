# Brain Tumor Detection System — Architecture & Implementation Plan

## 1. Goal

A web app where a user uploads a brain MRI image and gets an ML-generated tumor prediction back. Two usage modes:

- **Guest mode** — upload and get a result immediately, nothing saved.
- **Logged-in mode** — same flow, but the scan and result are saved to that user's history.

---

## 2. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + TypeScript + Material UI | Type safety, component consistency, fast to build clean medical UI |
| Backend | **FastAPI (Python)** | Same language as your ML model — no cross-language model serving. Native async. Pydantic gives you request/response validation out of the box, which matters a lot for a medical-data app. Auto-generated OpenAPI docs. |
| ML serving | Model loaded in-process inside FastAPI (or as an internal module) | Avoids a second network hop for every prediction; simplest path to production for a single model |
| Database + Auth + Storage | Supabase (Postgres + Supabase Auth + Supabase Storage) | One managed backend for auth, relational data, and file storage with row-level security |

FastAPI over Django/Flask specifically because: Django's ORM and admin overhead is unnecessary since Supabase is your database layer, not FastAPI's; Flask lacks built-in async and validation, which you'd have to bolt on manually.

---

## 3. Monolith vs. microservices — decision

**Build a modular monolith.** One FastAPI codebase, cleanly separated into internal modules:

```
backend/
  app/
    auth/          # token verification against Supabase
    validation/    # file type, size, content checks
    inference/     # model loading, preprocessing, prediction
    records/       # CRUD against scan_records table
    main.py
```

Why not microservices now:
- One ML model, one small team — splitting services adds deployment and network overhead with no corresponding benefit.
- Inference is the only part of this system likely to need different scaling (e.g., GPU) than the rest of the API. Because it's already isolated as its own module with a clean interface, you can extract *just* that module into a separate service later (e.g., behind a queue, or on a GPU-backed instance) without rewriting the auth, validation, or records logic.

Re-evaluate this decision when: inference latency starts blocking other API requests, you need independent scaling for inference vs. everything else, or you add a second ML model with different infra needs.

---

## 4. Request flow

**Guest user:**
1. Opens app, skips login.
2. Uploads MRI image.
3. Frontend validates file client-side (type/size) → sends to `POST /api/predict` with no auth token.
4. Backend validates again server-side, runs inference, returns result.
5. Frontend displays result. Nothing is written to the database.

**Logged-in user:**
1. Logs in via Supabase Auth (email/password or OAuth) → receives a JWT.
2. Uploads MRI image → frontend sends file + JWT to `POST /api/predict`.
3. Backend verifies the JWT, validates the file, runs inference.
4. Backend uploads the image to Supabase Storage and inserts a row into `scan_records` linked to `user_id`.
5. Frontend displays the result; user can later view it under "History."

---

## 5. Database design (Supabase / Postgres)

Supabase Auth manages the `auth.users` table automatically. You only need:

```sql
create table public.scan_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  image_path text not null,
  prediction_label text not null,
  confidence numeric(5,4) not null,
  model_version text not null,
  created_at timestamptz not null default now()
);

alter table public.scan_records enable row level security;

create policy "Users can view their own records"
  on public.scan_records for select
  using (auth.uid() = user_id);

create policy "Users can insert their own records"
  on public.scan_records for insert
  with check (auth.uid() = user_id);
```

**Storage:** a private bucket, e.g. `brain-scans`, with an RLS-equivalent storage policy restricting access to the owning user's folder path (`brain-scans/{user_id}/{file}`).

Guest uploads never touch this table — the backend simply doesn't call the insert when there's no authenticated user.

---

## 6. API endpoints

| Endpoint | Auth | Purpose |
|---|---|---|
| `POST /api/predict` | Optional | Accepts image, returns prediction. Saves to DB only if a valid JWT is present. |
| `GET /api/history` | Required | Returns the logged-in user's past scan records. |
| `GET /api/history/{id}` | Required | Returns one record's detail. |
| `DELETE /api/history/{id}` | Required | Deletes a record (and its stored image). |

Auth is handled by validating the Supabase JWT on the backend (Supabase gives you a JWKS endpoint / secret to verify tokens with) — the backend never manages passwords itself.

---

## 7. Validation checklist

**Client-side (fast feedback, not trusted alone):**
- File type restricted to `image/jpeg`, `image/png` (add DICOM handling only if you actually need it — it's a different pipeline)
- Max file size (e.g. 10 MB)
- Basic dimension check before upload

**Server-side (source of truth):**
- Re-check MIME type from actual file bytes, not just the extension
- Re-check file size
- Reject corrupted/unreadable images before they reach the model
- Rate-limit `/api/predict` per IP or per user to prevent abuse of the inference endpoint
- Validate JWT signature and expiry on every protected route
- Sanitize any filename before using it in a storage path
- Return clear, non-technical error messages to the frontend (e.g. "Please upload a JPG or PNG under 10MB")
- Display a visible disclaimer in the UI that this tool does not provide a medical diagnosis and results should be confirmed by a radiologist

---

## 8. UI design direction

**Color palette (70/20/10 rule):**

Medical interfaces need to read as calm, clean, and trustworthy — cool blues/teals dominate real diagnostic software (PACS viewers, hospital dashboards), with white space doing most of the work.

- **70% — Neutral base:** off-white background `#F7FAFC`, white cards `#FFFFFF`, dark slate text `#1E293B`
- **20% — Primary (clinical teal-blue):** `#0F6674` for headers, nav, primary buttons, active states — reads as clean and medical without feeling cold
- **10% — Accent:** a warm coral `#E8593C` used *only* for the upload CTA and for surfacing high-attention results (e.g. "tumor detected") — reserve pure red (`#D32F2F`) strictly for error/failure states, not for prediction results, so users don't confuse "the app broke" with "the model found something"

**Typography:** Inter or IBM Plex Sans — both are highly legible at small sizes, have a clinical/neutral character (not playful), and render well in Material UI's typography system out of the box.

**MUI theme starting point:**
```ts
const theme = createTheme({
  palette: {
    primary: { main: '#0F6674' },
    secondary: { main: '#E8593C' },
    error: { main: '#D32F2F' },
    background: { default: '#F7FAFC', paper: '#FFFFFF' },
    text: { primary: '#1E293B', secondary: '#64748B' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
  },
  shape: { borderRadius: 10 },
});
```

**Layout principles:**
- Generous white space, one primary action per screen (upload)
- Result screen: large, unambiguous label + confidence score, not buried in a table
- History view: simple card list — thumbnail, date, result, confidence
- Disclaimer text persistently visible near the result, not hidden in a footer

---

## 9. Implementation plan

**Phase 1 — Foundation**
- Set up Supabase project: Auth providers, `scan_records` table + RLS policies, storage bucket + policies
- Scaffold FastAPI backend with the modular folder structure above
- Scaffold React + TS app with MUI theme applied

**Phase 2 — Core upload & inference flow**
- Build `/api/predict` endpoint: file validation → preprocessing → model inference → response
- Wire up the model (load once at app startup, not per-request)
- Build the upload UI: drag-and-drop, client-side validation, loading state, result display

**Phase 3 — Auth & history**
- Add Supabase Auth to frontend (login/signup screens)
- Add JWT verification middleware in FastAPI
- Update `/api/predict` to conditionally save records when authenticated
- Build `/api/history` endpoints and the History page in the frontend

**Phase 4 — Hardening**
- Server-side validation edge cases (corrupted files, oversized images, wrong MIME spoofed as correct extension)
- Rate limiting on the predict endpoint
- Error states and empty states in the UI
- Add the medical disclaimer copy and confirm it's visible on every result screen

**Phase 5 — Polish & deploy**
- Loading skeletons, responsive layout pass
- Deploy backend (e.g. Render/Fly.io — same territory you already use for other services), frontend to Vercel, confirm CORS and env vars
- Smoke-test guest flow and logged-in flow end to end

---

## 10. Future extraction point (if needed later)

If inference load ever needs to scale independently (e.g. GPU autoscaling, queueing for high volume), the `inference/` module can be pulled out into its own FastAPI service behind an internal API or a task queue (Celery + Redis — a pattern you've already used before), without touching auth, validation, or records logic in the main service.
