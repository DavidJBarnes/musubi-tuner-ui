import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeLossPoints } from "../../test/factories";
import { computeTrendLine, LossChart } from "./LossChart";

const mockUseSWR = vi.fn();

vi.mock("swr", () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
}));

// Mock recharts to avoid SVG rendering issues in jsdom
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div />,
  CartesianGrid: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("LossChart", () => {
  it("shows empty state when no data", () => {
    mockUseSWR.mockReturnValue({ data: undefined });
    render(<LossChart jobId="abc" />);
    expect(screen.getByText("No loss data available yet")).toBeInTheDocument();
  });

  it("shows empty state for empty array", () => {
    mockUseSWR.mockReturnValue({ data: [] });
    render(<LossChart jobId="abc" />);
    expect(screen.getByText("No loss data available yet")).toBeInTheDocument();
  });

  it("renders chart heading", () => {
    mockUseSWR.mockReturnValue({ data: makeLossPoints(5) });
    render(<LossChart jobId="abc" />);
    expect(screen.getByText("Loss Curve")).toBeInTheDocument();
  });

  it("shows average loss of recent points", () => {
    const points = makeLossPoints(5);
    mockUseSWR.mockReturnValue({ data: points });
    render(<LossChart jobId="abc" />);
    const avg = points.reduce((s, p) => s + p.value, 0) / points.length;
    expect(screen.getByText(new RegExp(avg.toFixed(4)))).toBeInTheDocument();
  });
});

describe("computeTrendLine", () => {
  it("returns empty array for < 2 points", () => {
    expect(computeTrendLine([])).toEqual([]);
    expect(computeTrendLine([{ step: 1, value: 0.5 }])).toEqual([]);
  });

  it("returns two points for linear data", () => {
    const points = [
      { step: 0, value: 1.0 },
      { step: 10, value: 0.5 },
    ];
    const trend = computeTrendLine(points);
    expect(trend).toHaveLength(2);
    expect(trend[0].step).toBe(0);
    expect(trend[1].step).toBe(10);
  });

  it("computes correct slope for simple linear data", () => {
    const points = [
      { step: 0, value: 1.0 },
      { step: 10, value: 0.0 },
    ];
    const trend = computeTrendLine(points);
    expect(trend[0].value).toBeCloseTo(1.0);
    expect(trend[1].value).toBeCloseTo(0.0);
  });

  it("computes trend for multiple points", () => {
    const points = [
      { step: 0, value: 1.0 },
      { step: 5, value: 0.6 },
      { step: 10, value: 0.2 },
    ];
    const trend = computeTrendLine(points);
    expect(trend).toHaveLength(2);
    // Should be roughly linear: 1.0 → 0.2
    expect(trend[0].value).toBeCloseTo(1.0, 1);
    expect(trend[1].value).toBeCloseTo(0.2, 1);
  });
});
