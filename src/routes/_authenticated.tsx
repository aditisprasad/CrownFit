import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Crown,
  LayoutDashboard,
  Sparkles,
  Mic2,
  MapPin,
  Building2,
  LogOut,
  Loader2,
  UserRound,
  Activity,
  CalendarDays,
  Gauge,
  CalendarCheck,
  Menu,
  X,
  ScanFace,
  PersonStanding,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AnairaWidget } from "@/components/anaira-widget";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
  },
  component: AuthenticatedShell,
});

const navGroups = [
  {
    label: "Overview",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/insights", label: "Digital Twin", icon: Gauge },
    ],
  },
  {
    label: "Coaching",
    items: [
      { to: "/anaira", label: "Anaira — AI Coach", icon: Sparkles },
      { to: "/mock-jury", label: "Mock Jury", icon: Mic2 },
      { to: "/plan", label: "Preparation Plan", icon: CalendarCheck },
      { to: "/skin-analysis", label: "Skin & Presentation", icon: ScanFace },
      { to: "/posture-analysis", label: "Posture & Stage Presence", icon: PersonStanding },
    ],
  },
  {
    label: "Wellness",
    items: [
      { to: "/tracker", label: "Personal Tracker", icon: Activity },
      { to: "/calendar", label: "Calendar & Bookings", icon: CalendarDays },
    ],
  },
  {
    label: "Discover",
    items: [
      { to: "/pageants", label: "Pageants", icon: MapPin },
      { to: "/providers", label: "Professionals", icon: Building2 },
    ],
  },
] as const;

function AuthenticatedShell() {
  const [checking, setChecking] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/auth" });
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/auth" });
      else setChecking(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link to="/" className="flex items-center gap-2 px-5 py-6">
        <Crown className="h-5 w-5 text-gold" />
        <span className="font-display text-xl">CrownFit</span>
      </Link>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="eyebrow px-3 pb-2">{group.label}</p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                    pathname.startsWith(item.to)
                      ? "bg-secondary text-gold"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="space-y-1 border-t border-border p-3">
        <Link
          to="/profile"
          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
        >
          <UserRound className="h-4 w-4" /> Profile
        </Link>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/" });
          }}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground lg:flex">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-border bg-card/60 backdrop-blur lg:block">
        {sidebar}
      </aside>

      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-card/80 px-4 py-3 backdrop-blur lg:hidden">
        <Link to="/dashboard" className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-gold" />
          <span className="font-display text-lg">CrownFit</span>
        </Link>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          className="text-muted-foreground hover:text-foreground"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {menuOpen && (
        <>
          <button
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden"
          />
          <div className="fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-card lg:hidden">
            {sidebar}
          </div>
        </>
      )}

      <main className="flex-1 px-4 py-6 sm:px-6 lg:ml-60 lg:px-8 lg:py-8">
        <Outlet />
      </main>

      <AnairaWidget />
    </div>
  );
}
