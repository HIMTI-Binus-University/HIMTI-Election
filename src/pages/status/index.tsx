import { CheckCircle2, Copy, Vote } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useCurrentElection, useVoteStatus } from "@/api/elections";
import { ErrorState, LoadingState } from "@/components/async-state";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { VoterGate } from "@/components/voter-gate";
import { formatElectionDate } from "@/utils/date";

function StatusContent() {
  const election = useCurrentElection();
  const status = useVoteStatus(election.data?.id, Boolean(election.data));
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  if (election.isLoading || status.isLoading)
    return <LoadingState label="Checking your ballot status" />;
  if (election.isError || status.isError || !election.data)
    return (
      <ErrorState
        retry={() => {
          void election.refetch();
          void status.refetch();
        }}
      />
    );
  if (!status.data?.hasVoted)
    return (
      <section className="page-reveal mx-auto max-w-xl rounded-3xl border border-white bg-white p-8 text-center shadow-brand sm:p-11">
        <Vote className="mx-auto size-12 text-brand-blue" />
        <h1 className="mt-5 text-3xl font-bold text-brand-navy">
          No ballot recorded yet
        </h1>
        <p className="mt-3 text-sm leading-6 text-brand-slate">
          When voting is open, you can submit one final ballot.
        </p>
        <Button asChild className="mt-7">
          <Link to="/vote">Open the ballot</Link>
        </Button>
      </section>
    );
  return (
    <section className="page-reveal mx-auto max-w-xl rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-brand sm:p-11">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
        <CheckCircle2 className="size-8" />
      </span>
      <p className="mt-5 text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">
        Ballot accepted
      </p>
      <h1 className="mt-2 text-3xl font-bold text-brand-navy">
        Your vote has been recorded
      </h1>
      <p className="mt-3 text-sm leading-6 text-brand-slate">
        This receipt confirms that the system accepted your ballot. It does not
        reveal your selection.
      </p>
      <div className="mt-7 rounded-2xl bg-brand-navy p-5 text-left text-white">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/60">
          Receipt code
        </p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <code className="break-all text-lg font-bold tracking-wide">
            {status.data.receiptCode}
          </code>
          <button
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-brand-sky"
            aria-label="Copy receipt code"
            onClick={async () => {
              setCopied(false);
              setCopyError(false);
              try {
                if (!navigator.clipboard?.writeText)
                  throw new Error("Clipboard unavailable");
                await navigator.clipboard.writeText(
                  status.data.receiptCode ?? "",
                );
                setCopied(true);
              } catch {
                setCopyError(true);
              }
            }}
          >
            <Copy className="size-5" />
          </button>
        </div>
        {status.data.votedAt ? (
          <p className="mt-4 text-xs text-white/65">
            Recorded {formatElectionDate(status.data.votedAt)}
          </p>
        ) : null}
      </div>
      {copyError && (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          We couldn't copy the receipt code. Please copy it manually.
        </p>
      )}
      <p
        aria-live="polite"
        className="mt-3 min-h-5 text-xs font-semibold text-emerald-700"
      >
        {copied ? "Receipt copied" : ""}
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild variant="outline">
          <Link to="/">Return home</Link>
        </Button>
        {election.data.status === "PUBLISHED" ? (
          <Button asChild>
            <Link to="/results">View results</Link>
          </Button>
        ) : null}
      </div>
    </section>
  );
}

export default function StatusPage() {
  return (
    <PageLayout>
      <VoterGate>
        <StatusContent />
      </VoterGate>
    </PageLayout>
  );
}
