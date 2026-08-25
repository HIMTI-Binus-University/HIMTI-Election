import { AlertCircle, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const LoadingState = ({
  label = "Loading election",
}: {
  label?: string;
}) => (
  <div
    role="status"
    className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center text-center"
  >
    <LoaderCircle
      className="size-9 animate-spin text-brand-blue"
      aria-hidden="true"
    />
    <p className="mt-4 text-sm font-semibold text-brand-slate">{label}</p>
  </div>
);

export const ErrorState = ({
  title = "We could not load this page",
  message = "Check your connection and try again.",
  retry,
}: {
  title?: string;
  message?: string;
  retry?: () => void;
}) => (
  <section
    role="alert"
    className="mx-auto max-w-xl rounded-3xl border border-red-200 bg-white p-7 text-center shadow-brand sm:p-10"
  >
    <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-red-50 text-red-700">
      <AlertCircle className="size-6" aria-hidden="true" />
    </span>
    <h1 className="mt-5 text-2xl font-bold text-brand-navy">{title}</h1>
    <p className="mt-3 text-sm leading-6 text-brand-slate">{message}</p>
    {retry ? (
      <Button className="mt-6" onClick={retry}>
        Try again
      </Button>
    ) : null}
  </section>
);
