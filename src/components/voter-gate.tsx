import axios from "axios";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import {
  needsProfileCompletion,
  signInWithGoogle,
  useCurrentUser,
  useSession,
} from "@/api/auth";
import { ErrorState, LoadingState } from "@/components/async-state";
import { Button } from "@/components/ui/button";
import { buildRegistrationUrl } from "@/config/runtime";

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
