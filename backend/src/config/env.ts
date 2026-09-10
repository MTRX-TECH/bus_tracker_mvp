import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

dotenv.config({ path: path.join(__dirname, "../../.env") });

const envSchema = z.object({
  PORT: z.string().default("5000").transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  MONGODB_URI: z.string().default(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/mtrx_bus_tracker"),
  JWT_ACCESS_SECRET: z.string().min(10).default("mtrx_tech_super_secure_access_secret_key_2026_maran_v"),
  JWT_REFRESH_SECRET: z.string().min(10).default("mtrx_tech_super_secure_refresh_secret_key_2026_maran_v"),
  JWT_ACCESS_EXPIRE: z.string().default("15m"),
  JWT_REFRESH_EXPIRE: z.string().default("7d"),
  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.string().default("587").transform((val) => parseInt(val, 10)),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("RIT Bus Tracker <noreply@mtrxtech.com>"),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  ADMIN_SEED_EMAIL: z.string().email().default("admin@mtrxtech.com"),
  ADMIN_SEED_PASSWORD: z.string().min(6).default("MtrxTech@2026!"),
  ADMIN_SEED_NAME: z.string().default(" (Super Admin)"),
  SEED_DEMO_DATA: z.string().default("true").transform((val) => val === "true"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Fatal Environment Variable Validation Error:", parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;
