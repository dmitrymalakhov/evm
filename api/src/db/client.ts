import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import * as schema from "./schema.js";

const databaseFile =
    process.env.SQLITE_PATH ??
    path.join(
        process.cwd(),
        "sqlite",
        process.env.NODE_ENV === "test" ? "evm-test.sqlite" : "evm.sqlite",
    );

const sqliteDirectory = path.dirname(databaseFile);
if (!fs.existsSync(sqliteDirectory)) {
    fs.mkdirSync(sqliteDirectory, { recursive: true });
}

const sqlite = new Database(databaseFile);
export const db = drizzle(sqlite, { schema });

const drizzleRoot = path.join(process.cwd(), "drizzle");
const migrationsFolder = path.join(drizzleRoot, "migrations");
const shouldMigrate = process.env.DRIZZLE_MIGRATE !== "false";

if (shouldMigrate && fs.existsSync(migrationsFolder)) {
    const metaSource = path.join(drizzleRoot, "meta", "_journal.json");
    const metaTarget = path.join(migrationsFolder, "meta", "_journal.json");
    if (fs.existsSync(metaSource)) {
        const metaDir = path.dirname(metaTarget);
        if (!fs.existsSync(metaDir)) {
            fs.mkdirSync(metaDir, { recursive: true });
        }
        if (!fs.existsSync(metaTarget)) {
            fs.copyFileSync(metaSource, metaTarget);
        }
    }
    try {
        console.log("Applying database migrations...");
        migrate(db, { migrationsFolder });
        console.log("Database migrations applied successfully");
    } catch (error) {
        // If migration fails, log the error but don't crash the app
        // This can happen if migrations are already applied or if there's a schema mismatch
        console.error("Migration error (may be safe to ignore if migrations are already applied):", error);
    }
}

export type DatabaseClient = typeof db;

