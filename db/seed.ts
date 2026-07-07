import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { holiday } from "./schema";

config({ path: ".env.local" });

// Dummy annual-leave data for the next month (relative to mid-2026).
const HOLIDAYS = [
  { name: "Leo Messen", startDate: "2026-07-03", endDate: "2026-07-10" },
  { name: "Ben White", startDate: "2026-07-06", endDate: "2026-07-08" },
  { name: "Jibran Raja", startDate: "2026-07-14", endDate: "2026-07-21" },
  { name: "Charlotte Wilkinson", startDate: "2026-07-20", endDate: "2026-07-24" },
  { name: "Rob Ellison", startDate: "2026-07-27", endDate: "2026-07-31" },
];

const runSeed = async () => {
  if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL is not defined");
  }

  const connection = postgres(process.env.POSTGRES_URL, { max: 1 });
  const db = drizzle(connection);

  console.log("⏳ Seeding holidays...");

  await db.delete(holiday); // idempotent re-seed
  await db.insert(holiday).values(
    HOLIDAYS.map((h) => ({
      name: h.name,
      startDate: new Date(h.startDate),
      endDate: new Date(h.endDate),
    }))
  );

  console.log(`✅ Seeded ${HOLIDAYS.length} holidays`);
  process.exit(0);
};

runSeed().catch((err) => {
  console.error("❌ Seed failed");
  console.error(err);
  process.exit(1);
});
