import axios from "axios";
import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import apiClient from "@/config/api-client";
import {
  needsProfileCompletion,
  signInWithGoogle,
  useCurrentUser,
  useSession,
} from "@/api/auth";
import { ErrorState, LoadingState } from "@/components/async-state";
import { Button } from "@/components/ui/button";
import { buildRegistrationUrl } from "@/config/runtime";

function DevLogin({ returnPath }: { returnPath: string }) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    void apiClient.get<{ enabled: boolean }>("/auth/dev-login")
      .then(({ data }) => { if (active) setEnabled(data.enabled === true); })
      .catch(() => { if (active) setEnabled(false); });
    return () => { active = false; };
  }, []);
  if (!enabled) return null;
  const signIn = async () => {
    setLoading(true);
    setError(false);
    try {
      await apiClient.post("/auth/dev-login", {}, { withCredentials: true });
      sessionStorage.setItem("himti-election:return-path", returnPath);
      window.location.assign("/auth/callback");
    } catch {
      setError(true);
      setLoading(false);
    }
  };
  return <>
    <Button className="mt-3 w-full sm:w-auto" disabled={loading} onClick={() => void signIn()}>
      {loading ? "Signing in..." : "Development System login"}
    </Button>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">Development sign-in failed. Please try again.</p>}
  </>;
}

export const VoterGate = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const session = useSession();
  const profile = useCurrentUser(Boolean(session.data));
  const returnPath = `${location.pathname}${location.search}${location.hash}`;

  if (session.isLoading || (session.data && profile.isLoading))
    return <LoadingState label="Checking your voting access" />;
  if (session.isError)
    return <ErrorState retry={() => void session.refetch()} />;
  if (!session.data)
    return (
      <section className="mx-auto max-w-xl rounded-3xl border border-white bg-white p-8 text-center shadow-brand sm:p-11">
        <img src="/icon-primary.svg" alt="" className="mx-auto h-16 w-auto" />
        <h1 className="mt-5 text-3xl font-bold text-brand-navy">
          Sign in to continue
        </h1>
        <p className="mt-3 text-sm leading-6 text-brand-slate">
          Use your HIMTI account to verify your eligibility before opening the
          ballot.
        </p>
        <Button
          className="mt-7 w-full sm:w-auto"
          onClick={() => void signInWithGoogle(returnPath)}
        >
          Sign in with Google
        </Button>
        <DevLogin returnPath={returnPath} />
      </section>
    );
  if (profile.isError) {
    const unauthorized =
      axios.isAxiosError(profile.error) &&
      profile.error.response?.status === 401;
    return unauthorized ? (
      <Navigate to="/" replace />
    ) : (
      <ErrorState retry={() => void profile.refetch()} />
    );
  }
  if (!profile.data) return <LoadingState />;
  if (needsProfileCompletion(profile.data)) {
    window.location.replace(buildRegistrationUrl(returnPath));
    return <LoadingState label="Redirecting to complete your profile" />;
  }
  return <>{children}</>;
};
