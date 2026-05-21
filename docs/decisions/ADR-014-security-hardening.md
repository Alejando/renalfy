# ADR-014: Security Hardening (May 2026)

**Status:** Accepted  
**Date:** 2026-05-21  
**Deciders:** Security Audit

## Context

A comprehensive security audit of the entire Renalfy application was conducted on 2026-05-20. The audit covered:
- Backend (NestJS): authentication, authorization, input validation, error handling
- Frontend (Next.js): XSS, token storage, CSRF, security headers
- Database (Prisma/PostgreSQL): RLS, PHI protection, indexing, migrations
- Infrastructure: Docker, CI/CD, dependencies, secrets management

The audit found **6 critical**, **9 high**, **10 medium**, and **10 low** severity issues.

## Decision

Implement the following security hardening measures documented below. Each fix type is categorized by layer.

### Backend Auth

1. **JWT secret fallback**: Replaced `config.get('JWT_SECRET') ?? ''` with a fatal error if secret is not configured in both `jwt.strategy.ts` and `jwt-refresh.strategy.ts`. An empty-string JWT secret is a critical authentication bypass.

2. **Refresh token validation**: Implemented refresh token hashing and rotation:
   - `User.refreshTokenHash` stores bcrypt hash of current refresh token
   - Login: generates tokens, stores hash
   - Refresh: validates provided token against stored hash, rotates token pair
   - Password change: clears `refreshTokenHash` (revokes all sessions)
   - Logout: calls service to clear `refreshTokenHash`

3. **bcrypt rounds**: Increased from 10 to 12 (OWASP 2024-2026 recommendation).

### RLS (Row-Level Security)

4. **Database-level RLS policies**: Created migration `add_rls_policies` that:
   - Creates `app.current_tenant_id()` helper function
   - Enables RLS on all 25 tables with `tenantId` column
   - Creates `FOR ALL` policies enforcing `"tenantId" = app.current_tenant_id()`
   - AuditLog: SELECT + INSERT only (no UPDATE/DELETE)
   - Sets `set_config('app.current_tenant_id', ...)` via existing `TenantInterceptor`

### Security Headers

5. **API (NestJS)**: Added `helmet` middleware, `trust proxy`, and increased body parser limit from 10KB to 100KB.

6. **Frontend (Next.js)**: Added security headers in `next.config.js`:
   - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
   - `Content-Security-Policy` with strict directives

### Error Handling

7. **Exception filter**: Changed from `@Catch(HttpException)` to `@Catch()` (all exceptions). Non-HttpException errors now return generic 500 messages in production instead of leaking stack traces.

### Docker / Infrastructure

8. **Dockerfile**: Added non-root `renalfy` user with `USER` directive and `chown` on copied files.

9. **docker-compose.yml**: Added security context (`no-new-privileges`, `cap_drop: [ALL]`, `read_only: true`, memory limits) and `?sslmode=require` on DB URLs.

### Code Quality

10. **generateFolio bug**: Fixed `$executeRaw` → `$queryRaw` in `sales.service.ts`. The former returns row count (integer), not query results.

11. **Password schema**: Standardized `min(6)` → `min(8)` in both `LoginSchema` and `ChangePasswordSchema`.

12. **Dead code removal**: Deleted `apps/web/src/app/dashboard/` (legacy route with unauthenticated client-side fetch calls).

13. **CI security**: Added `pnpm audit` step to GitHub Actions workflow.

14. **@Roles on financial endpoints**: Added explicit `@Roles('OWNER', 'ADMIN', 'MANAGER')` to `GET /sales`, `GET /sales/:id`, `GET /incomes`, and `GET /expenses`.

## Alternatives Considered

### Token Version vs Refresh Token Hash
- **Token version** (increment integer in JWT payload on password change): would require modifying JwtStrategy.validate() to check version, adds complexity.
- **Refresh token hash**: simpler, only invalidates refresh tokens on password change. Access tokens continue until natural expiry (15 min max). **Chosen** for simplicity.

### Full RLS with child-table JOINs
- Adding tenantId to `SaleItem`, `PurchaseItem`, etc. and creating RLS policies would provide complete isolation.
- **Rejected for now**: Child tables are only accessed through parent entities which already enforce tenantId. Application-level JOIN filtering is sufficient defense-in-depth.

## Consequences

### Positive
- Refresh tokens can now be revoked (password change, logout, account suspension)
- Missing JWT_SECRET causes startup failure instead of silent auth bypass
- RLS provides database-level tenant isolation, not just application-level
- Security headers protect against XSS, clickjacking, MIME sniffing
- Container runs as non-root with minimal capabilities

### Negative
- `helmet` adds dependency and may conflict with future middleware
- RLS policies may cause unexpected permission errors if `set_config` is skipped in any code path
- `read_only: true` in docker-compose may break if the app writes to filesystem (logs, uploads) — needs `/tmp` writable via `tmpfs`
- Existing bcrypt hashes (10 rounds) remain; only new passwords get 12 rounds

### Mitigations
- All services that use transactions already call `set_config` inside `$transaction` blocks
- Docker `tmpfs: /tmp` provides writable temp space
- Password migration can be done on next login by checking hash rounds

## References

- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [NIST SP 800-63B Digital Identity Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
