import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	throw new Error("DATABASE_URL is not set");
}

const isRemote =
	DATABASE_URL.includes("render.com") ||
	DATABASE_URL.includes("sslmode=require") ||
	DATABASE_URL.includes("supabase.co") ||
	DATABASE_URL.includes("neon.tech")

const postgresPool = new Pool({
	connectionString: DATABASE_URL,
	ssl: isRemote ? { rejectUnauthorized: false } : undefined,
});

const adapter = new PrismaPg(postgresPool);

export const prisma = new PrismaClient({
	adapter,
});
