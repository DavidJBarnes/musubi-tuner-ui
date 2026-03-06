import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, fetcher } from "./client";

const mockFetch = vi.fn();

beforeEach(() => {
  globalThis.fetch = mockFetch;
});

afterEach(() => {
  vi.restoreAllMocks();
});

function jsonResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  });
}

describe("api.get", () => {
  it("makes a GET request with JSON headers", async () => {
    mockFetch.mockReturnValue(jsonResponse({ id: 1 }));
    const result = await api.get("/jobs");
    expect(mockFetch).toHaveBeenCalledWith("/api/jobs", {
      headers: { "Content-Type": "application/json" },
    });
    expect(result).toEqual({ id: 1 });
  });

  it("throws on non-OK response with detail", async () => {
    mockFetch.mockReturnValue(jsonResponse({ detail: "Not found" }, 404));
    await expect(api.get("/jobs/999")).rejects.toThrow("Not found");
  });

  it("throws HTTP status when no detail in response", async () => {
    mockFetch.mockReturnValue(jsonResponse({}, 500));
    await expect(api.get("/fail")).rejects.toThrow("HTTP 500");
  });

  it("throws HTTP status when response body is not JSON", async () => {
    mockFetch.mockReturnValue(
      Promise.resolve({
        ok: false,
        status: 502,
        json: () => Promise.reject(new Error("not json")),
      }),
    );
    await expect(api.get("/fail")).rejects.toThrow("HTTP 502");
  });
});

describe("api.post", () => {
  it("sends JSON body with POST method", async () => {
    mockFetch.mockReturnValue(jsonResponse({ id: 2 }));
    const result = await api.post("/jobs", { name: "test" });
    expect(mockFetch).toHaveBeenCalledWith("/api/jobs", {
      headers: { "Content-Type": "application/json" },
      method: "POST",
      body: JSON.stringify({ name: "test" }),
    });
    expect(result).toEqual({ id: 2 });
  });
});

describe("api.put", () => {
  it("sends JSON body with PUT method", async () => {
    mockFetch.mockReturnValue(jsonResponse({ ok: true }));
    await api.put("/settings", { key: "val" });
    expect(mockFetch).toHaveBeenCalledWith("/api/settings", {
      headers: { "Content-Type": "application/json" },
      method: "PUT",
      body: JSON.stringify({ key: "val" }),
    });
  });
});

describe("api.del", () => {
  it("sends DELETE request", async () => {
    mockFetch.mockReturnValue(jsonResponse({ ok: true }));
    await api.del("/jobs/123");
    expect(mockFetch).toHaveBeenCalledWith("/api/jobs/123", {
      headers: { "Content-Type": "application/json" },
      method: "DELETE",
    });
  });
});

describe("fetcher", () => {
  it("delegates to api.get", async () => {
    mockFetch.mockReturnValue(jsonResponse([1, 2, 3]));
    const result = await fetcher("/items");
    expect(result).toEqual([1, 2, 3]);
  });
});
