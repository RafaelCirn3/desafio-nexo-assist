# Demo authentication and authorization

The PRD requires corporate-email login with any password for fixture employees. This intentionally insecure behavior is **only enabled** when DEMO_AUTH_ENABLED=true and NODE_ENV is not production. Never use it for a real deployment.

- POST /auth/login accepts an existing active fixture employee's email and any nonempty password, returns an eight-hour signed Bearer token.
- GET /auth/me validates the signature and current employee status/role/email.
- GET /tickets and GET /tickets/:id derive ownerId **exclusively** from the verified Bearer token.
- Backend ticket service also scopes queries by ownerId.
- Analyst roles are ANALYST_N1 and ANALYST_N2. The console and role-aware routes are forthcoming.
- Tokens are HMAC-signed with AUTH_SECRET. Keep secret out of git and avoid browser localStorage in later frontend.
- For production implement proper identity provider / credential verification, refresh/revocation and request rate limiting.

Example: `npm run db:seed`, login with `ana.martins@nexo.example` and any non-empty password after enabling demo auth.

The backend loads `backend/.env` through dotenv when started from the `backend/` directory. Before tests or server startup, copy `.env.example` and replace AUTH_SECRET with a freshly generated value. Test execution requires that environment file.
