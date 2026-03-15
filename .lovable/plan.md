

## Phase 4A — Real Offer Sending + Backend Approval Propagation

### Backend: 3 new routes in `ai-relocation-api/index.ts`

**Insert before line 239 (the 404 catch-all):**

#### Route 1: `POST /offers/:id/send`
New `handleOfferSend` handler:
1. Fetch `client_offer_messages` by ID, verify `ai_agent_id` matches
2. Reject if `status !== 'pret'` (400)
3. Parse body: `{ selected_property_ids?: string[], custom_message?: string }`
4. Fetch client email via `clients` -> `profiles` join
5. Fetch properties: if `selected_property_ids` provided, query those IDs then intersect with `offer.property_result_ids`; otherwise fetch all from `offer.property_result_ids`
6. Build HTML email server-side (property cards + `custom_message` or fallback to `offer.message_body`)
7. Call `send-smtp-email` via internal fetch using the **caller's authHeader** (passed through)
8. On success: update offer `status='envoye'`, `sent_at=now()`, update only validated subset `property_results.result_status='envoye_au_client'`, create client notification, log activity
9. On failure: update offer `status='erreur'`, store error, log activity

#### Route 2 & 3: `POST /approvals/:id/approve` and `POST /approvals/:id/reject`
Shared `handleApprovalDecision` handler:
1. Fetch `approval_requests` by ID, reject if not `pending`
2. Update: `status`, `decided_at=now()`, `decided_by=userId`, `decision_notes` from body
3. Cascade: `client_offer_messages` -> `pret`/`refuse`, `visit_requests` -> `demande_prete`/`visite_refusee`
4. Log activity

#### Routing (3 regex matches before line 239):
```typescript
const offerSendMatch = path.match(/^\/offers\/([^/]+)\/send$/);
const approveMatch = path.match(/^\/approvals\/([^/]+)\/approve$/);
const rejectMatch = path.match(/^\/approvals\/([^/]+)\/reject$/);
```

---

### Frontend: 3 files updated

#### `SendOfferDialog.tsx`
Strip all business logic (email building, DB updates, notifications). Keep property selection UI + custom message input. On confirm: `fetch()` to `${VITE_SUPABASE_URL}/functions/v1/ai-relocation-api/offers/${id}/send` with session token. Check `response.ok`, surface errors via toast.

#### `OffersTab.tsx`
Import `SendOfferDialog`, add `sendOffer` state. Show Send button for `status === 'pret'`. Wire dialog.

#### `ApprovalsTab.tsx`
Replace `decideMutation` body: call `fetch()` to `POST /approvals/:id/approve` or `/reject` with `{ notes }`. Remove all cascade logic. Check `response.ok`, surface backend errors.

---

### Files modified
| File | Change |
|---|---|
| `supabase/functions/ai-relocation-api/index.ts` | +3 routes, +2 handlers (~150 lines) |
| `src/components/admin/ai-relocation/SendOfferDialog.tsx` | Strip logic, call backend via fetch() |
| `src/components/admin/ai-relocation/OffersTab.tsx` | Add send button for `pret` offers |
| `src/components/admin/ai-relocation/ApprovalsTab.tsx` | Replace mutation with backend fetch() calls |

No schema changes.

