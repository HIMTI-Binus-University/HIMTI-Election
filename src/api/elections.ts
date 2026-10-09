import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/config/api-client";
import { apiPaths } from "@/constants/api";
import { queryKeys } from "@/constants/query-keys";

export type ElectionStatus = "DRAFT" | "OPEN" | "CLOSED" | "PUBLISHED";

export interface Candidate {
  id: string;
  electionId: string;
  ballotNumber: number;
  name: string;
  photoUrl: string | null;
  biography: string | null;
  slogan: string | null;
  vision: string;
  mission: string;
  videoUrl: string | null;
  workPrograms: string[];
  experiences: string[];
  isActive: boolean;
}

export interface Election {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: ElectionStatus;
  startsAt: string;
  endsAt: string;
  debateAt: string | null;
  secondDebateAt: string | null;
  openedAt: string | null;
  closedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  candidates: Candidate[];
}

export type EligibilityReason =
  | "ACCOUNT_INACTIVE"
  | "PROFILE_INCOMPLETE"
  | "OUTLOOK_NOT_VERIFIED"
  | "OUTLOOK_DOMAIN_NOT_ALLOWED"
  | "NOT_SOCS"
  | "ELECTION_NOT_OPEN"
  | "ALREADY_VOTED";

export interface Eligibility {
  eligible: boolean;
  reason: EligibilityReason | null;
  hasVoted: boolean;
}

export interface VoteStatus {
  hasVoted: boolean;
  receiptCode: string | null;
  votedAt: string | null;
}

export interface Results {
  participationCount: number;
  ballotCount: number;
  valid: boolean;
  winnerCandidateId: string | null;
  isTie: boolean;
  results: Array<{ candidate: Candidate; votes: number }>;
}

interface Envelope<T> {
  msg: "success";
  data: T;
}

export const useCurrentElection = () =>
  useQuery({
    queryKey: queryKeys.currentElection,
    queryFn: () =>
      apiClient
        .get<Envelope<Election | null>>(apiPaths.currentElection)
        .then(({ data }) => data.data),
  });

export const useCandidates = (electionId?: string) =>
  useQuery({
    queryKey: queryKeys.candidates(electionId ?? "none"),
    queryFn: () =>
      apiClient
        .get<Envelope<Candidate[]>>(apiPaths.candidates(electionId!))
        .then(({ data }) => data.data),
    enabled: Boolean(electionId),
  });

export const useEligibility = (electionId?: string, enabled = true) =>
  useQuery({
    queryKey: queryKeys.eligibility(electionId ?? "none"),
    queryFn: () =>
      apiClient
        .get<Envelope<Eligibility>>(apiPaths.eligibility(electionId!))
        .then(({ data }) => data.data),
    enabled: Boolean(electionId) && enabled,
    retry: false,
  });

export const useVoteStatus = (electionId?: string, enabled = true) =>
  useQuery({
    queryKey: queryKeys.voteStatus(electionId ?? "none"),
    queryFn: () =>
      apiClient
        .get<Envelope<VoteStatus>>(apiPaths.voteStatus(electionId!))
        .then(({ data }) => data.data),
    enabled: Boolean(electionId) && enabled,
    retry: false,
  });

export const useCastVote = (electionId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (candidateId: string) =>
      apiClient
        .post<Envelope<{ receiptCode: string; votedAt: string }>>(
          apiPaths.vote(electionId),
          {
            candidateId,
          },
        )
        .then(({ data }) => data.data),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.eligibility(electionId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.voteStatus(electionId),
        }),
      ]);
    },
  });
};

export const useResults = (electionId?: string) =>
  useQuery({
    queryKey: queryKeys.results(electionId ?? "none"),
    queryFn: () =>
      apiClient
        .get<Envelope<Results>>(apiPaths.results(electionId!))
        .then(({ data }) => data.data),
    enabled: Boolean(electionId),
    retry: false,
  });

export const getApiError = (error: unknown) => {
  if (!axios.isAxiosError(error))
    return { code: null, message: "Something went wrong" };
  return {
    code:
      typeof error.response?.data?.code === "string"
        ? error.response.data.code
        : null,
    message:
      typeof error.response?.data?.msg === "string"
        ? error.response.data.msg
        : "The request could not be completed",
  };
};
