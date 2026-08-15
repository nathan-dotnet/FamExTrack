import { ensureAccount, type AccountInfo } from "@/lib/account.functions";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

export function useAccount() {
    const ensure = useServerFn(ensureAccount);
    return useQuery<AccountInfo>({
        queryKey: ["account"],
        queryFn: () => ensure(),
        staleTime: 60_000,
        retry: 1,
    });
}
