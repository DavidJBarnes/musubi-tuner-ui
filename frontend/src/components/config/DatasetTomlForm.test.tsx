import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { makeDatasetConfig } from "../../test/factories";
import { DatasetTomlForm } from "./DatasetTomlForm";

describe("DatasetTomlForm", () => {
  it("renders collapsed summary by default", () => {
    render(<DatasetTomlForm config={makeDatasetConfig()} onChange={vi.fn()} datasetSelected />);
    expect(screen.getByText("Dataset Config")).toBeInTheDocument();
    expect(screen.getByText(/480x832, 61 frames/)).toBeInTheDocument();
    expect(screen.getByText("Advanced")).toBeInTheDocument();
  });

  it("expands when Advanced is clicked", async () => {
    render(<DatasetTomlForm config={makeDatasetConfig()} onChange={vi.fn()} datasetSelected />);
    await userEvent.click(screen.getByText("Advanced"));
    expect(screen.getByText("Collapse")).toBeInTheDocument();
    expect(screen.getByText("Width")).toBeInTheDocument();
    expect(screen.getByText("Height")).toBeInTheDocument();
  });

  it("shows warning when no dataset selected", () => {
    render(<DatasetTomlForm config={makeDatasetConfig()} onChange={vi.fn()} datasetSelected={false} />);
    expect(screen.getByText(/No dataset selected/)).toBeInTheDocument();
  });

  it("shows video/cache directory fields when expanded without dataset", async () => {
    render(<DatasetTomlForm config={makeDatasetConfig()} onChange={vi.fn()} datasetSelected={false} />);
    await userEvent.click(screen.getByText("Advanced"));
    expect(screen.getByText("Video Directory")).toBeInTheDocument();
    expect(screen.getByText("Cache Directory")).toBeInTheDocument();
  });

  it("hides video/cache directory fields when dataset is selected", async () => {
    render(<DatasetTomlForm config={makeDatasetConfig()} onChange={vi.fn()} datasetSelected />);
    await userEvent.click(screen.getByText("Advanced"));
    expect(screen.queryByText("Video Directory")).not.toBeInTheDocument();
    expect(screen.queryByText("Cache Directory")).not.toBeInTheDocument();
  });

  it("calls onChange when batch size changes", async () => {
    const onChange = vi.fn();
    render(<DatasetTomlForm config={makeDatasetConfig()} onChange={onChange} datasetSelected />);
    await userEvent.click(screen.getByText("Advanced"));

    // "1" matches both batch_size and num_repeats, so find by label
    const batchLabel = screen.getByText("Batch Size");
    const batchInput = batchLabel.parentElement!.querySelector("input")!;
    await userEvent.clear(batchInput);
    await userEvent.type(batchInput, "4");

    expect(onChange).toHaveBeenCalled();
  });

  it("calls onChange when enable_bucket checkbox is toggled", async () => {
    const onChange = vi.fn();
    render(<DatasetTomlForm config={makeDatasetConfig()} onChange={onChange} datasetSelected />);
    await userEvent.click(screen.getByText("Advanced"));
    await userEvent.click(screen.getByLabelText("Enable Bucket"));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ enable_bucket: true }));
  });
});
