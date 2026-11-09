# AGENTS.md — Sports Competition & Player Recognition Platform

> Read this before any task.
> If a request conflicts with a rule here, stop and ask.
> Keep changes small, explicit, testable, and aligned with the approved business model.
> Read https://nuxt.com/llms.txt before doing ANY Nuxt related tasks. MUST read AT LEAST the summary, even for minor tasks.
> Use pnpm instead of npm and npx.

---

## Project

Web application for managing sports competitions, teams, players, rosters, matches,
disciplinary sanctions, and pre-match player verification using facial recognition.

Main users:

- **Administrator**: manages sports, competitions, teams, players, rosters, player photos,
  historical imports, and configuration.
- **Referee**: manages assigned matches, performs pre-match group scans, reviews player
  eligibility, manually resolves recognition failures, and records/consults sanctions.

---

## Stack

### Frontend
- Vue (with Nuxt 4.5)
- TypeScript

### Backend
- Python
- Flask
- SQLAlchemy
- Pydantic v2
- `flask-openapi3` v4
- OpenAPI 3.1

### Database
- PostgreSQL

### Facial recognition
- `face_recognition`
- `cv2`
- `numpy`

Do not introduce additional frameworks, migration tools, recognition libraries,
databases, queues, caches, or infrastructure unless explicitly approved.

Use TypeScript strictly where practical, avoid using `any`. Use vue composition API,

Always account for:
- loading;
- empty;
- success;
- error states.

## Validation

Always assume the developer is already running the dev server to test the app, so (unless it's strictly relevant) 
don't check the HTML output after doing changes, and NEVER start a new dev server. 

Instead, help the dev to find/test/check the user interface by themself.

Other types of checks are OK, like formatting, compilation, etc.

---

## Repository structure

> Refer to nuxt documentation about directory-structure if necessary.

## Implemented competition domain

- A Competition belongs to one Sport, uses `male` or `female`, accepts duplicate names,
  and is created atomically with all participants.
- Each Competition registers one even number of enabled Teams from 4 through 16 and
  exactly one distinct referee per two Teams.
- Registered Teams, Players, and referees must match the approved Sport, gender, role,
  membership, and roster-capacity rules.
- A Competition roster is a historical snapshot. A Player may represent only one Team
  in a Competition, and later Team/Player changes never rewrite that snapshot.
- Competition and Match datetimes are timezone-aware. Retroactive Match scheduling and
  global Team/referee schedule overlaps are rejected.
- The Match draw has exactly three randomized rounds. Every Team plays once per round
  against three different opponents, and every selected referee handles one Match per
  round.
- Draws may be replaced only while every Match is incomplete. Participant snapshots
  become immutable once Matches exist.
- Competition status is `scheduled`, `in_progress`, `finished`, or `discarded`; Match
  status is `incomplete`, `scheduled`, `in_progress`, or `finished`. Time-derived states
  are reconciled on relevant API access without background infrastructure.
- Competition deletion is soft disable. Physical Competition and Match deletion,
  progressive enrollment, manual pairing, phases, results, points, and standings are
  not implemented.

## Implemented player domain

- A Player has a generated integer identifier and belongs to exactly one Sport.
- Player `gender` accepts only `male` or `female`.
- A Player may be associated with zero through three enabled Teams whose Sport and
  gender match the Player.
- A Team may have at most its Sport's `max_players` associated Players.
- Players and Teams use soft disable; neither has a physical delete endpoint.
- Disabling a Player or Team permanently removes its current Team associations in the
  same transaction. Re-enabling it does not restore them.
- General Team membership is not a Competition roster and must not introduce
  Competition behavior.
- The implemented Player model has no document, nationality, or facial embedding data.
- An enabled Player may have zero through three base photos. Automatic recognition
  requires at least one; zero photos leaves the Player for manual resolution. The
  maximum must remain correct under concurrent uploads.
- Player base photos are PNG/JPG files of at most 5 MiB (5,242,880 bytes), between
  320x320 and 4096x4096 pixels, and at most 12,000,000 total pixels. Each accepted
  photo must contain exactly one visible face whose detected box is at least 160x160
  pixels.
- Upload-only face validation uses `face_recognition.face_locations` with the HOG
  model and the library's other documented defaults. It detects faces only: it must
  not create embeddings, compare identities, or introduce a recognition threshold.
- Base-photo files live on the local disk of the single backend machine in
  `PLAYER_PHOTOS_DIR`, under generated UUID names. PostgreSQL stores only their
  references and metadata. Multi-instance and ephemeral-filesystem deployments are
  outside the approved design until a shared storage strategy is approved.
- An administrator may permanently delete a Player photo. A base photo is retained
  until an administrator deletes it or the Player is disabled; there is no other
  automatic expiration.
- Disabling a Player permanently removes all current photo rows and files in addition
  to Team associations. Re-enabling the Player restores neither. Competition roster
  snapshots do not retain copies of base photos, so a disabled Player cannot be
  automatically recognized from those deleted references in a later scan.
- Photo downloads must not expose the internal UUID file name, an ETag derived from
  the stored file, or filesystem timestamps.

## Environment configuration

Never hard-code environment-specific credentials.

Use `.env` ONLY locally, never commit the file.
