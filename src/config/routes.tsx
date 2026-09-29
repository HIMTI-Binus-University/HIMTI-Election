import HomePage from "@/pages/home";
import { Navigate } from "react-router-dom";
import AuthCallbackPage from "@/pages/auth-callback";
import AuthErrorPage from "@/pages/auth-error";
import CandidatePage from "@/pages/candidate";
import CandidatesPage from "@/pages/candidates";
import ResultsPage from "@/pages/results";
import StatusPage from "@/pages/status";
import VotePage from "@/pages/vote";
import type { AppRoute } from "@/types/common";

export const routes: AppRoute[] = [
  { path: "/", element: <HomePage /> },
  { path: "/auth/callback", element: <AuthCallbackPage /> },
  { path: "/auth/error", element: <AuthErrorPage /> },
  { path: "/candidates/:candidateId", element: <CandidatePage /> },
  { path: "/candidates", element: <CandidatesPage /> },
  { path: "/vote", element: <VotePage /> },
  { path: "/status", element: <StatusPage /> },
  { path: "/results", element: <ResultsPage /> },
  { path: "*", element: <Navigate to="/" replace /> },
];
