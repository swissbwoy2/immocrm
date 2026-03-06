

## Fix: Bonus not appearing on commission salary slips

### Problem
In `FicheSalairePDFViewer.tsx`, the "Primes / Bonus" line (line 166) is only rendered inside the `else` branch for fixed/hourly salaries. For commission-based employees (`isCommission` branch, lines 121-147), bonuses are never displayed even if `fiche.primes > 0`.

### Fix
In the commission branch (after "Total commissions" line at ~line 146), add a bonus row if `fiche.primes > 0`:

```typescript
// After Total commissions row
if (fiche.primes > 0) drawRow('Primes / Bonus', '', '', formatCHF(fiche.primes));
```

Then update the gross total line to include the bonus in the displayed total (it should already be included in `salaire_brut` from the calculation engine, but we need the visual line).

### File
- `src/components/salaires/FicheSalairePDFViewer.tsx` — add bonus row in the commission block (~after line 146)

