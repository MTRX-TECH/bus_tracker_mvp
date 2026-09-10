import nodemailer from "nodemailer";
import { config } from "./env";

class MailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    if (config.SMTP_USER && config.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: config.SMTP_PORT === 465,
        auth: {
          user: config.SMTP_USER,
          pass: config.SMTP_PASS,
        },
      });
      console.log("📧 Nodemailer SMTP transporter initialized successfully.");
    } else {
      console.log("📫 No SMTP credentials found. Emails will be logged directly to server console (Zero-Cost Dev Mode).");
    }
  }

  async sendEmail(to: string, subject: string, htmlContent: string): Promise<boolean> {
    try {
      if (this.transporter) {
        await this.transporter.sendMail({
          from: config.SMTP_FROM,
          to,
          subject,
          html: htmlContent,
        });
        return true;
      } else {
        console.log("==================== SIMULATED EMAIL ====================");
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Content: ${htmlContent.slice(0, 300)}...`);
        console.log("=========================================================");
        return true;
      }
    } catch (err: any) {
      console.error(`❌ Failed to send email to ${to}:`, err.message);
      return false;
    }
  }
}

export const mailer = new MailService();
