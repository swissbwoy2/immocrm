

## Fix: PDF generation fails — WinAnsi encoding error

### Problem
The `formatCHF` function uses `Intl.NumberFormat('fr-CH')` which produces narrow no-break spaces (U+202F) as thousand separators. The `pdf-lib` library with standard fonts (Helvetica) uses WinAnsi encoding which cannot encode this character, causing the error: `WinAnsi cannot encode " " (0x202f)`.

### Fix
In `FicheSalairePDFViewer.tsx`, add a sanitizer function that replaces all non-WinAnsi characters (narrow no-break spaces, regular no-break spaces) with regular spaces before passing text to `pdf-lib`'s `drawText`:

```typescript
function sanitizeForPdf(text: string): string {
  return text.replace(/[\u00A0\u202F]/g, ' ');
}
```

Apply this sanitizer in the `drawRow` helper and all other `page.drawText` calls that use formatted currency values.

### File
- `src/components/salaires/FicheSalairePDFViewer.tsx` — wrap all `drawText` string arguments through `sanitizeForPdf`

