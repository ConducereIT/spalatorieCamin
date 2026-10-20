import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Booking, type Me, type Status } from "./api";
import { dayStart, plusDays } from "./time";

export const keys = {
  status: ["status"] as const,
  me: ["me"] as const,
  bookings: (from: string) => ["bookings", from] as const,
  myBookings: ["my-bookings"] as const,
};

export function useStatus() {
  return useQuery({
    queryKey: keys.status,
    queryFn: () => api<Status>("/status"),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
}

export function useMe(enabled = true) {
  return useQuery({ queryKey: keys.me, queryFn: () => api<Me>("/me"), enabled });
}

// bookings from today until the last bookable day
export function useBookingWindow(horizonDays: number) {
  const from = dayStart(Date.now());
  const to = plusDays(from, horizonDays + 1);
  const fromIso = from.toISOString();
  return useQuery({
    queryKey: keys.bookings(fromIso),
    queryFn: () =>
      api<{ bookings: Booking[] }>(
        `/bookings?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(to.toISOString())}`,
      ).then((r) => r.bookings),
    // refresh every 30s, keep showing the old data meanwhile
    refetchInterval: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useMyBookings() {
  return useQuery({
    queryKey: keys.myBookings,
    queryFn: () => api<{ upcoming: Booking[]; past: Booking[] }>("/me/bookings"),
  });
}

function useInvalidateBookings() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["bookings"] }),
      qc.invalidateQueries({ queryKey: keys.myBookings }),
      qc.invalidateQueries({ queryKey: keys.me }),
    ]);
}

export function useCreateBooking() {
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: (b: { machine: number; start: string; end: string }) =>
      api<{ booking: Booking }>("/bookings", { method: "POST", body: b }),
    // refresh even if it failed
    onSettled: invalidate,
  });
}

export function useCancelBooking() {
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/bookings/${id}`, { method: "DELETE" }),
    onSettled: invalidate,
  });
}

export function useSaveProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { phone: string; room: string }) =>
      api<{ profile: { phone: string; room: string } }>("/me/profile", { method: "PUT", body: p }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.me });
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}
