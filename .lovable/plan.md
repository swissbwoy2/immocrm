

## Fix Pass 2 — 3 targeted corrections

### 1. OffersTab.tsx
- Replace `offer.subject` with `offer.message_subject` (line 60-64 in OfferPreviewDialog)
- Remove `SendOfferDialog` import, state, and JSX (lines 14, 26, 148-152, 177-185)
- Remove `Mail` from lucide import

### 2. ApprovalsTab.tsx
- Fix filter values: `offer_send` -> `offer`, `visit_request` -> `visit` (lines 134-135)
- Import `useAuth` and populate `decided_by` with current user email in `decideMutation` (line 56)

### 3. VisitsTab.tsx
- Remove `createCrmVisitMutation` entirely (lines 62-96)
- Remove CRM "Créer visite" button from table actions (lines 180-189)
- Remove `onCreateVisit`/`isCreating` props from `VisitDetailDrawer` usage (lines 217-218)
- Remove `CalendarPlus` from imports
- Clean up `VisitDetailDrawer.tsx`: remove CRM creation section (lines 80-111), remove `onCreateVisit`/`isCreating` props, remove `visitDate` state, remove `CalendarPlus`/`Loader2` imports

### Files modified
- `OffersTab.tsx` — remove SendOfferDialog
- `OfferPreviewDialog.tsx` — `subject` -> `message_subject`
- `ApprovalsTab.tsx` — fix filter enum values + add `decided_by`
- `VisitsTab.tsx` — remove CRM visit creation logic
- `VisitDetailDrawer.tsx` — remove CRM visit creation UI

