import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type PageSize = 10 | 50 | 100;

interface Props {
  total: number;
  page: number;
  pageSize: PageSize;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: PageSize) => void;
  label?: string;
}

export function TablePagination({ total, page, pageSize, onPageChange, onPageSizeChange, label = "offres" }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, totalPages);
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3 px-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Lignes par page</span>
        <Select value={String(pageSize)} onValueChange={v => onPageSizeChange(Number(v) as PageSize)}>
          <SelectTrigger className="h-8 w-[80px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="text-sm text-muted-foreground">
        {from}–{to} sur {total} {label}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onPageChange(current - 1)} disabled={current <= 1}>
          <ChevronLeft className="h-4 w-4" /> Précédent
        </Button>
        <span className="text-sm">Page {current} / {totalPages}</span>
        <Button variant="outline" size="sm" onClick={() => onPageChange(current + 1)} disabled={current >= totalPages}>
          Suivant <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
