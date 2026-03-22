# Quickstart: Receipts — Integration Scenarios

## Setup (unit tests — mocked Prisma)

```ts
// Standard mock pattern from the codebase
function makePrisma(overrides = {}): PrismaService {
  return {
    receipt: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    receiptFolioCounter: {
      upsert: jest.fn(),
    },
    plan: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    appointment: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    location: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((fn) => fn({ /* tx mock */ })),
    ...overrides,
  } as unknown as PrismaService;
}
```

---

## Scenario 1: Create CASH receipt — happy path

```ts
// Given: location exists, patient has consent, no appointment
prisma.location.findFirst.mockResolvedValue({ id: LOC_ID, name: 'Sucursal Norte' });
prisma.receiptFolioCounter.upsert.mockResolvedValue({ lastSequence: 1 });
prisma.receipt.create.mockResolvedValue({
  id: RECEIPT_ID, folio: 'SUC-2026-00001', status: 'ACTIVE', paymentType: 'CASH', ...
});

// When
const result = await service.create(dto, TENANT_ID, USER_ID, null /* OWNER */);

// Then
expect(result.folio).toBe('SUC-2026-00001');
expect(result.status).toBe('ACTIVE');
```

---

## Scenario 2: Create BENEFIT receipt — plan session incremented

```ts
// Given: plan with usedSessions=3, plannedSessions=10
prisma.plan.findFirst.mockResolvedValue({
  id: PLAN_ID, tenantId: TENANT_ID, usedSessions: 3, plannedSessions: 10, status: 'ACTIVE',
});
prisma.plan.update.mockResolvedValue({ ...plan, usedSessions: 4, status: 'ACTIVE' });
prisma.receipt.create.mockResolvedValue({ ..., paymentType: 'BENEFIT', planId: PLAN_ID });

// When
const result = await service.create({ ...dto, paymentType: 'BENEFIT', planId: PLAN_ID }, ...);

// Then
expect(prisma.plan.update).toHaveBeenCalledWith(
  expect.objectContaining({ data: expect.objectContaining({ usedSessions: { increment: 1 } }) })
);
```

---

## Scenario 3: Create BENEFIT receipt — last session → plan EXHAUSTED

```ts
prisma.plan.findFirst.mockResolvedValue({
  id: PLAN_ID, usedSessions: 9, plannedSessions: 10, status: 'ACTIVE',
});
prisma.plan.update.mockResolvedValue({ ...plan, usedSessions: 10, status: 'EXHAUSTED' });

// When
await service.create({ ...dto, paymentType: 'BENEFIT', planId: PLAN_ID }, ...);

// Then
expect(prisma.plan.update).toHaveBeenCalledWith(
  expect.objectContaining({
    data: expect.objectContaining({ usedSessions: { increment: 1 }, status: 'EXHAUSTED' }),
  })
);
```

---

## Scenario 4: Create receipt with COMPLETED appointment

```ts
prisma.appointment.findFirst.mockResolvedValue({
  id: APPT_ID, status: 'COMPLETED', receiptId: null, locationId: LOC_ID,
});
// receipt.create + appointment.update called in transaction

// Then
expect(prisma.appointment.update).toHaveBeenCalledWith(
  expect.objectContaining({ where: { id: APPT_ID }, data: { receiptId: expect.any(String) } })
);
```

---

## Scenario 5: Reject appointment not COMPLETED

```ts
prisma.appointment.findFirst.mockResolvedValue({
  id: APPT_ID, status: 'SCHEDULED', receiptId: null,
});

await expect(service.create({ ...dto, appointmentId: APPT_ID }, ...)).rejects.toThrow(
  ConflictException,
);
```

---

## Scenario 6: BENEFIT without planId → 400

```ts
await expect(
  service.create({ ...dto, paymentType: 'BENEFIT', planId: undefined }, ...)
).rejects.toThrow(BadRequestException);
```

---

## Scenario 7: State transition — ACTIVE → FINISHED

```ts
prisma.receipt.findFirst.mockResolvedValue({ id: RECEIPT_ID, status: 'ACTIVE', locationId: LOC_ID });
prisma.receipt.update.mockResolvedValue({ ...receipt, status: 'FINISHED' });

const result = await service.updateStatus(RECEIPT_ID, { status: 'FINISHED' }, TENANT_ID, null);
expect(result.status).toBe('FINISHED');
```

---

## Scenario 8: Invalid transition → 400

```ts
prisma.receipt.findFirst.mockResolvedValue({ id: RECEIPT_ID, status: 'FINISHED', locationId: LOC_ID });

await expect(
  service.updateStatus(RECEIPT_ID, { status: 'CANCELLED' }, TENANT_ID, null)
).rejects.toThrow(BadRequestException);
```

---

## Scenario 9: Terminal state → 409

```ts
prisma.receipt.findFirst.mockResolvedValue({ id: RECEIPT_ID, status: 'SETTLED', locationId: LOC_ID });

await expect(
  service.updateStatus(RECEIPT_ID, { status: 'FINISHED' }, TENANT_ID, null)
).rejects.toThrow(ConflictException);
```

---

## Scenario 10: MANAGER location scope

```ts
// MANAGER with locationId = LOC_A
prisma.receipt.findMany.mockResolvedValue([]);

await service.findAll(TENANT_ID, LOC_A, {});

expect(prisma.receipt.findMany).toHaveBeenCalledWith(
  expect.objectContaining({ where: expect.objectContaining({ locationId: LOC_A }) })
);
```
