import { create } from "zustand";

export const useClinicStore = create((set) => ({
  appointments: [],
  loading: true,
  realtimeStatus: "disconnected",
  selectedDate: new Date().toISOString().split("T")[0],
  filters: { search: "", doctor_id: "", status: "" },

  setAppointments: (appointments) => set({ appointments }),
  setLoading: (loading) => set({ loading }),
  setRealtimeStatus: (realtimeStatus) => set({ realtimeStatus }),
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  setFilters: (filters) => set({ filters }),
}));
