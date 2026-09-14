import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AppLoading, AppOpening } from "@/components/app-motion";

describe("app motion", () => {
  it("renders an accessible branded loader", () => {
    render(<AppLoading label="Loading election" />);

    const loader = screen.getByRole("status");
    expect(loader).toHaveAttribute("aria-live", "polite");
    expect(loader).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading election")).toBeVisible();
    expect(loader.querySelector("img")).toHaveAttribute("alt", "");
  });

  it("renders a decorative opening overlay", () => {
    const { container } = render(
      <MemoryRouter>
        <AppOpening />
      </MemoryRouter>,
    );

    expect(container.querySelector(".brand-intro")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(container.querySelector(".brand-intro img")).toHaveAttribute(
      "src",
      "/logo-himti.png",
    );
  });
});
