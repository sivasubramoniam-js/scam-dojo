import { create } from "zustand";
import { fetchUserLocation, UserLocationDetails } from "@/lib/location";

interface LocationState {
  location: UserLocationDetails | null;
  isLoading: boolean;
  error: string | null;
  loadLocation: () => Promise<UserLocationDetails | null>;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  location: null,
  isLoading: false,
  error: null,
  loadLocation: async () => {
    if (get().location) return get().location;
    set({ isLoading: true, error: null });
    try {
      const data = await fetchUserLocation();
      set({ location: data, isLoading: false });
      return data;
    } catch (err: any) {
      set({ error: err?.message || "Failed to fetch location", isLoading: false });
      return null;
    }
  },
}));
