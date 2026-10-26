import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { CandidateImage } from "./candidate-image";

afterEach(cleanup);

test("uses the admin photo URL and recovers when that URL changes", () => {
  const { rerender } = render(
    <CandidateImage
      src="https://example.com/admin-photo.jpg"
      name="Candidate"
    />,
  );
  const image = screen.getByRole("img", { name: "Portrait of Candidate" });
  expect(image).toHaveAttribute("src", "https://example.com/admin-photo.jpg");
  fireEvent.error(image);
  expect(
    screen.getByRole("img", { name: "Portrait unavailable for Candidate" }),
  ).toBeInTheDocument();
  rerender(
    <CandidateImage src="https://example.com/new-photo.jpg" name="Candidate" />,
  );
  expect(screen.getByRole("img", { name: "Portrait of Candidate" }))
    .toHaveAttribute("src", "https://example.com/new-photo.jpg");
});

test.each([
  ["https://example.com/portrait.jpg", "Portrait of Candidate"],
  ["javascript:alert(1)", "Portrait unavailable for Candidate"],
  [null, "Portrait unavailable for Candidate"],
])("preserves safe photo handling", (src, label) => {
  render(<CandidateImage src={src} name="Candidate" />);
  expect(screen.getByRole("img", { name: label })).toBeInTheDocument();
});
