import type { Tone } from "@/lib/domain";
import { cn } from "@/lib/utils";

const toneClass: Record<Tone, string> = {
  ok: "bg-ok-soft text-ok border-ok/25",
  warn: "bg-warn-soft text-warn-foreground border-warn/35",
  over: "bg-over-soft text-over border-over/25",
  neutral: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({
  label,
  tone = "neutral",
  className,
}: {
  label: string;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        toneClass[tone],
        className,
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          tone === "ok" && "bg-ok",
          tone === "warn" && "bg-warn",
          tone === "over" && "bg-over",
          tone === "neutral" && "bg-muted-foreground/60",
        )}
      />
      {label}
    </span>
  );
}
