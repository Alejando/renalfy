# Security Audit Report — Renalfy
**Date:** 2026-04-29  
**Status:** ⚠️ **CRITICAL ISSUES FOUND**

---

## Executive Summary

A comprehensive security audit identified **11 critical/high-severity issues** and **61 dependency vulnerabilities**. Most issues are configuration gaps rather than code vulnerabilities. Password hashing, authentication, and RLS are well-implemented, but critical security headers and rate limiting are missing.

**Priority:** Implement fixes before production launch.

---

## 🔴 Critical Issues

### 1. **Dependency Vulnerabilities** ⚠️ CRITICAL

**Status:** 61 vulnerabilities in package tree
- **Critical:** 1 (Handlebars.js JavaScript Injection)
- **High:** 25 (ReDoS, Object Prototype Pollution)
- **Moderate:** 33
- **Low:** 2

**Vulnerable Packages:**
```
❌ handlebars@4.7.8 (via ts-jest@29.4.6)
   - JavaScript Injection via AST Type Confusion
   - Property Access Validation Bypass
   
❌ minimatch@3.1.2 & 9.0.5 (via @eslint, eslint, jest)
   - ReDoS via repeated wildcards
   
❌ yaml@2.3.2 (via @lerna/collect-packages)
   - Denial of Service via parsing
   
❌ hono@4.11.4 (via @prisma/dev)
   - Improper Access Control
```

**Risk Level:** HIGH (dev-only dependencies, but still exploitable)

**Fix:**
```bash
# Update ts-jest to version with patched handlebars
pnpm upgrade ts-jest

# Update lerna to get patched yaml
pnpm upgrade @lerna/collect-packages

# These are transitive deps, may need npm audit fix
pnpm audit fix --allow-peer-major-changes
```

---

### 2. **No Rate Limiting on Authentication Endpoints** ⚠️ HIGH

**Status:** ❌ Not Implemented

**Issue:** 
- No protection against brute force attacks on `/api/auth/login`
- Attackers can attempt unlimited password guesses
- No throttling on refresh token endpoint

**Impact:** Credential compromise, token theft

**Implementation Required:**
```typescript
// apps/api/src/main.ts — Add ThrottlerModule
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 5,   // 5 requests per minute
        name: 'auth-login',
      },
      {
        ttl: 300000, // 5 minutes
        limit: 10,
        name: 'api', // General API limit
      },
    ]),
  ],
})
export class AppModule {}

// apps/api/src/auth/auth.controller.ts
@Post('login')
@Throttle({ default: { limit: 5, ttl: 60000 } })
login(@Body() dto: LoginDto) { ... }

@Post('refresh')
@Throttle({ default: { limit: 10, ttl: 60000 } })
refresh(@CurrentUser() user) { ... }
```

---

### 3. **Missing Security Headers** ⚠️ HIGH

**Status:** ❌ Not Implemented

**Missing Headers:**
- `Content-Security-Policy` (CSP) — XSS protection
- `X-Frame-Options` — Clickjacking protection  
- `X-Content-Type-Options` — MIME sniffing prevention
- `Strict-Transport-Security` (HSTS) — HTTPS enforcement
- `Referrer-Policy` — Referrer information leakage

**Implementation:**
```typescript
// apps/web/middleware.ts — Add security headers
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Prevent XSS via MIME type
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  
  // HSTS (only in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  }
  
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // CSP (permissive initially, tighten later)
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
  );

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

---

### 4. **No CSRF Protection** ⚠️ MEDIUM

**Status:** ❌ Not Implemented

**Issue:**
- Server Actions accept mutations without CSRF token verification
- POST/PUT/DELETE endpoints lack CSRF validation
- Relies solely on SameSite cookie flag

**Risk:** Cross-site request forgery attacks possible if attacker can trick user

**Implementation Options:**

**Option A — SameSite Cookies Only (Current, Acceptable for now):**
- ✅ Cookies already set with `sameSite: 'lax'`
- ✅ Server Actions in Next.js are CSRF-safe by default

**Option B — Add CSRF Tokens (Recommended for production):**
```typescript
// packages/types/src/csrf.schemas.ts
import { z } from 'zod';

export const CSRFTokenSchema = z.object({
  token: z.string(),
  timestamp: z.number(),
});

// apps/web/app/actions/csrf.ts
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function generateCSRFToken(): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const cookieStore = await cookies();
  
  cookieStore.set('csrf_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 3600, // 1 hour
    path: '/',
  });
  
  return token;
}

export async function verifyCSRFToken(token: string): Promise<boolean> {
  const cookieStore = await cookies();
  const storedToken = cookieStore.get('csrf_token')?.value;
  
  // Timing-safe comparison
  if (!storedToken) return false;
  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(storedToken)
  );
}
```

**For Now:** Accept the current approach (SameSite + Server Actions) as acceptable.

---

### 5. **Overpermissive CORS Configuration** ⚠️ MEDIUM

**Status:** ⚠️ Partially Problematic

**Current Code:**
```typescript
// apps/api/src/main.ts
if (allowedOrigins) {
  const originsArray = allowedOrigins.split(',').map((o) => o.trim());
  app.enableCors({
    origin: originsArray,
    credentials: true,
  });
} else {
  app.enableCors(); // ⚠️ Allows ANY origin if env var not set
}
```

**Problem:** If `ALLOWED_ORIGINS` env var is missing, CORS allows all origins with credentials.

**Fix:**
```typescript
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000').split(',').map((o) => o.trim());

app.enableCors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
});
```

**Required Environment Variables:**
```bash
# .env.local
ALLOWED_ORIGINS=http://localhost:3000,https://renalfy.app,https://*.renalfy.app
```

---

## 🟡 High-Priority Issues

### 6. **No Input Size Limits** ⚠️ MEDIUM

**Status:** ⚠️ Partially Implemented

**Issue:** No `limit` option set on JSON/URL body parsers in NestJS

**Risk:** Large payload attacks (memory exhaustion, DOS)

**Fix:**
```typescript
// apps/api/src/main.ts
const app = await NestFactory.create(AppModule, {
  bodyParser: {
    json: { limit: '10kb' },
    urlencoded: { limit: '10kb' },
  },
});

app.useGlobalPipes(
  new ZodValidationPipe({
    forbidUnknown: true, // Reject unknown fields
  })
);
```

---

### 7. **No Secrets Rotation Policy** ⚠️ MEDIUM

**Status:** ❌ Not Documented

**Issue:** `JWT_SECRET` and `JWT_REFRESH_SECRET` have no rotation schedule

**Risk:** Leaked secrets compromise all user sessions indefinitely

**Recommendation:**
```markdown
# Security Policy

## Secret Rotation Schedule
- **JWT_SECRET:** Rotate every 90 days
- **JWT_REFRESH_SECRET:** Rotate every 180 days
- **Database password:** Rotate every 90 days
- **API keys:** Rotate every 60 days

## Rotation Process
1. Generate new secret in Render / env management
2. Update `JWT_SECRET` in environment
3. All JWTs issued before rotation become invalid after new secret takes effect
4. Users are forced to re-login after 15 minutes (access token expiry)
5. Log rotation in audit trail
```

---

### 8. **No Rate Limiting on Public Endpoints** ⚠️ MEDIUM

**Status:** ❌ Not Implemented

**Unprotected Endpoints:**
- `GET /api/public/tenants/{slug}` — can be enumerated
- `POST /api/auth/login` — brute force (covered above)

**Fix:** Apply rate limiting to public endpoints

---

### 9. **Missing Sensitive Data Masking in Logs** ⚠️ MEDIUM

**Status:** ⚠️ Partially Implemented

**Issue:** Error messages may leak sensitive information to logs

**Recommendation:**
```typescript
// apps/api/src/common/filters/http-exception.filter.ts
import { ExceptionFilter, Catch, HttpException, ArgumentsHost } from '@nestjs/common';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    let message = exception.getResponse();

    // Mask sensitive information in production
    if (process.env.NODE_ENV === 'production') {
      if (typeof message === 'object' && 'message' in message) {
        const msg = (message as any).message;
        
        // Don't expose internal error details
        if (msg && msg.includes('database') || msg.includes('query')) {
          message = 'Internal server error';
        }
      }
    }

    response.status(exception.getStatus()).json(message);
  }
}
```

---

### 10. **No HTTP Security.txt** ⚠️ LOW

**Status:** ❌ Not Implemented

**Recommendation:** Add `security.txt` for responsible disclosure
```
# apps/web/app/well-known/security.txt/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const content = `Contact: security@renalfy.app
Expires: 2027-04-29T00:00:00Z
Canonical: https://renalfy.app/.well-known/security.txt
Policy: https://renalfy.app/security-policy
`;
  
  return new NextResponse(content, {
    headers: { 'Content-Type': 'text/plain' },
  });
}
```

---

### 11. **No Login Attempt Logging** ⚠️ MEDIUM

**Status:** ⚠️ Partially Implemented

**Issue:** Failed login attempts not specifically logged (only successful ones)

**Fix:**
```typescript
// apps/api/src/auth/auth.service.ts
async login(dto: LoginDto): Promise<AuthTokensResponse> {
  const user = await this.prisma.user.findUnique({
    where: { email: dto.email },
  });

  const isValid = user && (await bcrypt.compare(dto.password, user.password));

  if (!user || !isValid) {
    // Log failed attempt
    await this.auditService.log({
      tenantId: 'system', // Or extract from email domain
      userId: 'anonymous',
      action: 'FAILED_LOGIN',
      resource: 'Auth',
      resourceId: dto.email,
      details: { reason: user ? 'invalid_password' : 'user_not_found' },
      ipAddress: this.request.ip,
      userAgent: this.request.get('user-agent'),
    });
    
    throw new UnauthorizedException('Credenciales incorrectas');
  }

  // Log successful login
  await this.auditService.log({
    tenantId: user.tenantId,
    userId: user.id,
    action: 'LOGIN',
    resource: 'Auth',
    resourceId: user.id,
  });

  return this.createTokens(user);
}
```

---

## ✅ Security Features Already Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| **Row-Level Security (RLS)** | ✅ | Two-tier: app-level + DB-level |
| **Password Hashing** | ✅ | bcrypt with 10 rounds |
| **JWT Authentication** | ✅ | 15m access + 7d refresh tokens |
| **Token Refresh** | ✅ | Automatic on 401 + proactive via middleware |
| **HTTP-Only Cookies** | ✅ | Tokens stored securely |
| **Input Validation** | ✅ | ZodValidationPipe on all endpoints |
| **Audit Logging** | ✅ | @Audit() decorator on sensitive endpoints |
| **Tenant Isolation** | ✅ | Multi-tenant architecture enforced |
| **Authorization Guards** | ✅ | JwtAuthGuard, JwtRefreshGuard |
| **Role-Based Access Control** | ✅ | OWNER, ADMIN, MANAGER, STAFF roles |
| **SameSite Cookies** | ✅ | Set to 'lax' |
| **Encryption in Transit** | ✅ | HTTPS in production (Vercel/Render) |
| **Encryption at Rest** | ✅ | AES-256 on Render volumes |

---

## Priority Fixes (Ordered)

### Phase 1: Critical (Week 1)
1. **Fix dependency vulnerabilities** (`pnpm audit fix`)
2. **Add rate limiting** to auth endpoints
3. **Add security headers** (CSP, X-Frame-Options, HSTS)
4. **Fix CORS configuration** (set default origins)

### Phase 2: High (Week 2)
5. **Add input size limits** to body parsers
6. **Implement failed login logging**
7. **Add `security.txt`** for responsible disclosure
8. **Document secret rotation policy**

### Phase 3: Medium (Before Launch)
9. **Consider CSRF token implementation** (if moving away from SameSite)
10. **Add error message masking** in production
11. **Regular dependency audits** (add to CI/CD)

---

## CI/CD Security Checklist

Add to your GitHub Actions workflow:

```yaml
# .github/workflows/security.yml
name: Security Audit

on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '25'
      
      - name: Install pnpm
        uses: pnpm/action-setup@v2
      
      - name: Run security audit
        run: pnpm audit --audit-level=moderate
        # Fails if moderate or higher vulnerabilities found
      
      - name: Type check
        run: pnpm check-types
      
      - name: Lint
        run: pnpm lint
```

---

## Production Deployment Checklist

Before deploying to production:

- [ ] All 61 dependency vulnerabilities fixed or risk-accepted
- [ ] Rate limiting implemented and tested
- [ ] Security headers configured and verified
- [ ] CORS origins whitelist defined
- [ ] Secrets rotation schedule established
- [ ] Audit logging verified on all sensitive endpoints
- [ ] Error messages sanitized in production
- [ ] HTTPS enforced (automatic on Vercel/Render)
- [ ] RLS policies tested end-to-end
- [ ] Database backups automated and tested

---

## Compliance Status

| Regulation | Status | Notes |
|-----------|--------|-------|
| **LFPDPPP** | ✅ Partial | Patient consent implemented, ARCO rights not yet |
| **NOM-004-SSA3** | ✅ Partial | Immutable audit logs, 5-year retention planned |
| **NOM-024-SSA3** | ✅ Partial | Tenant isolation enforced, cross-tenant share blocked |
| **OWASP Top 10** | ⚠️ Partial | A01-Broken Access Control ✅, A02-Cryptography ✅, A03-Injection ✅, A06-Auth ⚠️ (rate limiting missing) |

---

## Recommendations

1. **Implement automated security scanning** in CI/CD pipeline
2. **Schedule quarterly security audits** with external firm
3. **Establish bug bounty program** before public launch
4. **Document all security decisions** in security policy
5. **Train team on OWASP Top 10** and secure coding practices
6. **Implement Web Application Firewall (WAF)** in production (Vercel + Cloudflare)

---

**Generated:** 2026-04-29  
**Next Review:** 2026-05-29 (or after deployment to production)
