import { cn } from "@/lib/utils";
import type { RequestStatus } from "@/data/mockData";

const map: Record<RequestStatus, { label: string; className: string }> = {
  DRAFT:                   { label: "Draft",              className: "bg-muted text-muted-foreground border-border" },
  SUBMITTED:               { label: "Diajukan",           className: "bg-info/10 text-info border-info/30" },
  NEED_REVISION:           { label: "Perlu Revisi",       className: "bg-warning/10 text-warning border-warning/30" },
  APPROVED_BY_SUPERVISOR:  { label: "Disetujui Atasan",   className: "bg-accent/10 text-accent border-accent/30" },
  APPROVED_BY_FINANCE:     { label: "Disetujui Finance",  className: "bg-primary/10 text-primary border-primary/30" },
  REJECTED:                { label: "Ditolak",            className: "bg-destructive/10 text-destructive border-destructive/30" },
  PURCHASED:               { label: "Sudah Dibeli",       className: "bg-info/10 text-info border-info/30" },
  REALIZED:                { label: "Realisasi",          className: "bg-success/10 text-success border-success/30" },
  CLOSED:                  { label: "Selesai",            className: "bg-success/15 text-success border-success/30" },
};

export function StatusBadge({ status, className }: { status: RequestStatus; className?: string }) {
  const c = map[status];
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md border whitespace-nowrap", c.className, className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80" />
      {c.label}
    </span>
  );
}
