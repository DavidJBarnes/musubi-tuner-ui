import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSSE } from "./useSSE";

class MockEventSource {
  url: string;
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  close = vi.fn();

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  static instances: MockEventSource[] = [];
  static reset() {
    MockEventSource.instances = [];
  }

  simulateMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent);
  }
}

beforeEach(() => {
  MockEventSource.reset();
  vi.stubGlobal("EventSource", MockEventSource);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useSSE", () => {
  it("returns empty lines and done=false initially", () => {
    const { result } = renderHook(() => useSSE("/api/jobs/1/logs"));
    expect(result.current.lines).toEqual([]);
    expect(result.current.done).toBe(false);
  });

  it("creates EventSource with the given URL", () => {
    renderHook(() => useSSE("/api/jobs/1/logs"));
    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0].url).toBe("/api/jobs/1/logs");
  });

  it("does not create EventSource when URL is null", () => {
    renderHook(() => useSSE(null));
    expect(MockEventSource.instances).toHaveLength(0);
  });

  it("accumulates lines from messages", () => {
    const { result } = renderHook(() => useSSE("/api/logs"));
    const es = MockEventSource.instances[0];

    act(() => es.simulateMessage({ line: "line 1" }));
    act(() => es.simulateMessage({ line: "line 2" }));

    expect(result.current.lines).toEqual(["line 1", "line 2"]);
  });

  it("sets done=true and closes on done message", () => {
    const { result } = renderHook(() => useSSE("/api/logs"));
    const es = MockEventSource.instances[0];

    act(() => es.simulateMessage({ done: true }));

    expect(result.current.done).toBe(true);
    expect(es.close).toHaveBeenCalled();
  });

  it("closes EventSource on error", () => {
    renderHook(() => useSSE("/api/logs"));
    const es = MockEventSource.instances[0];

    act(() => es.onerror?.());

    expect(es.close).toHaveBeenCalled();
  });

  it("closes old EventSource and resets state when URL changes", () => {
    const { rerender } = renderHook(({ url }) => useSSE(url), {
      initialProps: { url: "/api/logs/1" as string | null },
    });

    const es1 = MockEventSource.instances[0];
    rerender({ url: "/api/logs/2" });

    expect(es1.close).toHaveBeenCalled();
    expect(MockEventSource.instances).toHaveLength(2);
    expect(MockEventSource.instances[1].url).toBe("/api/logs/2");
  });

  it("closes EventSource on unmount", () => {
    const { unmount } = renderHook(() => useSSE("/api/logs"));
    const es = MockEventSource.instances[0];

    unmount();
    expect(es.close).toHaveBeenCalled();
  });

  it("ignores malformed JSON messages", () => {
    const { result } = renderHook(() => useSSE("/api/logs"));
    const es = MockEventSource.instances[0];

    act(() => {
      es.onmessage?.({ data: "not-json" } as MessageEvent);
    });

    expect(result.current.lines).toEqual([]);
  });

  it("clear() resets lines", () => {
    const { result } = renderHook(() => useSSE("/api/logs"));
    const es = MockEventSource.instances[0];

    act(() => es.simulateMessage({ line: "hello" }));
    expect(result.current.lines).toHaveLength(1);

    act(() => result.current.clear());
    expect(result.current.lines).toEqual([]);
  });
});
