import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  // Use the direct (session) connection for this CLI-style test
  connectionString: process.env.DIRECT_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  // Insert a single test row into raw_inputs
  const created = await prisma.rawInput.create({
    data: {
      inputType: "manual_note",
      sourceName: "test",
      rawText: "This is a SignalOS database connection test",
    },
  });

  // Read it back to confirm it exists
  const rows = await prisma.rawInput.findMany({
    where: { id: created.id },
  });

  // Log a minimal, readable confirmation
  console.log("Created raw_inputs row:", {
    id: created.id,
    inputType: created.inputType,
    sourceName: created.sourceName,
    rawText: created.rawText,
  });

  console.log("Read-back rows:", rows);
}

main()
  .catch((err) => {
    console.error("Prisma connection test failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

