# Branch and PR ownership

- `main`: stable integration target only.
- `feat/backend-foundation`: backend-exclusive changes, PR #1 -> main.
- `feat/frontend-pencil`: frontend-exclusive changes, opened independently from main, with a separate PR when ready.
- Subsequent backend branches should use `feat/backend-<scope>` from latest main after backend PR merges.
- Do not mix `frontend/` (UI files) into backend PRs. Contract documents can be duplicated or reviewed independently, with backend API as source of truth.
- Conventional Commits with scopes: `feat(auth): ...`, `feat(tickets): ...`, `feat(frontend): ...`, `test(auth): ...`.
