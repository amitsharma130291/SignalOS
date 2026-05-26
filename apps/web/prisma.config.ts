import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // CLI (db push, migrate) needs a non-pooled connection; app runtime uses DATABASE_URL via adapter.
  datasource: {
    url: env("DIRECT_URL"),
  },
});
