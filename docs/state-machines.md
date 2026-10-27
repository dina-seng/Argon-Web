# Argon – State Machines

> These state machines MUST be enforced in service code. Do not perform state transitions outside the designated service methods.

---

## Booking State Machine

```
              ┌─────────────────────────────┐
              │         PENDING             │
              │  (created on reservation)   │
              └──────────┬──────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
        PAID           EXPIRED      CANCELLED
   (webhook)       (TTL expired  (user cancels
                    or sweeper)   before pay)
          │
          ▼
       REFUNDED
  (organizer manual
    override only)
```

### Transitions

| From | To | Trigger | Notes |
|------|----|---------|-------|
| PENDING | PAID | Payment webhook verified | Idempotent; mint tickets in same transaction |
| PENDING | EXPIRED | Redis TTL + sweeper job | Decrement reservedCount in transaction |
| PENDING | CANCELLED | User cancels | Before payment only |
| PAID | REFUNDED | Organizer manual action | Admin/Organizer role only |

### Terminal States

`EXPIRED`, `CANCELLED`, and `REFUNDED` are **terminal** — no further transitions allowed.

---

## Ticket State Machine

```
         ┌──────────────┐
         │    ACTIVE    │
         │ (minted on   │
         │  payment)    │
         └──────┬───────┘
                │
       ┌────────┴────────┐
       ▼                 ▼
  CHECKED_IN          REVOKED
  (gate scan)      (organizer /
                    admin action)
```

### Transitions

| From | To | Trigger | Notes |
|------|----|---------|-------|
| ACTIVE | CHECKED_IN | Gate scan (Flow C) | Irreversible; 409 on duplicate scan |
| ACTIVE | REVOKED | Organizer / Admin | Prevents future scan |

### Terminal States

`CHECKED_IN` is **irreversible**. `REVOKED` is terminal.

---

## Implementation Notes

- All state transitions MUST use `prisma.$transaction` to prevent race conditions.
- Never mutate `status` directly in a route handler — always call the service layer.
- Return `409 Conflict` for duplicate scan attempts with the prior check-in timestamp.
- The sweeper job (`jobs/holdReconciliation`) is the **source of truth** for expiry; Redis TTL is the fast path.
