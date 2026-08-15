import { AppShell } from "@/components/AppShell";
import { useAccount } from "@/hooks/useAccount";
import type { AccountInfo } from "@/lib/account.functions";
import type { AppRole } from "@/lib/domain";
import { Loader2, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

export function PageFrame({
    title,
    subtitle,
    actions,
    requireRole,
    children,
    }: {
    title: string;
    subtitle?: string;
    actions?: ReactNode | ((account: AccountInfo) => ReactNode);
    requireRole?: AppRole;
    children: (account: AccountInfo) => ReactNode;
    }) {
    const { data: account, isLoading, error } = useAccount();

    if (isLoading || !account) {
        return (
        <div className="flex min-h-screen items-center justify-center">
            {error ? (
            <p className="max-w-sm text-center text-sm text-over">
                We couldn't load your account: {error.message}
            </p>
            ) : (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
            )}
        </div>
        );
    }

    const denied = requireRole && account.role !== requireRole;

    return (
        <AppShell
        role={account.role}
        name={account.fullName}
        title={title}
        subtitle={subtitle}
        actions={typeof actions === "function" ? actions(account) : actions}
        >
        {account.role === "son" && account.linkStatus !== "linked" ? (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-warn/35 bg-warn-soft p-3 text-sm text-warn-foreground">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <p>
                Your account is waiting for parent approval. You can prepare a budget now, but your
                parent won't see it until the link is approved.
            </p>
            </div>
        ) : null}

        {denied ? (
            <div className="card-surface p-6 text-sm text-muted-foreground">
            This page is only available to {requireRole === "parent" ? "the parent" : "son"} accounts.
            </div>
        ) : (
            children(account)
        )}
        </AppShell>
    );
}
