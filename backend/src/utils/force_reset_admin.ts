import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { config } from "../config/env";
import { UserModel } from "../models/User";
import { UserRole } from "@mtrx/shared";

async function forceResetAdmin() {
  try {
    console.log(`📡 Connecting to MongoDB: ${config.MONGODB_URI}`);
    await mongoose.connect(config.MONGODB_URI);
    console.log("✅ Connected to database.");

    const email = "admin@mtrxtech.com";
    const password = "MtrxTech@2026!";

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Delete or override existing admin
    let user = await UserModel.findOne({ email });
    if (!user) {
      user = new UserModel({
        name: " (Super Admin)",
        email: email,
        passwordHash: passwordHash,
        role: UserRole.SUPER_ADMIN,
        phone: "+91-9876543210",
        isOnline: true,
        failedLoginAttempts: 0,
        lockUntil: undefined
      });
      await user.save();
      console.log(`✅ Super Admin created with email: ${email}`);
    } else {
      user.passwordHash = passwordHash;
      user.failedLoginAttempts = 0;
      user.lockUntil = undefined;
      user.role = UserRole.SUPER_ADMIN;
      await user.save();
      console.log(`✅ Super Admin password & lockout reset for email: ${email}`);
    }

    const allUsers = await UserModel.find({}, "name email role failedLoginAttempts");
    console.log("📊 Total users currently in DB:", allUsers);

    await mongoose.disconnect();
    console.log("🏁 Disconnected. Reset complete.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error running reset script:", err);
    process.exit(1);
  }
}

forceResetAdmin();
