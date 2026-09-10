import { v2 as cloudinary } from "cloudinary";
import { config } from "./env";

if (config.CLOUDINARY_API_KEY && config.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME || "mtrx_tech",
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET,
  });
  console.log("☁️ Cloudinary Free-Tier initialized for asset management.");
} else {
  console.warn("⚠️ Cloudinary API keys not provided; file uploads will use in-memory/local static fallback mode for zero-cost operation.");
}

export { cloudinary };
