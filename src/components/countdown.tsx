import { formatElectionDate } from "@/utils/date";

export const ElectionCountdown = ({
  target,
  label,
  now,
}: {
  target: string | null;
  label: string;
  now: number;
}) => {
  const distance = target ? Math.max(0, new Date(target).getTime() - now) : 0;
  const remaining = {
    days: Math.floor(distance / 86_400_000),
    hours: Math.floor((distance % 86_400_000) / 3_600_000),
    minutes: Math.floor((distance % 3_600_000) / 60_000),
    seconds: Math.floor((distance % 60_000) / 1_000),
  };

  return (
    <section
      aria-label="Election countdown"
      className="flex min-h-[19rem] flex-col justify-center rounded-xl bg-gradient-to-br from-brand-navy via-brand-blue to-brand-navy px-5 py-9 text-white sm:min-h-[22rem] sm:px-10 lg:px-14"
    >
      <h2
        className="text-center text-xl font-bold [text-wrap:balance] sm:text-2xl"
        role="status"
      >
        {label}
        {target && (
          <span className="sr-only">: {formatElectionDate(target)}</span>
        )}
      </h2>
      {target && (
        <dl className="mx-auto mt-7 grid w-full max-w-4xl grid-cols-4 gap-2 sm:mt-9 sm:gap-4">
          {Object.entries(remaining).map(([unit, value]) => (
            <div
              key={unit}
              className="flex min-w-0 flex-col-reverse text-center"
            >
              <dt className="mt-3 text-xs font-semibold capitalize text-white/80 sm:mt-5 sm:text-sm">
                {unit}
              </dt>
              <dd className="grid min-h-20 place-items-center rounded-lg border border-white/25 bg-gradient-to-br from-white/25 via-white/10 to-white/5 text-3xl font-bold tabular-nums tracking-tight backdrop-blur-sm sm:min-h-28 sm:text-5xl lg:min-h-32 lg:text-6xl">
                {String(value).padStart(2, "0")}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
};
