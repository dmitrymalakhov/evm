import { defineConfig } from "drizzle-kit";
import path from "node:path";

const sqlitePath =
  process.env.SQLITE_PATH ??
  path.join(
    process.cwd(),
    "sqlite",
    process.env.NODE_ENV === "test" ? "evm-test.sqlite" : "evm.sqlite",
  );

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "sqlite",
  casing: "snake_case",
  dbCredentials: {
    url: sqlitePath,
  },
});

