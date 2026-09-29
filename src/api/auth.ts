import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/config/api-client";
import { runtime } from "@/config/runtime";
import { apiPaths } from "@/constants/api";
import { queryKeys } from "@/constants/query-keys";

export interface Session {
  user: { id: string; name: string; email: string; image?: string | null };
  session: { id: string; expiresAt: string };
}

export interface CurrentUser {
  id: string;
  name: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  institutionType: "BINUS" | "NON_BINUS" | null;
  outlookEmailVerified: boolean;
  registrationCompleted: boolean;
}

const returnKey = "himti-election:return-path";

export const useSession = () =>
  useQuery({
    queryKey: queryKeys.session,
    queryFn: () =>
      apiClient.get<Session | null>(apiPaths.session).then(({ data }) => data),
    retry: false,
  });

export const useCurrentUser = (enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.currentUser,
    queryFn: () =>
      apiClient.get<CurrentUser>(apiPaths.currentUser).then(({ data }) => data),
    enabled,
    retry: false,
  });

let signingIn = false;
export const signInWithGoogle = async (returnPath: string) => {
  if (signingIn) return;
  signingIn = true;
  try {
    sessionStorage.setItem(returnKey, returnPath);
    const { data } = await apiClient.post<{ url?: string }>(apiPaths.signIn, {
      provider: "google",
      callbackURL: `${runtime.appUrl}/auth/callback`,
      errorCallbackURL: `${runtime.appUrl}/auth/error`,
    });
    if (!data.url) throw new Error("Sign-in could not be started");
    window.location.assign(data.url);
  } catch (error) {
    signingIn = false;
    throw error;
  }
};

export const getReturnPath = () => {
  const value = sessionStorage.getItem(returnKey);
  if (!value) return "/";
  try {
    const url = new URL(value, window.location.origin);
    return url.origin === window.location.origin &&
      !url.pathname.startsWith("/auth/")
      ? `${url.pathname}${url.search}${url.hash}`
      : "/";
  } catch {
    return "/";
  }
};

export const consumeReturnPath = () => {
  const value = getReturnPath();
  sessionStorage.removeItem(returnKey);
  return value;
};

export const useSignOut = () => {
  const queryClient = useQueryClient();
  return async () => {
    await apiClient.post(apiPaths.signOut);
    queryClient.clear();
    window.location.assign("/");
  };
};

export const needsProfileCompletion = (user: CurrentUser) =>
  !user.registrationCompleted ||
  (user.institutionType === "BINUS" && !user.outlookEmailVerified);
