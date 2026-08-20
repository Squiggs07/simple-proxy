# Adaptive memory architecture

Start Here treats the local, versioned `AppState` snapshot as the immediate source of truth. Every user action is saved locally first. Authentication and network access are optional; neither is allowed to block logging, planning, Coach actions, or deterministic adaptation.

When Supabase is configured and the user signs in, the same validated snapshot is copied to `public.start_here_state`. Row Level Security limits every operation to `auth.uid() = user_id`. The browser uses only the project URL and publishable key—never a secret or service-role key.

## Reconciliation rules

1. A device writes locally immediately and marks its snapshot dirty, even while signed out or offline.
2. Cloud writes are debounced and retried only after meaningful state changes.
3. On sign-in, a missing cloud row receives the local snapshot.
4. If both exist, a clean local cache accepts cloud. Otherwise `client_updated_at`, followed by the server-controlled revision, selects one snapshot deterministically.
5. Before cloud replaces local state, Start Here keeps a local recovery copy under `start-here-state-before-cloud-v1`.
6. Cloud errors leave the local plan untouched and visible. A later save or manual “Sync now” retries.

The database owns `revision` and `updated_at` through a trigger. Client code cannot reassign a row to another user, and the update policy has both `USING` and `WITH CHECK` ownership predicates.

## Next memory layer

The snapshot already contains durable Coach history and the behavioral evidence used by the deterministic adaptation engine: meal and exercise swaps, rejections, readiness, adherence, workout performance, weight trend, schedule exceptions, and accepted adaptations.

The next expansion should add append-only, typed evidence—not free-form AI-authored profile facts. Examples include:

- restaurant orders the user actually chose;
- accepted meal substitutions and portion changes;
- stable food, schedule, and training preferences inferred from repeated behavior;
- the source, confidence, first/last observed time, and user confirmation for each learned preference.

For questions such as “How would this Chick-fil-A order fit today?”, the intended flow is:

1. Resolve current menu nutrition from a verified, current source.
2. Compare it with today’s remaining audited targets and logged meals.
3. Let Coach explain practical options in plain language.
4. Ask before logging food or changing the plan.
5. Run any accepted plan change through the deterministic nutrition and safety rules.
6. Remember repeated accepted choices as typed evidence so future suggestions improve.

AI interprets and explains. Verified nutrition supplies the numbers. The deterministic engine decides what changes are valid.
