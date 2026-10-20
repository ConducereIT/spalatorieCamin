// small fetch helper for our api

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const NETWORK_MESSAGE = "Serverul nu răspunde. Verificați conexiunea la internet.";

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const method = init.method ?? "GET";
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: "same-origin",
      headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "NETWORK", NETWORK_MESSAGE);
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = data?.error;
    throw new ApiError(
      res.status,
      typeof err?.code === "string" ? err.code : "HTTP_" + res.status,
      typeof err?.message === "string" ? err.message : "Eroare neașteptată. Vă rugăm să încercați din nou.",
    );
  }
  return data as T;
}

// types

export type Booking = {
  id: number;
  machine: number;
  start: string;
  end: string;
  mine: boolean;
  name: string;
  room: string;
  phone?: string;
};

export type Status = {
  maintenance: { active: boolean; until: string | null };
  auth: { google: boolean };
  rules: {
    timezone: string;
    slotMinutes: number;
    maxBookingMinutes: number;
    maxBookingsPerWeek: number;
    maxParallelBookings: number;
    horizonDays: number;
    machines: number[];
  };
};

export type Me = {
  user: { name: string; email: string; isAdmin: boolean };
  profile: { phone: string; room: string } | null;
  week: { used: number; limit: number };
};

export type Stats = {
  range: string;
  from: string;
  to: string;
  bucket: "day" | "week";
  totals: {
    bookings: number;
    hours: number;
    avgMinutes: number;
    occupancy: number;
    residents: number;
    bookingsPerResident: number;
    repeatResidents: number;
    repeatShare: number;
  };
  now: { busyMachines: number; machines: number; today: number; nextWeek: number; activeSessions: number };
  series: { key: string; bookings: number; hours: number }[];
  machines: { id: number; bookings: number; hours: number; occupancy: number }[];
  heatmap: number[][];
  weekdays: number[];
  peak: { weekday: number; hour: number; occupancy: number } | null;
  busiestMachine: number | null;
  durations: { minutes: number; count: number }[];
  accounts: {
    total: number;
    new: number;
    withProfile: number;
    neverBooked: number;
    google: number;
    password: number;
    signups: { key: string; count: number }[];
  };
  topResidents: { name: string; room: string; bookings: number; hours: number }[];
  topRooms: { room: string; bookings: number; hours: number; people: number }[];
};
