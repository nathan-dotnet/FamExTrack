import { PageFrame } from "@/components/PageFrame";
import { StatusBadge } from "@/components/StatusBadge";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Family Ledger" },
      { name: "description", content: "Your account details, role and family link status." },
      { property: "og:title", content: "Profile — Family Ledger" },
      { property: "og:description", content: "Account details and link status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <PageFrame title="Profile">
      {(account) => (
        <div className="card-surface max-w-md space-y-3 p-5">
          <div>
            <p className="label-caps">Name</p>
            <p className="text-sm font-medium">{account.fullName}</p>
          </div>
          <div>
            <p className="label-caps">Email</p>
            <p className="text-sm">{account.email}</p>
          </div>
          <div>
            <p className="label-caps">Role</p>
            <p className="text-sm capitalize">{account.role}</p>
          </div>
          {account.role === "son" ? (
            <div className="space-y-1">
              <p className="label-caps">Family link</p>
              <StatusBadge
                label={account.linkStatus === "linked" ? "Linked to parent" : "Awaiting approval"}
                tone={account.linkStatus === "linked" ? "ok" : "warn"}
              />
            </div>
          ) : null}
        </div>
      )}
    </PageFrame>
  );
}
