import { createFileRoute, Link } from "@tanstack/react-router";
import { Crown, Sparkles, Mic2, ScanFace, MapPin, CalendarCheck, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CrownFit — Pageant Preparation & Performance OS" },
      {
        name: "description",
        content:
          "CrownFit is the AI-powered operating system for pageant contestants: coaching, mock jury interviews, readiness tracking, and verified pageant & provider discovery.",
      },
      { property: "og:title", content: "CrownFit — Pageant Preparation & Performance OS" },
      {
        property: "og:description",
        content:
          "AI coaching, strict mock jury interviews, digital-twin readiness, and verified discovery — built for serious contestants.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const modules = [
  {
    icon: Sparkles,
    title: "Anaira — AI Coach",
    desc: "A demanding, honest mentor for interview, walk, wardrobe and mindset — with zero fabricated facts.",
  },
  {
    icon: Mic2,
    title: "Mock Jury Interview",
    desc: "A strict jury panel that probes, scores 0–10 on clarity, substance, poise and authenticity, and tells you exactly why.",
  },
  {
    icon: ScanFace,
    title: "Digital Twin Readiness",
    desc: "Posture, voice, mood and preparation signals fused into one readiness score you can track over time.",
  },
  {
    icon: MapPin,
    title: "Verified Discovery",
    desc: "Real pageants and real providers — institutes, coaches, designers, MUAs. If it's not verified, it says so.",
  },
  {
    icon: CalendarCheck,
    title: "Preparation & Bookings",
    desc: "Tasks, calendar events and bookings tracked in one place, from audition to finale.",
  },
  {
    icon: Crown,
    title: "Portfolio Builder",
    desc: "Comp cards, achievements, photos and resume — a public profile that looks like a magazine spread.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <Crown className="h-6 w-6 text-gold" />
          <span className="font-display text-2xl tracking-wide">CrownFit</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link to="/auth" className="rounded-md px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
            Sign in
          </Link>
          <Link
            to="/auth"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Begin your reign
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-24 pt-16 text-center md:pt-24">
        <p className="eyebrow mb-6">The Pageant Operating System</p>
        <h1 className="font-display mx-auto max-w-3xl text-5xl leading-[1.05] md:text-7xl">
          Prepare like a <span className="text-gradient-royal">queen</span>. Perform like one too.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          CrownFit fuses AI coaching, a brutally honest mock jury, biometric readiness tracking and verified pageant
          discovery into one elegant system — built for contestants who intend to win.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Start preparing <ArrowRight className="h-4 w-4" />
          </Link>
          <a href="#modules" className="rounded-md border border-border px-6 py-3 text-sm text-muted-foreground hover:text-foreground">
            Explore the system
          </a>
        </div>
        <div className="hairline mx-auto mt-20 max-w-3xl" />
      </section>

      <section id="modules" className="mx-auto max-w-6xl px-6 pb-24">
        <p className="eyebrow mb-3 text-center">Six modules. One crown.</p>
        <h2 className="font-display mb-12 text-center text-4xl">Everything between you and the title</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <div key={m.title} className="glass-panel rounded-xl p-6 transition-transform hover:-translate-y-1">
              <m.icon className="mb-4 h-7 w-7 text-gold" />
              <h3 className="font-display mb-2 text-2xl">{m.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h2 className="font-display text-4xl">No fabricated facts. Ever.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Pageant data in CrownFit is either verified against official sources or clearly marked
            “Official information unavailable”. Your preparation deserves the truth.
          </p>
          <Link
            to="/auth"
            className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Claim your seat <Crown className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        CrownFit — Pageant Preparation &amp; Performance OS
      </footer>
    </div>
  );
}
