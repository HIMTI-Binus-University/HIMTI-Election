const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const runtime = {
  apiBaseUrl: trimTrailingSlash(
    import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api",
  ),
  appUrl: trimTrailingSlash(
    import.meta.env.VITE_APP_URL ?? window.location.origin,
  ),
  registrationAppUrl: trimTrailingSlash(
    import.meta.env.VITE_REGISTRATION_APP_URL ?? "http://localhost:3000",
  ),
};

export const buildRegistrationUrl = (returnPath: string) => {
  const url = new URL("/register", runtime.registrationAppUrl);
  url.searchParams.set(
    "returnTo",
    new URL(returnPath, runtime.appUrl).toString(),
  );
  return url.toString();
};
