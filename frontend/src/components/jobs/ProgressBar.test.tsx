import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressBar } from "./ProgressBar";

const defaultProps = {
  current: 50,
  total: 100,
  phase: "training" as string | null,
  status: "training",
  speed: 70.0,
  epoch: 3,
  totalEpochs: 10,
  saveEveryNEpochs: 2,
  avrLoss: 0.0345,
};

describe("ProgressBar", () => {
  it("renders known phase label", () => {
    render(<ProgressBar {...defaultProps} phase="caching_latents" />);
    expect(screen.getByText("Caching Latents")).toBeInTheDocument();
  });

  it("renders unknown phase as-is", () => {
    render(<ProgressBar {...defaultProps} phase="custom_phase" />);
    expect(screen.getByText("custom_phase")).toBeInTheDocument();
  });

  it("falls back to status when phase is null", () => {
    render(<ProgressBar {...defaultProps} phase={null} status="in_progress" />);
    expect(screen.getByText("in progress")).toBeInTheDocument();
  });

  it("shows current/total and percentage", () => {
    render(<ProgressBar {...defaultProps} />);
    expect(screen.getByText("50 / 100 (50%)")).toBeInTheDocument();
  });

  it("shows 'processed' when total is 0 but current > 0", () => {
    render(<ProgressBar {...defaultProps} total={0} current={25} />);
    expect(screen.getByText("25 processed")).toBeInTheDocument();
  });

  it("shows speed when available", () => {
    render(<ProgressBar {...defaultProps} />);
    expect(screen.getByText("70.0s/step")).toBeInTheDocument();
  });

  it("shows ETA when speed and remaining steps exist", () => {
    render(<ProgressBar {...defaultProps} current={50} total={100} speed={72} />);
    expect(screen.getByText(/remaining/)).toBeInTheDocument();
  });

  it("shows epoch counter", () => {
    render(<ProgressBar {...defaultProps} />);
    expect(screen.getByText("Epoch 3/10")).toBeInTheDocument();
  });

  it("hides epoch when epoch is 0", () => {
    render(<ProgressBar {...defaultProps} epoch={0} />);
    expect(screen.queryByText(/Epoch/)).not.toBeInTheDocument();
  });

  it("shows average loss", () => {
    render(<ProgressBar {...defaultProps} />);
    expect(screen.getByText("avr_loss: 0.0345")).toBeInTheDocument();
  });

  it("renders epoch tick marks", () => {
    const { container } = render(<ProgressBar {...defaultProps} />);
    // 10 epochs = 9 tick marks
    const ticks = container.querySelectorAll("[title^='Epoch']");
    expect(ticks.length).toBe(9);
  });

  it("marks save epochs with correct title", () => {
    const { container } = render(<ProgressBar {...defaultProps} />);
    const saveTick = container.querySelector("[title='Epoch 2 (save)']");
    expect(saveTick).toBeInTheDocument();
  });
});
