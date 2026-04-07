import { randomInt } from "node:crypto";
import { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import nodemailer from "nodemailer";
import { pool } from "@/lib/db";

const OTP_EXPIRY_MINUTES = 5;

let tableReady: Promise<void> | null = null;

async function ensureOtpTable() {
  if (!tableReady) {
    tableReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS otp_codes (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          email VARCHAR(190) NOT NULL,
          code VARCHAR(6) NOT NULL,
          expires_at DATETIME NOT NULL,
          used TINYINT(1) NOT NULL DEFAULT 0,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_otp_email_code (email, code)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    })();
  }
  await tableReady;
}

function generateOtp(): string {
  return String(randomInt(100000, 999999));
}

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER ?? "",
      pass: process.env.SMTP_PASS ?? "",
    },
  });
}

export async function sendOtp(email: string): Promise<{ success: boolean; message: string }> {
  await ensureOtpTable();

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await pool.query(
    "UPDATE otp_codes SET used = 1 WHERE email = ? AND used = 0",
    [email],
  );

  await pool.query<ResultSetHeader>(
    `INSERT INTO otp_codes (email, code, expires_at) VALUES (?, ?, ?)`,
    [email, code, expiresAt],
  );

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "noreply@kayres.co.id",
      to: email,
      subject: "Kode Verifikasi Pendaftaran - Kayres Employee Portal",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h2 style="color: #8f1d22; margin-bottom: 16px;">Kode Verifikasi</h2>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">
            Gunakan kode berikut untuk menyelesaikan pendaftaran akun Anda di Kayres Employee Portal:
          </p>
          <div style="background: #f5f0ed; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #8f1d22;">${code}</span>
          </div>
          <p style="color: #666; font-size: 13px;">
            Kode ini berlaku selama ${OTP_EXPIRY_MINUTES} menit. Jangan bagikan kode ini kepada siapapun.
          </p>
        </div>
      `,
    });

    return { success: true, message: "Kode verifikasi telah dikirim ke email Anda." };
  } catch (error) {
    console.error("Failed to send OTP email", error);
    return { success: false, message: "Gagal mengirim email verifikasi. Periksa konfigurasi SMTP." };
  }
}

export async function verifyOtp(email: string, code: string): Promise<boolean> {
  await ensureOtpTable();

  const [rows] = await pool.query<(RowDataPacket & { id: number })[]>(
    `
      SELECT id FROM otp_codes
      WHERE email = ? AND code = ? AND used = 0 AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [email, code],
  );

  if (!rows[0]) return false;

  await pool.query("UPDATE otp_codes SET used = 1 WHERE id = ?", [rows[0].id]);
  return true;
}
