import { beforeEach, expect, test, vi } from "vitest";
import apiClient from "@/config/api-client";
import { getReturnPath, signInWithGoogle } from "./auth";
import { runtime } from "@/config/runtime";

vi.mock("@/config/api-client", () => ({ default: { post: vi.fn() } }));
beforeEach(() => {
  vi.mocked(apiClient.post).mockReset();
  sessionStorage.clear();
});

test("keeps failures in election, prevents overlapping starts, and allows retries", async () => {
  vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
  const first = signInWithGoogle("/candidates?candidate=one");
  await signInWithGoogle("/vote");
  await expect(first).rejects.toThrow();
  expect(apiClient.post).toHaveBeenCalledTimes(1);
  expect(apiClient.post).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({
      errorCallbackURL: `${runtime.appUrl}/auth/error`,
    }),
  );
  expect(getReturnPath()).toBe("/candidates?candidate=one");
  await expect(signInWithGoogle(getReturnPath())).rejects.toThrow();
  expect(apiClient.post).toHaveBeenCalledTimes(2);
});

test("rejects external and auth-loop return destinations", () => {
  for (const path of ["//example.org", "/\\example.org", "/auth/error"]) {
    sessionStorage.setItem("himti-election:return-path", path);
    expect(getReturnPath()).toBe("/");
  }
});
