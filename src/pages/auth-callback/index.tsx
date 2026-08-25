import { Navigate } from "react-router-dom";
import {
  consumeReturnPath,
  needsProfileCompletion,
  useCurrentUser,
  useSession,
} from "@/api/auth";
import { ErrorState, LoadingState } from "@/components/async-state";
import { PageLayout } from "@/components/layout/page-layout";
import { buildRegistrationUrl } from "@/config/runtime";

export default function AuthCallbackPage() {
  const session = useSession();
  const profile = useCurrentUser(Boolean(session.data));
  if (session.isLoading || (session.data && profile.isLoading))
    return (
      <PageLayout>
        <LoadingState label="Finishing sign in" />
      </PageLayout>
    );
  if (session.isError || profile.isError)
    return (
      <PageLayout>
        <ErrorState
          title="Sign in could not be completed"
          retry={() => {
            void session.refetch();
            void profile.refetch();
          }}
        />
      </PageLayout>
    );
  if (!session.data) return <Navigate to="/vote" replace />;
  const destination = consumeReturnPath();
  if (profile.data && needsProfileCompletion(profile.data)) {
    window.location.replace(buildRegistrationUrl(destination));
    return (
      <PageLayout>
        <LoadingState label="Redirecting to complete your profile" />
      </PageLayout>
    );
  }
  return profile.data ? (
    <Navigate to={destination} replace />
  ) : (
    <PageLayout>
      <LoadingState />
    </PageLayout>
  );
}
