import { Clock3 } from "lucide-react";

export function NoElection({ message }: { message: string }) {
  return (
    <section className="mx-auto max-w-xl rounded-xl border border-brand-blue/20 bg-gradient-to-br from-brand-pale via-white to-brand-pale px-6 py-9 text-center sm:px-10 sm:py-12">
      <Clock3 className="mx-auto size-9 text-brand-blue" aria-hidden="true" />
      <h1 className="mt-5 break-words text-3xl font-bold leading-tight tracking-tight text-brand-navy sm:text-4xl">
        No election is active
      </h1>
      <p className="mt-4 text-base leading-7 text-brand-slate">{message}</p>
    </section>
  );
}
