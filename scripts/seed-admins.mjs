import mysql from "mysql2/promise";

const ADMINS = [
  { nama: "Ava Family", email: "avafamily17@gmail.com" },
  { nama: "Ava Group HRD", email: "avagrouphrd@gmail.com" },
];
const PASSWORD = "nakula1705";

const required = ["DB_HOST", "DB_PORT", "DB_USER", "DB_NAME"];
for (const k of required) {
  if (!process.env[k]) {
    console.error(`Missing env var: ${k}. Pastikan .env.local terisi atau pakai --env-file.`);
    process.exit(1);
  }
}

console.log(
  `Connecting to ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME} as ${process.env.DB_USER}...`,
);

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME,
});

try {
  for (const { nama, email } of ADMINS) {
    const [existing] = await conn.query(
      "SELECT id, role FROM users WHERE email = ?",
      [email],
    );

    if (existing.length > 0) {
      const row = existing[0];
      await conn.query(
        "UPDATE users SET nama = ?, password = SHA2(?, 256), role = 'admin', status_aktif = 1 WHERE id = ?",
        [nama, PASSWORD, row.id],
      );
      console.log(
        `✓ Updated user → admin: ${email} (id=${row.id}, sebelumnya role='${row.role}')`,
      );
    } else {
      const [result] = await conn.query(
        "INSERT INTO users (nama, email, password, role, status_aktif) VALUES (?, ?, SHA2(?, 256), 'admin', 1)",
        [nama, email, PASSWORD],
      );
      console.log(`✓ Inserted admin baru: ${email} (id=${result.insertId})`);
    }
  }

  const [admins] = await conn.query(
    "SELECT id, nama, email, role, status_aktif FROM users WHERE role = 'admin' ORDER BY id",
  );
  console.log("\nSemua admin di DB sekarang:");
  console.table(admins);
} finally {
  await conn.end();
}
