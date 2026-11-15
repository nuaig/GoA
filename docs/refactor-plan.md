# GoA refactor and migration plan

Status: DRAFT. Sections 1 to 3 were added from the planning discussion in Claude Code.
The original refactor plan (from Cursor) was not available. Merge it into section 1 when it is found.

## 1. Restructure the code: share more, repeat less, add games cheaply

### Problems
**Adding a game touches too many files.** Game names are hardcoded in
`Backend/front/vite.config.js`, `utils/UI/gameRoomUI.js`, `ui.js`, `delete.js`,
`gameHelper.js`, `src/js/mainDungeon.js`, and in `Backend/db/DBGameStatus.js` and
`DBDataViz.js` (one field per game, and each aggregation repeats the list).

**The games repeat the same code.** The per-game files are huge and largely
similar (line counts at the time of writing):

| File | Lines |
| --- | --- |
| `src/js/Astar.js` | ~2600 |
| `src/js/dijkstra.js` | ~1800 |
| `src/js/heapsort.js` | ~1500 |
| `src/js/kruskal.js` | ~1260 |
| `src/js/prim.js` | ~1150 |
| `utils/UI/gameRoomUI.js` | ~1400 |

Each game re-implements scene setup, score and lives handling, the tutorial
panel and its Next/Back flow, the help chat, modals, level reset, and the game
status calls. One fix (for example the tutorial Back button) has to be copied
into every room.

**Styling is per game.** `src/css/kruskal_prim_heapsort.css` is shared by three
games only because it was copied, not designed. Each room page and stylesheet
repeats the same layout.

**Old and unused code is still in the repo.** Candidates to verify and remove
(check each is truly unreferenced first, and that the tests still pass):
- `utils/UI/gameRoomUICopy.js` (a ~900 line copy of `gameRoomUI.js`; nothing
  imports it)
- `src/OldFiles/` (old CSS, `heapSortMain.js`, images, `.glb` models)
- `utils/dijkstraPatch.js`, `utils/UI/delete.js`
- `sample.html`, `sample.md`, `src/js/sample.js`, `src/css/sample.css`
- the `dist/` and `test-results/` folders must stay out of git (they already
  are ignored)

### Target
1. **Game registry.** One file (for example `shared/games.js`) lists each game
   once: id, display name, page, tutorial steps module, levels, max score per
   level. Vite entries, dungeon doors, the dashboard and the status and data-viz
   queries all read it.
2. **Shared room base.** One base class or module owns everything that is the
   same across rooms: Three.js scene and drag setup, score, lives and timer,
   tutorial panel (Explanation, Instruction, Result, Back and Next), help chat,
   modals and the game-status calls. A game then supplies only what is
   different: its data structure, its rules, its levels and its tutorial steps.
3. **Shared utilities.** Move functions used by more than one game into
   `utils/` (array and graph helpers, text and label creation, scoring) and
   delete the per-game copies.
4. **One HTML template.** The room pages differ only by game-specific parts, so
   generate them from one template (a Vite plugin or an include) with the game
   id and title filled in.
5. **Global CSS with per-game overrides.** One global stylesheet holds the
   layout, buttons, modals, tutorial panel and chat (using CSS variables for
   colours). Each game keeps a small stylesheet with only its own differences.
6. **Delete dead code** (the list above) in its own pull request, separate from
   the restructure, so it is easy to review.

### How to do it safely
- Do it one game at a time, starting with the smallest, behind the existing
  tests. Add tests for the shared base first, since the tests are what let us
  merge the code without breaking a room.
- Keep each pull request small enough to review. Order: delete dead code, then
  global CSS, then the shared utilities, then the shared room base, then the
  registry and template.
- Every pull request must pass the CI checks in section 2 before merging.

## 2. Automated tests on every merge request

- GitHub Actions workflow `.github/workflows/ci.yml` runs on pull requests into
  `main`: `npm ci`, `npm test` (Vitest unit tests), `npm run build`.
- Branch protection on `main` (GitHub, Settings, Branches): require the
  `unit-tests` status check to pass before merging, and require a pull request.
- Known issue to fix first: two test files (`ui.test.js`, `gameHelper.test.js`)
  fail to start on Node 20 with an `ERR_REQUIRE_ESM` error from jsdom. Check them
  on Node 22 in CI. If they still fail, pin or upgrade jsdom before requiring
  the check.
- Later: add the Playwright e2e tests as a second CI job.

## 3. Move hosting and data to Firebase / Google Cloud

| Today | Target |
| --- | --- |
| Render (or local) | Firebase App Hosting (Cloud Run), Blaze plan |
| MongoDB | Firestore |
| Hardcoded session secret `"hla hla hla"` | Google Secret Manager |
| In-memory sessions | Sessions stored in Firestore (or another shared store) |

### Cost expectations
Expected to be near zero at low traffic, but the Blaze plan needs a billing
account. Set a budget alert (about $5).

- Secret Manager: free for the first 6 active secret versions per month.
- Firestore: free quota of 1 GiB, 50k reads/day and 20k writes/day.
- App Hosting uses Cloud Run, Cloud Build and Artifact Registry, which have free
  allowances. Image storage can cost a few cents.

### Phases (one pull request each, so each can be reviewed and rolled back)
1. **App Hosting and secrets.** Add `apphosting.yaml` (build `npm run setup`,
   run `node server.js`), a shared session store, `secure` cookies and
   `trust proxy`, and read the session secret from Secret Manager. Still on
   MongoDB (Atlas) at this stage.
2. **Firestore rewrite.** Replace the four files in `Backend/db/` that use the
   Mongo driver (about 39 query calls). Cover them with tests first.
3. **Data migration and cutover.** One-time script from MongoDB to Firestore,
   switch over, keep the Mongo data as a backup for a while.

### Data model: make everything a query
Firestore has no joins and only basic aggregates (count, sum, average), so the
current `$lookup` and `$group` pipelines in `DBGameStatus.js` cannot be copied.

- Replace the per-game fields (`games.Heapsort.regular`, ...) with one document
  per user, per game: `gameStatus/{userId}_{gameId}` holding `userId`, `gameId`,
  `regular`, `tutorial`, scores and timestamps.
- Then "all games for a user" is a query on `userId`, "everyone on a game" is a
  query on `gameId`, and a new game needs no schema change.
- Where a total is needed (leaderboards, dashboard), use Firestore aggregation
  queries or compute it in code from a query result. For hot totals, keep a small
  precomputed summary document, updated when a score is saved.
- Index requirements are declared in `firestore.indexes.json` and deployed
  with the app.

### Testing with the Firebase Emulator Suite
Having the data in Firebase does not remove the Express server (it still handles
login, sessions and the API), but it makes testing easier:
- `firebase emulators:start` runs Firestore locally with fake data, so nothing
  touches the real database.
- The CI job can start the emulator, so the data-layer tests run on every pull
  request without secrets or a live database.
- A new contributor only needs the emulator command to run the app.
- Unit tests for the game logic do not need a server, as today.

### Risks
- The Firestore rewrite is the largest change. Keep the existing behavior
  covered by tests before replacing the data layer.
- Cloud Run can run several instances, so nothing may rely on server memory.
- Firestore bills per read, so avoid reading whole collections on page load.

## 4. Open items
- Merge the original refactor plan into section 1.
- Decide what happens to the existing Mongo data (migrate everything or start fresh).
- Decide whether to keep a custom domain on the existing Firebase site.
