// sends 40 bookings for the same slot at once, only 1 must pass
// run with the api started: npm run test:race
const origin = new URL(process.env.BETTER_AUTH_URL ?? "http://localhost:5173").origin;
const base = process.env.API_URL ?? origin;

async function signIn(email: string) {
  const res = await fetch(`${base}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ email, password: "parola-locala" }),
  });
  if (!res.ok) throw new Error(`sign-in ${email}: ${res.status} ${await res.text()}`);
  return res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
}

const cookies = [await signIn("andrei@test.local"), await signIn("maria@test.local")];

// a free slot in 3 days
const start = new Date();
start.setUTCHours(3, 0, 0, 0);
start.setUTCDate(start.getUTCDate() + 3);
const end = new Date(start.getTime() + 60 * 60_000);

const results = await Promise.all(
  Array.from({ length: 40 }, (_, i) =>
    fetch(`${base}/api/bookings`, {
      method: "POST",
      headers: { "content-type": "application/json", origin, cookie: cookies[i % 2]! },
      body: JSON.stringify({ machine: 4, start: start.toISOString(), end: end.toISOString() }),
    }).then(async (r) => ({ status: r.status, body: (await r.json()) as any })),
  ),
);

const created = results.filter((r) => r.status === 201);
const byStatus = Object.groupBy(results, (r) => `${r.status} ${r.body?.error?.code ?? "CREATED"}`);
console.log(Object.fromEntries(Object.entries(byStatus).map(([k, v]) => [k, v!.length])));

// delete it so the test can run again
const winner = created[0];
if (winner) {
  const who = cookies.find((_, i) => results.indexOf(winner) % 2 === i)!;
  await fetch(`${base}/api/bookings/${winner.body.booking.id}`, {
    method: "DELETE",
    headers: { origin, cookie: who },
  });
}

if (created.length !== 1) {
  console.error(`FAIL: ${created.length} bookings created for one slot`);
  process.exit(1);
}
console.log("PASS: exactly one booking created");
