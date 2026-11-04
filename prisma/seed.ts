import { PrismaClient } from "@prisma/client";
import { seedDemo } from "../src/modules/demo/seed";

const db = new PrismaClient();

seedDemo(db, { log: (m) => console.log(`  · ${m}`) })
  .then(() => console.log("✓ Borrowly demo data seeded"))
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
