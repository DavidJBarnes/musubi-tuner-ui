import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { makeJob } from "../../test/factories";
import { renderWithRouter } from "../../test/render";
import { ActiveJobCard } from "./ActiveJobCard";

describe("ActiveJobCard", () => {
  it("renders job name", () => {
    renderWithRouter(<ActiveJobCard job={makeJob({ name: "My Training" })} />);
    expect(screen.getByText("My Training")).toBeInTheDocument();
  });

  it("renders status with underscores replaced by spaces", () => {
    renderWithRouter(<ActiveJobCard job={makeJob({ status: "caching_latents" })} />);
    expect(screen.getByText("caching latents")).toBeInTheDocument();
  });

  it("shows progress bar when total > 0", () => {
    renderWithRouter(<ActiveJobCard job={makeJob({ progress_current: 30, progress_total: 100 })} />);
    expect(screen.getByText("30 / 100")).toBeInTheDocument();
    expect(screen.getByText("30%")).toBeInTheDocument();
  });

  it("hides progress when total is 0", () => {
    renderWithRouter(<ActiveJobCard job={makeJob({ progress_total: 0 })} />);
    expect(screen.queryByText("%")).not.toBeInTheDocument();
  });

  it("links to job detail page", () => {
    renderWithRouter(<ActiveJobCard job={makeJob({ id: "abc-123" })} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/jobs/abc-123");
  });

  it("shows current phase when present", () => {
    renderWithRouter(<ActiveJobCard job={makeJob({ current_phase: "caching_text" })} />);
    expect(screen.getByText("Phase: caching text")).toBeInTheDocument();
  });
});
