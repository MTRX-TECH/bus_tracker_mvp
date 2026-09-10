import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { config } from "./env";
import { UserRole, BusStatus } from "@mtrx/shared";
import { UserModel } from "../models/User";
import { OrganizationModel } from "../models/Organization";
import { BusModel } from "../models/Bus";
import { RouteModel } from "../models/Route";
import { AuditLogModel } from "../models/AuditLog";

export const connectDB = async (retries = 5): Promise<void> => {
  while (retries > 0) {
    try {
      console.log(`⏳ Attempting MongoDB Atlas cloud connection (Attempts remaining: ${retries})...`);
      const conn = await mongoose.connect(config.MONGODB_URI, {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        family: 4, // Enforce IPv4 to resolve Windows ENOTFOUND and DNS timeout glitches
      });
      console.log(`✅ MongoDB Connected successfully: ${conn.connection.host}`);

      // Execute dynamic seeder upon connection if enabled
      if (config.SEED_DEMO_DATA && config.NODE_ENV !== "test") {
        await seedDatabase();
      }
      return;
    } catch (error: any) {
      retries -= 1;
      console.warn(`⚠️ Primary MongoDB connection failed (${error.message}).`);
      if (retries > 0) {
        console.log(`🔄 Retrying database connection in 3 seconds...`);
        await new Promise((res) => setTimeout(res, 3000));
        continue;
      }
      console.warn(`⚠️ Cloud MongoDB attempts exhausted. Attempting fallback in-memory start...`);
      if (config.NODE_ENV === "development") {
        try {
          const { MongoMemoryServer } = await import("mongodb-memory-server");
          const mongod = await MongoMemoryServer.create();
          const uri = mongod.getUri();
          await mongoose.connect(uri);
          console.log(`✅ Local In-Memory MongoDB Server started dynamically at ${uri}`);
          await seedDatabase();
        } catch (memError) {
          console.error("❌ MongoDB connection totally failed and mongodb-memory-server couldn't start:", memError);
          process.exit(1);
        }
      } else {
        process.exit(1);
      }
    }
  }
};

async function seedDatabase() {
  try {
    // 1. Check & seed default Super Admin ()
    const existingAdmin = await UserModel.findOne({ email: config.ADMIN_SEED_EMAIL });
    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(config.ADMIN_SEED_PASSWORD, salt);

      const superAdmin = await UserModel.create({
        name: config.ADMIN_SEED_NAME,
        email: config.ADMIN_SEED_EMAIL,
        passwordHash: hash,
        role: UserRole.SUPER_ADMIN,
        phone: "+91-9876543210",
        isOnline: true,
        mustChangePassword: false,
      });

      await AuditLogModel.create({
        userId: superAdmin._id,
        userRole: UserRole.SUPER_ADMIN,
        action: "SYSTEM_SEED",
        details: "Seeded initial Super Admin account for RIT platform.",
        ipAddress: "127.0.0.1",
      });
      console.log(`🌱 Seeded Super Admin account (${config.ADMIN_SEED_EMAIL})`);
    } else if (existingAdmin.mustChangePassword) {
      existingAdmin.mustChangePassword = false;
      await existingAdmin.save();
    }

    console.log("🔒 Enterprise cloud seeding verification completed: Super Admin initialized.");
  } catch (seedError) {
    console.error("❌ Database seeding encountered an error:", seedError);
  }
}
