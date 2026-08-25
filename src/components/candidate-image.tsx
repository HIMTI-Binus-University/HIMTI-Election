import { useState } from "react";
import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export const CandidateImage = ({
  src,
  name,
  className,
}: {
  src: string | null;
  name: string;
  className?: string;
}) => {
  const [failed, setFailed] = useState(false);
  const safe = src && /^https?:\/\//i.test(src) && !failed;
  return safe ? (
    <img
      src={src}
      alt={`Portrait of ${name}`}
      className={cn("h-full w-full object-cover", className)}
      onError={() => setFailed(true)}
    />
  ) : (
    <div
      className={cn(
        "grid h-full w-full place-items-center bg-gradient-to-br from-brand-navy via-brand-blue to-sky-400 text-white",
        className,
      )}
      role="img"
      aria-label={`Portrait unavailable for ${name}`}
    >
      <UserRound className="size-16 opacity-90" aria-hidden="true" />
    </div>
  );
};
