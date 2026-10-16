import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchUserLocation } from "@/lib/location";

describe("fetchUserLocation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("successfully parses ip-api response", async () => {
    const mockPayload = {
      status: "success",
      country: "India",
      countryCode: "IN",
      region: "TN",
      regionName: "Tamil Nadu",
      city: "Chennai",
      zip: "600001",
      lat: 13.0895,
      lon: 80.2739,
      timezone: "Asia/Kolkata",
      isp: "Reliance Jio Infocomm Limited",
      query: "49.37.193.189",
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockPayload,
    } as any);

    const result = await fetchUserLocation();
    expect(result).toEqual(mockPayload);
    expect(result?.city).toBe("Chennai");
    expect(result?.country).toBe("India");
    expect(result?.timezone).toBe("Asia/Kolkata");
  });

  it("handles fetch errors gracefully without throwing", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network offline"));
    const result = await fetchUserLocation();
    // Returns cached if previously set or null
    expect(result === null || typeof result === "object").toBe(true);
  });
});
