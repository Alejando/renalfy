# Feature Specification: Sprint 20 — Frontend UI for Purchases & Inventory Movements

**Feature Branch**: `016-sprint-frontend-purchases`  
**Created**: 2026-04-28  
**Status**: Draft  

---

## Overview

Complete frontend implementation of the Purchases and Inventory Movements module (Módulo 3, Part 2). Provides hospital administrators and inventory managers with a comprehensive interface to:
- View and manage purchase orders from suppliers
- Register and track purchase receipts  
- Monitor real-time inventory movements
- Filter by location, supplier, product, date range, and status
- Apply RLS-enforced access controls per user role and location

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Purchase Order Listing & Filtering (Priority: P1)

**Actor**: Inventory Manager or OWNER  
**Goal**: View all purchase orders with ability to filter by supplier, status, date range

**Why this priority**: Core visibility into procurement pipeline. Without this, managers can't track supplier orders.

**Acceptance Scenarios**:

1. **Given** user is OWNER/ADMIN, **When** accessing "Inventory → Purchase Orders", **Then** see paginated list with supplier, status, date, amount, item count
2. **Given** user is MANAGER, **When** accessing purchase orders, **Then** only see orders for assigned location
3. **Given** purchase orders displayed, **When** filtering by supplier, **Then** only that supplier's orders shown
4. **Given** purchase orders displayed, **When** filtering by status "CONFIRMED", **Then** only pending orders shown
5. **Given** purchase orders displayed, **When** applying date range, **Then** only orders within range shown
6. **Given** multiple filters applied, **When** clicking "Clear Filters", **Then** all reset and full list restored

---

### User Story 2 — Purchase Order Details & Receive Purchase (Priority: P1)

**Actor**: Inventory Manager, OWNER, ADMIN  
**Goal**: View PO details and register receipt of items

**Why this priority**: Core workflow for inventory inflow. Without receiving, system cannot track stock.

**Acceptance Scenarios**:

1. **Given** opening PO detail page, **When** loads, **Then** see metadata and line items with product, ordered qty, unit price, tax
2. **Given** PO in CONFIRMED status, **When** clicking "Receive Items", **Then** modal opens to register receipt
3. **Given** receipt modal open, **When** entering quantityReceived and unitsPerPackage, **Then** system calculates stockDelta = quantity × units
4. **Given** confirming receipt, **When** API processes, **Then** PO status → RECEIVED and LocationStock updated
5. **Given** partial receipt registered, **When** viewing order again, **Then** order in RECEIVED state with accumulated quantities visible
6. **Given** insufficient permissions, **When** viewing PO, **Then** "Receive Items" button disabled

---

### User Story 3 — Inventory Movement Listing & Filtering (Priority: P1)

**Actor**: Inventory Manager, MANAGER, STAFF  
**Goal**: Track all inventory movements (IN/OUT) by type, product, location, date range

**Why this priority**: Essential for audit trail and inventory accuracy.

**Acceptance Scenarios**:

1. **Given** on "Inventory → Movements" page, **When** loads, **Then** see paginated list with type, product, quantity, date, reference, created by
2. **Given** movements displayed, **When** filtering by type "IN", **Then** only inflow shown
3. **Given** movements displayed, **When** filtering by product, **Then** only that product's movements shown
4. **Given** movements displayed, **When** filtering by date range, **Then** only movements within range shown
5. **Given** user is MANAGER/STAFF, **When** viewing movements, **Then** only see movements for assigned location
6. **Given** clicking movement row, **When** detail opens, **Then** see items, quantities, unit prices, before/after stock levels

---

### Edge Cases

- STAFF views PO but cannot receive items (button disabled)
- Empty states show appropriate messages and CTAs
- Concurrent receipts: Two users attempt same items; second shows warning
- Partial receipts: Order receives items over time, system tracks accumulated quantities
- Location filtering: MANAGER sees only their location
- Large datasets: 1000+ movements load and filter in <3 seconds
- Network failures: Show user-friendly error with retry
- Browser back button: Preserves filter state and scroll position

---

## Requirements *(mandatory)*

### Functional Requirements

#### Core Navigation
- **FR-001**: UI renders "Inventory" section with: Products, Suppliers, Purchase Orders, Purchases, Movements
- **FR-002**: MANAGER/STAFF see only their location data; OWNER/ADMIN see all locations

#### Purchase Orders List
- **FR-010**: Display paginated list (20 per page) with: Supplier Name, Status, Order Date, Item Count, Total Amount
- **FR-011**: Support filtering by: Supplier, Status (CONFIRMED/RECEIVED/CLOSED), Date Range
- **FR-012**: Support sorting by: Date, Total Amount (ascending/descending)
- **FR-013**: "Clear Filters" button resets all filters
- **FR-014**: Clicking row navigates to detail view
- **FR-015**: Show "No orders found" when filtered results empty

#### Purchase Order Details
- **FR-020**: Display: PO ID, Supplier, Location, Order Date, Status, Total, Item Count
- **FR-021**: List line items: Product Name, Qty Ordered, Units/Package, Unit Price, Subtotal, Tax
- **FR-022**: Show current LocationStock for each product
- **FR-023**: Display status-appropriate actions ("Receive Items" if CONFIRMED, "Close Order" if RECEIVED + admin, "Cancel" if CONFIRMED + admin)
- **FR-024**: Show audit timeline with state transitions, timestamps, user names

#### Receive Purchase Flow
- **FR-030**: "Receive Items" modal shows all unconfirmed line items
- **FR-031**: Form fields: Quantity Received, Units Per Package (read-only: Unit Price, Tax)
- **FR-032**: Validate: Qty Received ≤ Ordered Qty; Units Per Package > 0
- **FR-033**: Calculate stockDelta = Qty Received × Units Per Package, display to user
- **FR-034**: Show total accumulated quantity and cost preview
- **FR-035**: On success: Update PO status → RECEIVED, Create Purchase record, Update LocationStock, Show notification
- **FR-036**: On failure: Display error with retry option
- **FR-037**: Partial receipt: Subsequent receipts show remaining qty (ordered - previously received)
- **FR-038**: During submission: Disable inputs, show loading on button
- **FR-039**: User can cancel modal without submitting

#### Inventory Movements List
- **FR-040**: Display paginated list (20 per page) with: Type (IN=green/OUT=red), Product Name, Quantity, Date, Reference, Created By
- **FR-041**: Support filtering by: Type, Product, Date Range, Reference (text search)
- **FR-042**: Support sorting by: Date, Quantity (ascending/descending)
- **FR-043**: "Clear Filters" resets all
- **FR-044**: Clicking row → detail view with items, qty, unit price, before/after stock
- **FR-045**: Show "No movements found" when empty
- **FR-046**: IN/OUT visually distinct (badge + text)

#### Movement Details
- **FR-050**: Display: Movement ID, Type, Date, Reference, Created By, Location, Notes
- **FR-051**: List items: Product Name, Qty, Unit Price, Total Value
- **FR-052**: Show Before/After LocationStock (audit trail)
- **FR-053**: Read-only view (no editing in v1)

#### State Management & Real-Time
- **FR-060**: Cache LocationStock in client
- **FR-061**: On receipt/movement success: Update cache without full refresh
- **FR-062**: New records appear in lists within 2 seconds
- **FR-063**: Stale data indicator appears if data created by another user; manual refresh available
- **FR-064**: Switching locations: Clear previous data, reload new location data

#### Error Handling
- **FR-070**: Network errors: "Unable to load. Check connection and try again" + Retry button
- **FR-071**: Validation errors: Field-specific messages next to inputs
- **FR-072**: Permission errors: "No permission for this action"
- **FR-073**: All errors include Retry button where applicable
- **FR-074**: Forms prevent duplicate submission (disable button during request)
- **FR-075**: Concurrent modification: "Order modified. Refresh and try again"

#### Accessibility
- **FR-080**: All inputs have associated labels with htmlFor
- **FR-081**: All interactive elements keyboard navigable (Tab, Enter, Escape)
- **FR-082**: Color distinctions supplemented with text labels
- **FR-083**: ARIA attributes for lists, sortable columns, dynamic regions
- **FR-084**: Loading states include spinner + "Loading..."
- **FR-085**: Modal headers semantic (role="heading")
- **FR-086**: Empty states include CTA button

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: PO list with filters loads in <2 seconds
- **SC-002**: User completes purchase receipt (10-20 items) in <5 minutes
- **SC-003**: 95% of users filter POs by supplier/status on first attempt
- **SC-004**: Movement list with 500+ records loads/filters in <3 seconds
- **SC-005**: Real-time stock updates visible within 2 seconds
- **SC-006**: MANAGER/STAFF see only their location (0% leaks, 100% correct)
- **SC-007**: All validation errors display clearly (100% coverage)
- **SC-008**: Keyboard-only users complete receipt flow without mouse
- **SC-009**: No console errors during typical workflows
- **SC-010**: All roles (SUPER_ADMIN, OWNER, ADMIN, MANAGER, STAFF) work with correct permissions

### Business Outcomes

- **SC-011**: Reduce receipt registration time by 80% vs. spreadsheets
- **SC-012**: 100% audit trail visibility (timestamp, user, reference for each movement)
- **SC-013**: Real-time visibility prevents double-selling

---

## Assumptions

1. Backend endpoints ready (Sprint 19 ✅)
2. shadcn/ui and Tailwind v4 available
3. User role/location from JWT (implemented)
4. Backend enforces RLS
5. Real-time: polling every 5-10s (WebSocket later)
6. PostgreSQL persistence
7. Responsive design follows project patterns
8. Spanish labels, user's locale date format
9. Manual retry on failures
10. ≤5000 POs, ≤10000 movements per tenant

---

## Out of Scope (v1)

- Edit existing POs
- Batch operations
- Reports/export (CSV, PDF)
- Email notifications
- Mobile app
- File uploads
- Approval workflows
- Multi-currency
