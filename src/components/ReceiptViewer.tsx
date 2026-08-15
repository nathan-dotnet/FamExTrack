import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { dateTimeLabel } from "@/lib/format";
import { getReceiptUrl } from "@/lib/receipts.functions";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, FileText, Loader2, Receipt, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";

export function ReceiptViewer({
    expenseId,
    triggerLabel = "View receipt",
    meta,
    }: {
    expenseId: string;
    triggerLabel?: string;
    meta?: { description: string; amount: string; date: string };
    }) {
    const [open, setOpen] = useState(false);
    const [zoom, setZoom] = useState(1);
    const fetchUrl = useServerFn(getReceiptUrl);

    const { data, isLoading, error } = useQuery({
        queryKey: ["receipt", expenseId],
        queryFn: () => fetchUrl({ data: { expenseId } }),
        enabled: open,
        staleTime: 120_000,
    });

    return (
        <Dialog
        open={open}
        onOpenChange={(next: boolean) => {
            setOpen(next);
            if (!next) setZoom(1);
        }}
        >
        <DialogTrigger>
        <Button variant="outline" size="sm">
            <Receipt className="size-4" />
            {triggerLabel}
        </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl">
            <DialogHeader>
            <DialogTitle>Receipt</DialogTitle>
            </DialogHeader>

            {meta ? (
            <div className="grid gap-1 rounded-md bg-muted/60 p-3 text-sm">
                <p className="font-medium">{meta.description}</p>
                <p className="money text-muted-foreground">
                {meta.amount} · {meta.date}
                </p>
            </div>
            ) : null}

            {isLoading ? (
            <div className="flex h-48 items-center justify-center">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
            ) : error ? (
            <p className="text-sm text-over">This receipt is not available to you.</p>
            ) : !data?.url ? (
            <p className="text-sm text-muted-foreground">No receipt was attached to this expense.</p>
            ) : (
            <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="truncate">
                    {data.filename} · uploaded {dateTimeLabel(data.uploadedAt ?? null)}
                </span>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}>
                    <ZoomOut className="size-4" />
                    </Button>
                    <span className="w-10 text-center">{Math.round(zoom * 100)}%</span>
                    <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.min(3, z + 0.25))}>
                    <ZoomIn className="size-4" />
                    </Button>
                    <a
                    href={data.url}
                    target="_blank"
                    rel="noreferrer"
                    download={data.filename ?? undefined}
                    className="inline-flex size-9 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                    <Download className="size-4" />
                    </a>
                </div>
                </div>

                <div className="max-h-[60vh] overflow-auto rounded-md border bg-muted/40 p-2">
                {data.mime === "application/pdf" ? (
                    <a
                    className="flex items-center gap-2 p-6 text-sm underline"
                    href={data.url}
                    target="_blank"
                    rel="noreferrer"
                    >
                    <FileText className="size-4" /> Open PDF receipt
                    </a>
                ) : (
                    <img
                    src={data.url}
                    alt="Uploaded receipt"
                    className="mx-auto origin-top transition-transform"
                    style={{ transform: `scale(${zoom})` }}
                    />
                )}
                </div>
            </div>
            )}
        </DialogContent>
        </Dialog>
    );
}
