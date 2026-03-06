

## Fix: "invalid input syntax for type date" error

### Problem
When saving an employee, empty date strings (`""`) are sent to the database instead of `null`, causing a Postgres error since `""` is not a valid date.

### Fix
In `EmployeDialog.tsx`, clean `date_naissance` and `date_engagement` in the mutation to convert empty strings to `null`:

```typescript
date_naissance: data.date_naissance || null,
date_engagement: data.date_engagement || null,
```

This single change in the `cleaned` object (lines 145-153) fixes the issue.

### File
- `src/components/salaires/EmployeDialog.tsx` (mutation cleanup block)

