# E2E specs

Exactly two Playwright flows are in scope (CONVENTIONS.md §7):

- `add-place-and-vote.spec.ts` — M1. Not wired into CI: `next build` +
  `next start` (playwright.config.ts's webServer) against the real Supabase
  project, since there's no separate staging project at this budget
  ($0/month, ARCHITECTURE.md ground rule #1). Run manually with
  `npm run test:e2e` before treating M1 as verified, or after touching the
  add/vote/realtime path.

  Each run signs up two disposable accounts (`e2e-*@example.com`) and
  creates its own throwaway trip + one stop, rather than using the real
  "Japan 2026" trip — the consensus check requires *every* `trip_members`
  row on a trip to have voted, and running against the shared trip would
  permanently accumulate test members on it with no way to remove them (no
  `DELETE` policy on `trip_members`, since the invite flow that would
  validate removal doesn't exist yet), eventually making "mutual Must go"
  impossible to satisfy for real. An isolated trip sidesteps that
  entirely. The created place is cleaned up automatically at the end of
  the run; the throwaway trip/trip_members/auth.users rows leak (same
  missing-DELETE-policy reason) but are harmless — see
  `supabase/cleanup-diagnostic-members.sql` if they need clearing out.

  Requires "Confirm email" off in Supabase Auth settings (Authentication →
  Providers → Email) so `signUp()` returns a usable session immediately.

- `invite-redemption.spec.ts` — redeem link → join trip. Doesn't exist yet;
  lands once the invite flow itself does (currently no scheduled milestone).
