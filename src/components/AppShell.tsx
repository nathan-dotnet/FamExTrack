import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/domain";
import { notificationsQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
    BarChart3,
    Bell,
    ClipboardList,
    FolderCog,
    Home,
    LogOut,
    Menu,
    PlusCircle,
    Receipt,
    ScrollText,
    Send,
    UserCircle,
    Users,
    Wallet,
} from "lucide-react";
import { useState, type ReactNode } from "react";

type NavItem = { to: string; label: string; icon: ReactNode };

const parentNav: NavItem[] = [
  { to: "/dashboard", label: "Overview", icon: <Home className="size-4" /> },
  { to: "/family", label: "Family", icon: <Users className="size-4" /> },
  { to: "/budgets", label: "Budget requests", icon: <ClipboardList className="size-4" /> },
  { to: "/expenses", label: "Expenses", icon: <Receipt className="size-4" /> },
  { to: "/requests", label: "Money requests", icon: <Wallet className="size-4" /> },
  { to: "/transfers", label: "Money given", icon: <Send className="size-4" /> },
  { to: "/analytics", label: "Analytics", icon: <BarChart3 className="size-4" /> },
  { to: "/categories", label: "Categories", icon: <FolderCog className="size-4" /> },
  { to: "/notifications", label: "Notifications", icon: <Bell className="size-4" /> },
  { to: "/audit-log", label: "Audit log", icon: <ScrollText className="size-4" /> },
  { to: "/profile", label: "Settings", icon: <UserCircle className="size-4" /> },
];

const sonNav: NavItem[] = [
  { to: "/dashboard", label: "My money", icon: <Home className="size-4" /> },
  { to: "/budget", label: "My budget", icon: <ClipboardList className="size-4" /> },
  { to: "/expenses", label: "My expenses", icon: <Receipt className="size-4" /> },
  { to: "/expenses/new", label: "Add expense", icon: <PlusCircle className="size-4" /> },
  { to: "/requests", label: "Ask for money", icon: <Wallet className="size-4" /> },
  { to: "/notifications", label: "Notifications", icon: <Bell className="size-4" /> },
  { to: "/profile", label: "Profile", icon: <UserCircle className="size-4" /> },
];

export function AppShell({
  role,
  name,
  title,
  subtitle,
  actions,
  children,
}: {
  role: AppRole;
  name: string;
  title: string;
  subtitle?: string | undefined;
  actions?: ReactNode | undefined;
  children: ReactNode;
}) {
  const nav = role === "parent" ? parentNav : sonNav;
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: notifications } = useQuery(notificationsQuery());
  const unread = (notifications ?? []).filter((n) => !n.is_read).length;

  const signOut = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    navigate({ to: "/auth" });
  };

  const NavList = () => (
    <nav className="space-y-0.5">
      {nav.map((item) => {
        const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(`${item.to}/`));
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.icon}
            <span className="flex-1">{item.label}</span>
            {item.to === "/notifications" && unread > 0 ? (
              <span className="rounded-full bg-over px-1.5 text-[11px] font-semibold text-over-foreground">
                {unread}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen md:grid md:grid-cols-[16rem_1fr]">
      <aside className="hidden border-r bg-sidebar p-4 md:flex md:flex-col">
        <div className="px-2 pb-5">
          <p className="font-display text-base font-semibold">Family Ledger</p>
          <p className="text-xs text-muted-foreground">
            {role === "parent" ? "Parent control" : "Son account"}
          </p>
        </div>
        <NavList />
        <div className="mt-auto space-y-2 pt-4">
          <p className="truncate px-3 text-xs text-muted-foreground">{name}</p>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 md:px-6">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-4">
                <SheetTitle className="px-2 pb-4 font-display">Family Ledger</SheetTitle>
                <NavList />
                <Button variant="ghost" size="sm" className="mt-4 w-full justify-start" onClick={signOut}>
                  <LogOut className="size-4" /> Sign out
                </Button>
              </SheetContent>
            </Sheet>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold">{title}</h1>
              {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
            </div>
            <div className="flex items-center gap-2">{actions}</div>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 pb-24 md:px-6 md:pb-8">{children}</main>

        {role === "son" ? (
          <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-4 py-2 backdrop-blur md:hidden">
            <div className="flex gap-2">
              <Button asChild className="flex-1" size="lg">
                <Link to="/expenses/new">
                  <PlusCircle className="size-4" /> Add expense
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="flex-1">
                <Link to="/requests">
                  <Wallet className="size-4" /> Request money
                </Link>
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
