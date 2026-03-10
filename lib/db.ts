import mysql from "mysql2/promise";

declare global {
  var __mysqlPool: mysql.Pool | undefined;
}

function requireEnv(name: string, fallback?: string) {
  const value = process.env[name] ?? fallback;

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export const dbConfig = {
  host: requireEnv("DB_HOST", "127.0.0.1"),
  port: Number(requireEnv("DB_PORT", "3306")),
  user: requireEnv("DB_USER", "root"),
  password: process.env.DB_PASSWORD ?? "",
  database: requireEnv("DB_NAME", "hris_payroll_app"),
};

export const pool =
  global.__mysqlPool ??
  mysql.createPool({
    ...dbConfig,
    connectionLimit: 10,
    waitForConnections: true,
    namedPlaceholders: true,
  });

if (process.env.NODE_ENV !== "production") {
  global.__mysqlPool = pool;
}
