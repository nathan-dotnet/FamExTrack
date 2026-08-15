import { PageFrame } from "@/components/PageFrame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { categoriesQuery } from "@/lib/queries";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/categories")({
  head: () => ({
    meta: [
      { title: "Categories — Family Ledger" },
      {
        name: "description",
        content: "Manage the spending categories used across budgets and expenses.",
      },
      { property: "og:title", content: "Categories — Family Ledger" },
      { property: "og:description", content: "Manage spending categories." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  return (
    <PageFrame title="Categories" subtitle="Used by budgets and expenses" requireRole="parent">
      {() => <Categories />}
    </PageFrame>
  );
}

function Categories() {
  const queryClient = useQueryClient();
  const categories = useQuery(categoriesQuery());
  const [name, setName] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["categories"] });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("categories")
        .insert({ name: name.trim(), sort_order: (categories.data?.length ?? 0) + 1 });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setName("");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggle = useMutation({
    mutationFn: async (vars: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("categories")
        .update({ is_active: vars.active })
        .eq("id", vars.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-4">
      <div className="card-surface flex gap-2 p-4">
        <Input
          placeholder="New category name"
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button
          disabled={name.trim().length < 2 || create.isPending}
          onClick={() => create.mutate()}
        >
          Add
        </Button>
      </div>

      <div className="card-surface divide-y">
        {(categories.data ?? []).map((category) => (
          <div key={category.id} className="flex items-center justify-between gap-3 p-4">
            <p className="text-sm font-medium">{category.name}</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {category.is_active ? "Active" : "Hidden"}
              </span>
              <Switch
                checked={category.is_active}
                onCheckedChange={(checked: boolean) =>
                  toggle.mutate({ id: category.id, active: checked })
                }
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
