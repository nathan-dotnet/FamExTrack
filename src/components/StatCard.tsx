import type { Tone } from "@/lib/domain";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const valueTone: Record<Tone, string> = {
    ok: "text-ok",
    warn: "text-warn-foreground",
    over: "text-over",
    neutral: "text-foreground",
    };

    export function StatCard({
    label,
    value,
    hint,
    tone = "neutral",
    icon,
    className,
    }: {
    label: string;
    value: ReactNode;
    hint?: ReactNode;
    tone?: Tone;
    icon?: ReactNode;
    className?: string;
    }) {
    return (
        <div className={cn("card-surface p-4", className)}>
        <div className="flex items-start justify-between gap-2">
            <p className="label-caps">{label}</p>
            {icon ? <span className="text-muted-foreground">{icon}</span> : null}
        </div>
        <p className={cn("money mt-2 text-2xl font-semibold font-display", valueTone[tone])}>{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
    );
}
