import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { makeTrainingArgs } from "../../test/factories";
import { TrainingArgsForm } from "./TrainingArgsForm";

describe("TrainingArgsForm", () => {
  it("renders section headings", () => {
    render(<TrainingArgsForm args={makeTrainingArgs()} onChange={vi.fn()} />);
    expect(screen.getByText("Training Args")).toBeInTheDocument();
    expect(screen.getByText("Model")).toBeInTheDocument();
    expect(screen.getByText("LoRA")).toBeInTheDocument();
    expect(screen.getByText("Timesteps")).toBeInTheDocument();
    // "Optimizer" appears both as section heading and field label
    expect(screen.getAllByText("Optimizer")).toHaveLength(2);
    expect(screen.getByText("Memory")).toBeInTheDocument();
    expect(screen.getByText("Output")).toBeInTheDocument();
  });

  it("shows model paths", () => {
    render(<TrainingArgsForm args={makeTrainingArgs()} onChange={vi.fn()} />);
    expect(screen.getByDisplayValue("/models/dit.safetensors")).toBeInTheDocument();
    expect(screen.getByDisplayValue("/models/vae.pth")).toBeInTheDocument();
    expect(screen.getByDisplayValue("/models/t5.pth")).toBeInTheDocument();
  });

  it("calls onChange when text input changes", async () => {
    const onChange = vi.fn();
    render(<TrainingArgsForm args={makeTrainingArgs()} onChange={onChange} />);
    const ditInput = screen.getByDisplayValue("/models/dit.safetensors");
    await userEvent.clear(ditInput);
    await userEvent.type(ditInput, "/new/path");
    expect(onChange).toHaveBeenCalled();
  });

  it("calls onChange when checkbox is toggled", async () => {
    const onChange = vi.fn();
    render(<TrainingArgsForm args={makeTrainingArgs({ fp8_base: false })} onChange={onChange} />);
    await userEvent.click(screen.getByLabelText("FP8 Base"));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ fp8_base: true }));
  });

  it("calls onChange when select changes", async () => {
    const onChange = vi.fn();
    render(<TrainingArgsForm args={makeTrainingArgs()} onChange={onChange} />);
    const optimizerSelect = screen.getByDisplayValue("AdamW 8-bit");
    await userEvent.selectOptions(optimizerSelect, "prodigy");
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ optimizer_type: "prodigy" }));
  });

  it("renders number inputs with correct values", () => {
    render(<TrainingArgsForm args={makeTrainingArgs({ network_dim: 32 })} onChange={vi.fn()} />);
    expect(screen.getByDisplayValue("32")).toBeInTheDocument();
  });
});
