import { LogOut, Menu, X } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { useSession, useSignOut } from "@/api/auth";
import { Button } from "@/components/ui/button";

export function PageLayout({ children }: { children: ReactNode }) {
  const session = useSession();
  const signOut = useSignOut();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="election-wash relative flex min-h-dvh flex-col overflow-hidden text-foreground">
      <div
        aria-hidden="true"
        className="grid-mark pointer-events-none absolute inset-x-0 top-0 h-[34rem]"
      />
      <header className="relative z-20 px-4 pt-4 sm:px-6 sm:pt-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-[0_10px_30px_-22px_rgba(0,33,79,0.6)] backdrop-blur sm:px-5">
          <Link
            to="/"
            className="flex items-center gap-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <img
              data-himti-brand-target="navbar"
              src="/logo-himti.png"
              width={44}
              height={44}
              alt=""
              className="size-11 object-contain"
            />
            <span className="hidden sm:block">
              <span className="block text-sm font-bold text-brand-navy">
                HIMTI BINUS
              </span>
              <span className="block text-xs font-semibold text-brand-slate">
                HIMTI Election
              </span>
            </span>
          </Link>
          <nav
            className="hidden items-center gap-2 sm:flex"
            aria-label="Main navigation"
          >
            <Link
              className="rounded-lg px-3 py-2 text-sm font-semibold text-brand-blue hover:bg-brand-pale hover:text-brand-navy"
              to="/"
            >
              Home
            </Link>
            <Link
              className="rounded-lg px-3 py-2 text-sm font-semibold text-brand-blue hover:bg-brand-pale hover:text-brand-navy"
              to="/candidates"
            >
              Candidates
            </Link>
            <Link
              className="rounded-lg px-3 py-2 text-sm font-semibold text-brand-blue hover:bg-brand-pale hover:text-brand-navy"
              to="/vote"
            >
              Vote
            </Link>
            <Link
              className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-brand-blue hover:bg-brand-pale hover:text-brand-navy lg:inline-flex"
              to="/results"
            >
              Results
            </Link>
            {session.data ? (
              <Button className="px-4" onClick={() => void signOut()}>
                <LogOut className="size-4" aria-hidden="true" />
                <span>Sign out</span>
              </Button>
            ) : null}
          </nav>
          <button
            type="button"
            className="grid size-11 place-items-center rounded-xl border border-border bg-white text-brand-navy sm:hidden"
            aria-label={
              menuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        {menuOpen ? (
          <nav
            id="mobile-navigation"
            className="mx-auto mt-2 grid max-w-6xl gap-1 rounded-2xl border border-white/80 bg-white/95 p-3 shadow-brand backdrop-blur sm:hidden"
            aria-label="Mobile navigation"
          >
            {[
              ["Home", "/"],
              ["Candidates", "/candidates"],
              ["Vote", "/vote"],
              ["Results", "/results"],
            ].map(([label, to]) => (
              <Link
                key={to}
                to={to}
                className="rounded-xl px-4 py-3 font-semibold text-brand-slate hover:bg-brand-pale hover:text-brand-blue"
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </Link>
            ))}
            {session.data ? (
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl px-4 py-3 text-left font-semibold text-brand-slate hover:bg-brand-pale hover:text-brand-blue"
                onClick={() => void signOut()}
              >
                <LogOut className="size-4" aria-hidden="true" /> Sign out
              </button>
            ) : null}
          </nav>
        ) : null}
      </header>
      <main className="relative z-10 flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>
      <footer className="relative z-10 px-4 pb-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 rounded-2xl border border-white/80 bg-white/75 px-5 py-5 text-sm font-semibold text-brand-slate backdrop-blur sm:flex-row">
          <nav
            className="flex flex-wrap justify-center gap-5"
            aria-label="Footer navigation"
          >
            <Link to="/" className="hover:text-brand-blue">
              Home
            </Link>
            <Link to="/candidates" className="hover:text-brand-blue">
              Candidates
            </Link>
            <Link to="/vote" className="hover:text-brand-blue">
              Vote
            </Link>
          </nav>
          <p className="text-center text-xs">
            © {new Date().getFullYear()} HIMTI BINUS University
          </p>
        </div>
      </footer>
    </div>
  );
}
