#!/usr/bin/env node
/**
 * Скрипт для применения миграций базы данных
 * Использование: tsx src/scripts/apply-migrations.ts
 */

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

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

const drizzleRoot = path.join(process.cwd(), "drizzle");
const migrationsFolder = path.join(drizzleRoot, "migrations");

if (!fs.existsSync(migrationsFolder)) {
    console.error(`❌ Migrations folder not found at ${migrationsFolder}`);
    process.exit(1);
}

// Копируем _journal.json из meta в migrations/meta если нужно
const metaSource = path.join(drizzleRoot, "meta", "_journal.json");
const metaTarget = path.join(migrationsFolder, "meta", "_journal.json");
if (fs.existsSync(metaSource)) {
    const metaDir = path.dirname(metaTarget);
    if (!fs.existsSync(metaDir)) {
        fs.mkdirSync(metaDir, { recursive: true });
    }
    if (!fs.existsSync(metaTarget)) {
        console.log(`Copying _journal.json from meta to migrations/meta...`);
        fs.copyFileSync(metaSource, metaTarget);
    } else {
        // Обновляем, если исходный файл новее
        const sourceStats = fs.statSync(metaSource);
        const targetStats = fs.statSync(metaTarget);
        if (sourceStats.mtime > targetStats.mtime) {
            console.log(`Updating _journal.json in migrations/meta...`);
            fs.copyFileSync(metaSource, metaTarget);
        }
    }
}

const dbExists = fs.existsSync(databaseFile);
if (dbExists) {
    console.log(`✓ Database file exists at ${databaseFile}`);
} else {
    console.log(`⚠️  Database file does not exist at ${databaseFile}, will be created`);
}

console.log(`📦 Applying migrations from ${migrationsFolder}...`);

const sqlite = new Database(databaseFile);
const db = drizzle(sqlite);

try {
    migrate(db, { migrationsFolder });
    console.log("✅ Database migrations applied successfully");
    process.exit(0);
} catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCause = error instanceof Error && (error as any).cause instanceof Error 
        ? (error as any).cause.message 
        : String(error);
    const fullErrorString = `${errorMessage} ${errorCause}`.toLowerCase();
    
    // Проверяем на безопасные ошибки
    const isSafeError = 
        fullErrorString.includes("already exists") || 
        fullErrorString.includes("duplicate") ||
        fullErrorString.includes("more than one statement") ||
        (fullErrorString.includes("no such table") && fullErrorString.includes("__drizzle_migrations"));
    
    if (isSafeError) {
        console.log("⚠️  Migration warning (likely already applied or safe to ignore):", errorCause || errorMessage);
        process.exit(0);
    } else {
        console.error("❌ Migration error:", error);
        process.exit(1);
    }
} finally {
    sqlite.close();
}


