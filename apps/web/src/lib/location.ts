/**
 * User location service using ip-api.com.
 * Fetches geolocation, ISP, timezone, and network details based on the user's IP.
 */

export interface UserLocationDetails {
  status: "success" | "fail";
  message?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  regionName?: string;
  city?: string;
  zip?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  isp?: string;
  org?: string;
  as?: string;
  query?: string;
}

let cachedLocation: UserLocationDetails | null = null;

export async function fetchUserLocation(): Promise<UserLocationDetails | null> {
  if (cachedLocation) {
    return cachedLocation;
  }

  try {
    // ip-api.com free tier endpoint
    const response = await fetch("http://ip-api.com/json/", {
      method: "GET",
    });

    if (!response.ok) {
      console.warn(`[ip-api] Request failed with HTTP status: ${response.status}`);
      return null;
    }

    const data: UserLocationDetails = await response.json();
    console.log("📍 [ip-api] User Location Details:", data);

    if (typeof window !== "undefined") {
      (window as any).__USER_LOCATION__ = data;
    }

    cachedLocation = data;
    return data;
  } catch (error) {
    console.error("❌ [ip-api] Error fetching location details:", error);
    return null;
  }
}

export function getUserLocation(): UserLocationDetails | null {
  return cachedLocation || (typeof window !== "undefined" ? (window as any).__USER_LOCATION__ || null : null);
}

