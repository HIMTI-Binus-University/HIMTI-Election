import { useEffect, useState } from "react";

const getRemaining = (target: string, now: number) => {
  const distance = Math.max(0, new Date(target).getTime() - now);
  return {
    days: Math.floor(distance / 86_400_000),
    hours: Math.floor((distance % 86_400_000) / 3_600_000),
    minutes: Math.floor((distance % 3_600_000) / 60_000),
    seconds: Math.floor((distance % 60_000) / 1_000),
  };
};

export const ElectionCountdown = ({
  startsAt,
  endsAt,
}: {
  startsAt: string;
  endsAt: string;
}) => {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const start = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(timer);
    };
  }, []);

  const beforeStart = now !== null && now < new Date(startsAt).getTime();
  const expired = now !== null && now >= new Date(endsAt).getTime();
  const target = beforeStart ? startsAt : endsAt;
  const remaining = getRemaining(target, now ?? new Date(startsAt).getTime());

  return (
    <section className="rounded-[2rem] border border-white bg-white/85 px-5 py-8 text-center shadow-brand backdrop-blur sm:px-10 sm:py-11">
      <p className="text-sm font-bold uppercase tracking-[0.14em] text-brand-blue">
        {expired
          ? "Voting has ended"
          : beforeStart
            ? "Voting begins in"
            : "Voting ends in"}
      </p>
      <div
        className="mx-auto mt-7 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5"
        aria-live="polite"
      >
        {Object.entries(remaining).map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl bg-brand-navy px-3 py-5 text-white sm:py-7"
          >
            <span className="block text-4xl font-bold tabular-nums sm:text-5xl">
              {String(value).padStart(2, "0")}
            </span>
            <span className="mt-2 block text-xs font-bold uppercase tracking-[0.1em] text-white/60">
              {label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};
