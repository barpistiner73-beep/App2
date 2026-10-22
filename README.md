# App2

## Barcode food logging

The nutrition scanner checks the signed-in user's shared Firestore `foods`
catalog first. EAN/UPC values use the scanned value as the document ID. A
scanned HTTPS product URL is retained in the document's `barcode` field and
mapped to a deterministic `url_<sha256>` document ID because `/` is not valid
inside a Firestore document ID. URL parsing reads only accessible product
JSON/JSON-LD that explicitly declares values per 100 g; inaccessible or
incomplete pages fall back to manual entry. Product validation and confirmation
precede an atomic transaction that creates the shared food (if not already
present) and appends the selected quantity to
`users/{uid}/foodLogs/{foodLogId}`.

Shared catalog records store per-100 g macros (including saturated and trans
fats), micronutrients (sodium, potassium, calcium, iron, and vitamin C), and
omega-3/omega-6 values. A food log stores quantity-scaled nutrients privately
under its owner. Detailed nutrient values can be entered as zero when unknown;
macro totals and nutrient ranges are validated before writing.

## Coach connections and consent

Coaches must opt in to `coachDirectory` before appearing in search. Both the
current `isDiscoverable` flag and legacy `isPublicVisible` flag are supported.
A trainee or coach can send a pending request at
`coachingRequests/{traineeId}_{coachId}`; only the recipient can accept it.
Acceptance creates the active `trainerships/{coachId}_{traineeId}` record.
Coach-initiated connection uses the trainee's UID and never searches or exposes
the private `users` directory. Names used for the roster are kept separately
in `coachTraineeProfiles`.

Coaches request categories through
`coachingPermissionRequests/{coachId}_{traineeId}`. Trainee-controlled grants
are stored in `permissionScopes/{coachId}_{traineeId}`. Firestore rules require
both an active relationship and an accepted scope for coach reads of
`nutrition_logs`, `workout_history`, `body_metrics`, `sleep_logs`, and
`daily_reports`. Legacy `dailyReports` contain mixed nutrition, workout, sleep,
and body data, so they require the separately described `daily_reports`
consent. Existing relationships do not grant data access until the trainee
consents.

Coaches can assign pending weigh-in, progress-photo, check-in, or custom tasks
to a connected trainee under `users/{traineeId}/pendingTasks`. Trainees see and
complete non-weigh-in tasks from their dashboard. Saving a valid weight log
completes the first pending weigh-in task atomically with a private
`bodyMetrics` record linked to that task. Task creation requires an active
coach-trainee relationship; task data remains in the trainee's private user
namespace. The task creator can read only their task metadata while the
relationship remains active.

The coach dashboard keeps the selected trainee in a shared selector and divides
management, weekly plans/nutrition targets, activity history, and workout
editing into separate views. Coach-written plans and targets are gated by the
trainee's corresponding consent scope. Manager role changes update the Firestore
profile and the signed-in user's profile listener; Firebase custom claims, if
used by a deployment, are only a fallback when no user profile exists. A
persisted profile takes precedence so stale claims cannot preserve access after
a role change; custom claims must still be updated by trusted server-side code
for deployments that rely on them elsewhere.

Coach accounts can switch between training mode and coaching mode from the
header. The selected mode is stored per account, and navigation and tab panels
are restricted to the pages for the active role and mode. Manager accounts are
restricted to the manager panel.

The Firestore rules are a security prototype. Validate them against the
project's deployed data and review them before production rollout.