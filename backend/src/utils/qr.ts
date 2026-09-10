import qrcode from "qrcode";
import crypto from "crypto";

export const generateBusQRSecret = (busNumber: string, orgId: string): string => {
  const randomSalt = crypto.randomBytes(8).toString("hex");
  return `MTRX_QR_${orgId.toString().slice(0, 6)}_${busNumber.replace(/\s+/g, "")}_${randomSalt}`.toUpperCase();
};

export const generateQRCodeImageURL = async (text: string): Promise<string> => {
  try {
    const dataUrl = await qrcode.toDataURL(text, {
      errorCorrectionLevel: "H",
      type: "image/png",
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });
    return dataUrl;
  } catch (error: any) {
    throw new Error(`QR Generation Failed: ${error.message}`);
  }
};
