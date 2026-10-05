import { LogIn, LogOut, Menu, X } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { signInWithGoogle, useSession, useSignOut } from "@/api/auth";
import { Button } from "@/components/ui/button";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${isActive ? "bg-brand-pale text-brand-navy" : "text-brand-blue hover:bg-brand-pale hover:text-brand-navy"}`;

export function PageLayout({ children }: { children: ReactNode }) {
  const session = useSession();
  const signOut = useSignOut();
  const location = useLocation();
  const [signInError, setSignInError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const signIn = async () => {
    setSignInError("");
    setSigningIn(true);
    try {
      await signInWithGoogle(
        `${location.pathname}${location.search}${location.hash}`,
      );
    } catch (error) {
      setSignInError(
        error instanceof Error
          ? error.message
          : "Sign-in could not be started. Please try again.",
      );
      setSigningIn(false);
    }
  };
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="election-wash relative flex min-h-dvh flex-col overflow-x-clip text-foreground">
      <div
        aria-hidden="true"
        className="grid-mark pointer-events-none absolute inset-x-0 top-0 h-[34rem]"
      />
      <header className="sticky top-0 z-30 px-4 pt-4 sm:px-6 sm:pt-6">
        <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto] items-center rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-[0_10px_30px_-22px_rgba(0,33,79,0.6)] backdrop-blur sm:grid-cols-[1fr_auto_1fr] sm:px-5">
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
            {[
              ["Home", "/"],
              ["Candidates", "/candidates"],
              ["Vote", "/vote"],
              ["Results", "/results"],
            ].map(([label, to]) => (
              <NavLink
                key={to}
                className={({ isActive }) =>
                  `${navClass({ isActive })} ${to === "/results" ? "hidden lg:inline-flex" : ""}`
                }
                to={to}
                end
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden justify-self-end sm:block">
            {session.data ? (
              <Button
                variant="outline"
                className="border-red-300 bg-white px-4 text-red-700 hover:bg-red-50"
                onClick={() => void signOut()}
              >
                <LogOut className="size-4" aria-hidden="true" />
                <span>Sign out</span>
              </Button>
            ) : (
              <Button
                className="px-4"
                disabled={signingIn}
                onClick={() => void signIn()}
              >
                <LogIn className="size-4" aria-hidden="true" />
                <span>{signingIn ? "Signing in..." : "Sign in"}</span>
              </Button>
            )}
          </div>
          <button
            type="button"
            className="grid size-11 place-items-center justify-self-end rounded-xl border border-border bg-white text-brand-navy sm:hidden"
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
              <NavLink
                key={to}
                to={to}
                end
                className={({ isActive }) =>
                  `rounded-xl px-4 py-3 text-center font-semibold ${isActive ? "bg-brand-pale text-brand-navy" : "text-brand-slate hover:bg-brand-pale hover:text-brand-blue"}`
                }
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </NavLink>
            ))}
            {session.data ? (
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-3 font-semibold text-red-700 hover:bg-red-50"
                onClick={() => void signOut()}
              >
                <LogOut className="size-4" aria-hidden="true" /> Sign out
              </button>
            ) : (
              <button
                type="button"
                disabled={signingIn}
                className="flex items-center justify-center gap-2 rounded-xl bg-brand-blue px-4 py-3 font-semibold text-white disabled:opacity-50"
                onClick={() => void signIn()}
              >
                <LogIn className="size-4" aria-hidden="true" />{" "}
                {signingIn ? "Signing in..." : "Sign in"}
              </button>
            )}
          </nav>
        ) : null}
        {signInError && (
          <p
            role="alert"
            className="mx-auto mt-2 max-w-6xl rounded-lg border border-red-200 bg-white px-4 py-3 text-sm text-red-700"
          >
            {signInError}
          </p>
        )}
      </header>
      <main
        key={location.pathname}
        className="page-reveal relative z-10 flex-1 px-4 py-8 sm:px-6 sm:py-12"
      >
        {children}
      </main>
      <footer className="relative z-10 px-4 pb-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 rounded-2xl border border-white/80 bg-white/75 px-5 py-5 text-center text-sm font-semibold text-brand-slate backdrop-blur sm:flex-row">
          <p>HIMTI Election</p>
          <p className="text-xs">
            © {new Date().getFullYear()} HIMTI BINUS University
          </p>
        </div>
      </footer>
    </div>
  );
}
