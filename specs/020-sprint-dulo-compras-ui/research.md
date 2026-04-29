# Phase 0: Research — Sprint 20

**Status**: ✅ COMPLETE — No unknowns remain. All technical decisions clarified by Sprint 19 backend and existing schema definitions.

## Technology Decisions (No Research Needed)

### 1. Frontend Framework & Testing
- **Decision**: Next.js 16 App Router + TypeScript 5.3, Vitest + React Testing Library
- **Rationale**: Already established in project; Sprint 19 backend tested with Jest E2E tests
- **Alternatives considered**: N/A — project-wide decision

### 2. UI Components & Styling
- **Decision**: shadcn/ui components + Tailwind CSS v4
- **Rationale**: Established design system in Renalfy (see `CLAUDE.md`, Stitch design project)
- **Alternatives considered**: N/A — project standard

### 3. Form Handling & Validation
- **Decision**: React Hook Form + Zod schemas (same as receive-items-form.tsx in existing code)
- **Rationale**: Single source of truth in `@repo/types/purchases.schemas.ts`; Frontend validates with `zodResolver`
- **Alternatives considered**: N/A — project standard enforced by Constitution Principle II

### 4. API Communication
- **Decision**: Server actions (`'use server'`) + `apiFetch()` wrapper (same as existing purchases.ts)
- **Rationale**: Next.js 16 pattern for API calls; reuses established error handling and token refresh
- **Alternatives considered**: N/A — project standard

### 5. Data Fetching Strategy
- **Decision**: Server Components (Server-Side Rendering) for listing pages; Client Components for interaction
- **Rationale**: Better for pagination, filters, SEO; SEO patterns in `CLAUDE.md`
- **Alternatives considered**: SWR/TanStack Query — overkill for paginated lists from API
- **Implementation**: `page.tsx` fetches data, passes to `*-page-client.tsx` for rendering

### 6. Purchase Detail Data Model
- **Decision**: Use `PurchaseDetailResponseSchema` from `@repo/types/purchases.schemas.ts` (already defined)
- **Rationale**: Backend endpoint `/api/purchases/:id` returns this schema
- **Fields Available**: id, tenantId, locationId, userId, supplierId, purchaseOrderId, date, amount, notes, supplierName, locationName, itemCount, createdAt, items[], supplier{}, location{}
- **No changes needed**: Schema already complete for UI requirements

### 7. Inventory Movement Data Model
- **Decision**: Use `InventoryMovementResponseSchema` and `PaginatedInventoryMovementsResponseSchema`
- **Rationale**: Backend endpoint `/api/inventory-movements?page=...&limit=...&filters` returns paginated results
- **Fields Available**: id, tenantId, locationId, userId, date, type (IN|OUT), reference (e.g., "PURCHASE-{id}"), notes, itemCount, createdAt, createdBy{}
- **Reference Field**: Links to source document (PURCHASE-123, SALE-456, etc.)
- **Filtering**: page, limit, locationId, productId, type, dateFrom, dateTo (all defined in schema)

### 8. Role-Based Access (Frontend Display)
- **Decision**: Session user role + locationId from `getSessionUser()` determines what is shown
- **Rationale**: Backend enforces via RLS/tenantId in JWT; frontend is defense-in-depth only
- **Rules**: 
  - STAFF → ErrorState "No tienes permiso"
  - MANAGER → Filter by locationId (show only own location)
  - OWNER/ADMIN → Unrestricted
- **No changes needed**: Pattern already established in `purchases-page-client.tsx` line 22-26

### 9. Responsiveness & Mobile-First
- **Decision**: Tailwind CSS breakpoints: mobile (320px default), tablet (md: 768px), desktop (lg: 1024px)
- **Rationale**: Standard web breakpoints; tables use `hidden md:table-cell` for small screens
- **Implementation**: Test at 320px (iPhone SE), 768px (iPad), 1024px (desktop)
- **Pattern**: Existing purchases listing uses this approach (line 60-67 in purchases-page-client.tsx)

### 10. Dialog/Modal for Receive Items Action
- **Decision**: Reuse existing `ReceiveItemsDialog` component from purchase-order-detail page
- **Rationale**: Already implemented; same form, validation, server action
- **Where triggered**: From purchase detail page, not from order detail page
- **No changes needed**: Component is reusable

## Unknowns Resolved

| Unknown | Resolution |
|---------|-----------|
| What endpoint fetches purchase details? | `/api/purchases/{id}` — returns `PurchaseDetailResponse` (confirmed in schema) |
| What endpoint lists movements? | `GET /api/inventory-movements?page=X&limit=Y&filters` — returns `PaginatedInventoryMovementsResponse` |
| How to navigate from movement reference to purchase? | Use `movement.reference` (format: "PURCHASE-{id}") to link to `/inventory/purchases/{id}` |
| Should MANAGER see purchases outside their location? | No — frontend checks `sessionUser.locationId`, backend enforces via RLS |
| How to handle concurrent order modifications? | Backend returns 409 Conflict; frontend shows error (pattern in existing action, line 45-47) |
| What is the expected page load time? | Server components render on demand; pagination = 20 per page; target <2s cold load, <500ms per filter change |

## Conclusion

✅ **All clarifications resolved.** Proceed to Phase 1 (Design).

No external dependencies, no new technologies, no unknowns. Design phase will focus on component structure, page layout, and test strategy.
