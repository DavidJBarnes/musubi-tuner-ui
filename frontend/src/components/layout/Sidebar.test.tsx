import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithRouter } from "../../test/render";
import { Sidebar } from "./Sidebar";

describe("Sidebar", () => {
  it("renders app title", () => {
    renderWithRouter(<Sidebar />);
    expect(screen.getByText("Musubi Tuner UI")).toBeInTheDocument();
  });

  it("renders all nav links", () => {
    renderWithRouter(<Sidebar />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Jobs")).toBeInTheDocument();
    expect(screen.getByText("Datasets")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("Dashboard link points to /", () => {
    renderWithRouter(<Sidebar />);
    expect(screen.getByText("Dashboard").closest("a")).toHaveAttribute("href", "/");
  });

  it("Jobs link points to /jobs", () => {
    renderWithRouter(<Sidebar />);
    expect(screen.getByText("Jobs").closest("a")).toHaveAttribute("href", "/jobs");
  });

  it("highlights active link", () => {
    renderWithRouter(<Sidebar />, { routerProps: { initialEntries: ["/jobs"] } });
    const jobsLink = screen.getByText("Jobs").closest("a");
    expect(jobsLink?.className).toContain("text-accent");
  });
});
