// booking rules, change them here

export const TIMEZONE = "Europe/Bucharest";

export const SLOT_MINUTES = 30;
export const MAX_BOOKING_MINUTES = 4 * 60;
export const MAX_BOOKINGS_PER_WEEK = 10;
// days ahead you can book
export const BOOKING_HORIZON_DAYS = 14;
// machines one person can use at the same time
export const MAX_PARALLEL_BOOKINGS = 2;

export const SLOT_MS = SLOT_MINUTES * 60_000;

// machine names saved in the db ("four" comes from the old app)
export const MACHINES = [
  { id: 1, key: "first" },
  { id: 2, key: "second" },
  { id: 3, key: "third" },
  { id: 4, key: "four" },
] as const;

export type MachineId = (typeof MACHINES)[number]["id"];
export const MACHINE_KEYS: string[] = MACHINES.map((m) => m.key);

export function machineKey(id: number): string | undefined {
  return MACHINES.find((m) => m.id === id)?.key;
}

export function machineId(key: string): MachineId | undefined {
  return MACHINES.find((m) => m.key === key)?.id;
}
