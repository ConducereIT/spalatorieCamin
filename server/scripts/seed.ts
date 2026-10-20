// test data for the local db only
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const url = new URL(process.env.DATABASE_URL ?? "");
if (process.env.NODE_ENV === "production" || !["localhost", "127.0.0.1"].includes(url.hostname)) {
  console.error("Seed refused: DATABASE_URL is not a local database.");
  process.exit(1);
}

const prisma = new PrismaClient();
const PASSWORD = "parola-locala";
const SLOT = 30 * 60_000;

const residents = [
  { name: "Andrei Test", email: "andrei@test.local", phone: "0712345678", room: "C319" },
  { name: "Maria Ionescu", email: "maria@test.local", phone: "0723456789", room: "A104" },
  { name: "Radu Popa", email: "radu@test.local", phone: "0734567890", room: "B212" },
  { name: "Ioana Marin", email: "ioana@test.local", phone: "0745678901", room: "C007" },
];

const hash = await bcrypt.hash(PASSWORD, 12);
for (const r of residents) {
  const existing = await prisma.user.findUnique({ where: { email: r.email } });
  if (existing) continue;
  const id = randomUUID();
  await prisma.user.create({
    data: {
      id,
      name: r.name,
      email: r.email,
      emailVerified: true,
      accounts: { create: { id: randomUUID(), accountId: id, providerId: "credential", password: hash } },
      infoUser: { create: { phone: r.phone, camera: r.room } },
    },
  });
}

// some bookings around today
await prisma.events.deleteMany({ where: { email: { endsWith: "@test.local" } } });
const machines = ["first", "second", "third", "four"];
const today = new Date();
today.setHours(0, 0, 0, 0);
const plan: [day: number, machine: number, startSlot: number, slots: number, who: number][] = [
  [0, 0, 16, 3, 1], [0, 0, 20, 4, 2], [0, 1, 18, 2, 3], [0, 2, 26, 4, 0], [0, 3, 30, 3, 1],
  [0, 1, 36, 3, 2], [0, 0, 40, 2, 3], [1, 0, 18, 4, 0], [1, 2, 20, 3, 1], [1, 3, 34, 2, 2],
  [2, 1, 22, 4, 3], [2, 2, 38, 3, 0], [3, 0, 28, 2, 2], [4, 3, 24, 4, 1], [6, 2, 20, 3, 3],
  [-1, 0, 20, 3, 0], [-2, 1, 30, 2, 0],
];
for (const [day, machine, startSlot, slots, who] of plan) {
  const r = residents[who]!;
  const start = new Date(today.getTime() + day * 86_400_000 + startSlot * SLOT);
  await prisma.events.create({
    data: {
      email: r.email,
      title: r.name,
      start_event: start,
      end_event: new Date(start.getTime() + slots * SLOT),
      calendar_n: machines[machine]!,
      phone: r.phone,
      camera: r.room,
    },
  });
}

// 60 days of past bookings so the statistics page has data
// fixed random numbers, so every run gives the same data
let seed = 42;
const rand = () => ((seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648) / 2_147_483_648);

const first = ["Ana", "Mihai", "Elena", "Andrei", "Ioana", "Vlad", "Maria", "Stefan", "Daria", "Alex", "Bianca", "Tudor", "Irina", "Paul", "Sara"];
const last = ["Popescu", "Ionescu", "Dumitru", "Stan", "Matei", "Lazar", "Rusu", "Tanase", "Barbu", "Nistor"];
const extra = Array.from({ length: 26 }, (_, i) => ({
  name: `${first[i % first.length]} ${last[(i * 7) % last.length]}`,
  email: `rezident${i + 1}@test.local`,
  phone: `07${String(20_000_000 + i * 371_113).slice(0, 8)}`,
  room: `${"ABC"[i % 3]}${100 + ((i * 37) % 300)}`,
}));
for (const [i, r] of extra.entries()) {
  if (await prisma.user.findUnique({ where: { email: r.email } })) continue;
  const id = randomUUID();
  await prisma.user.create({
    data: {
      id,
      name: r.name,
      email: r.email,
      emailVerified: true,
      createdAt: new Date(today.getTime() - Math.floor(rand() * 90) * 86_400_000),
      accounts: { create: { id: randomUUID(), accountId: i % 4 ? `google-${i}` : id, providerId: i % 4 ? "google" : "credential" } },
      ...(i % 5 ? { infoUser: { create: { phone: r.phone, camera: r.room } } } : {}),
    },
  });
}
const people = [...residents, ...extra.filter((_, i) => i % 5)];

// chance that someone starts a booking at this hour (evenings and weekend mornings are busy)
const busy = (hour: number, weekend: boolean) =>
  hour < 7 ? 0.02 : hour < 12 ? (weekend ? 0.35 : 0.12) : hour < 17 ? 0.2 : hour < 23 ? 0.45 : 0.08;

let history = 0;
for (let day = -60; day <= -3; day++) {
  const date = new Date(today.getTime() + day * 86_400_000);
  const weekend = date.getDay() === 0 || date.getDay() === 6;
  for (const machine of machines) {
    let slot = 12; // from 06:00
    while (slot < 47) {
      if (rand() < busy(Math.floor(slot / 2), weekend) / 2) {
        const len = [2, 3, 3, 4, 4, 4, 5, 6, 8][Math.floor(rand() * 9)]!;
        const r = people[Math.floor(rand() * people.length)]!;
        const start = new Date(date.getTime() + slot * SLOT);
        await prisma.events.create({
          data: {
            email: r.email,
            title: r.name,
            start_event: start,
            end_event: new Date(start.getTime() + Math.min(len, 48 - slot) * SLOT),
            calendar_n: machine,
            phone: r.phone,
            camera: r.room,
          },
        });
        history++;
        slot += len;
      } else {
        slot++;
      }
    }
  }
}

console.log(`Seeded ${residents.length} residents and ${plan.length} bookings, plus ${history} past bookings.`);
console.log(`Sign in with any of: ${residents.map((r) => r.email).join(", ")}  password: ${PASSWORD}`);
await prisma.$disconnect();
