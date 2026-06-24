import type { RowDataPacket } from "mysql2";

import { pool } from "@/lib/db";

const OLLAMA_HOST = (process.env.OLLAMA_HOST ?? "https://ollama.com").replace(/\/+$/, "");
const OLLAMA_KEY = process.env.OLLAMA_KEY ?? "";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "gpt-oss:120b-cloud";

export type HrAgentMessage = {
  role: "user" | "assistant";
  content: string;
};

type OllamaToolCall = {
  id?: string;
  function: {
    name: string;
    arguments: Record<string, unknown> | string;
  };
};

type OllamaMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  thinking?: string;
  tool_calls?: OllamaToolCall[];
  tool_name?: string;
};

// ── Schema introspection (cached, akurat mengikuti DB live) ──────────────────

let schemaCache: { text: string; expiresAt: number } | null = null;
const SCHEMA_TTL_MS = 5 * 60 * 1000;

// Tabel yang boleh dibaca agent. Sengaja exclude tabel sensitif (users password, otp).
const ALLOWED_TABLES = new Set([
  "karyawan",
  "absensi",
  "jadwal_karyawan",
  "lembur",
  "perjalanan_dinas",
  "reimbursements",
  "pinjaman",
  "pinjaman_cicilan",
  "potongan_kontrak",
  "payroll",
  "payroll_employee_input",
  "payroll_bonus",
  "omzet_bulanan",
  "slip_gaji",
  "log_distribusi_slip",
  "laporan_kunjungan",
  "finance_lembur_tambahan",
]);

type ColumnRow = RowDataPacket & {
  TABLE_NAME: string;
  COLUMN_NAME: string;
  COLUMN_TYPE: string;
};

async function getDatabaseSchema(): Promise<string> {
  const now = Date.now();
  if (schemaCache && schemaCache.expiresAt > now) {
    return schemaCache.text;
  }

  const [rows] = await pool.query<ColumnRow[]>(
    `
      SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME, ORDINAL_POSITION
    `,
  );

  const byTable = new Map<string, string[]>();
  for (const row of rows) {
    if (!ALLOWED_TABLES.has(row.TABLE_NAME)) continue;
    if (!byTable.has(row.TABLE_NAME)) byTable.set(row.TABLE_NAME, []);
    byTable.get(row.TABLE_NAME)!.push(`${row.COLUMN_NAME} ${row.COLUMN_TYPE}`);
  }

  const lines: string[] = [];
  for (const [table, cols] of byTable) {
    lines.push(`${table}(${cols.join(", ")})`);
  }

  const text = lines.join("\n");
  schemaCache = { text, expiresAt: now + SCHEMA_TTL_MS };
  return text;
}

// ── Guardrail SQL read-only ──────────────────────────────────────────────────

const FORBIDDEN_SQL =
  /\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|replace|call|set|lock|unlock|rename|merge|handler|load|outfile|dumpfile)\b/i;

function sanitizeSql(rawSql: string): string {
  let sql = (rawSql ?? "").trim();
  // Buang titik koma penutup, tolak multi-statement.
  sql = sql.replace(/;\s*$/, "");
  if (sql.includes(";")) {
    throw new Error("Hanya boleh satu statement SELECT.");
  }
  const lower = sql.toLowerCase();
  if (!lower.startsWith("select") && !lower.startsWith("with")) {
    throw new Error("Hanya query SELECT yang diizinkan.");
  }
  if (FORBIDDEN_SQL.test(sql)) {
    throw new Error("Query mengandung operasi yang tidak diizinkan (read-only saja).");
  }
  // Batasi jumlah baris bila belum ada LIMIT.
  if (!/\blimit\b/i.test(sql)) {
    sql = `${sql} LIMIT 500`;
  }
  return sql;
}

async function runReadonlySql(rawSql: string): Promise<string> {
  let sql: string;
  try {
    sql = sanitizeSql(rawSql);
  } catch (error) {
    return JSON.stringify({ error: error instanceof Error ? error.message : "SQL tidak valid." });
  }

  const connection = await pool.getConnection();
  try {
    await connection.query("SET SESSION TRANSACTION READ ONLY");
    const [rows] = await connection.query<RowDataPacket[]>(sql);
    await connection.query("SET SESSION TRANSACTION READ WRITE");
    const limited = Array.isArray(rows) ? rows.slice(0, 500) : rows;
    return JSON.stringify({ rowCount: Array.isArray(rows) ? rows.length : 0, rows: limited });
  } catch (error) {
    try {
      await connection.query("SET SESSION TRANSACTION READ WRITE");
    } catch {
      /* ignore */
    }
    return JSON.stringify({ error: error instanceof Error ? error.message : "Query gagal dijalankan." });
  } finally {
    connection.release();
  }
}

// ── Ollama chat ──────────────────────────────────────────────────────────────

const TOOLS = [
  {
    type: "function",
    function: {
      name: "run_sql_query",
      description:
        "Jalankan satu query MySQL SELECT (read-only) ke database HR/payroll untuk menjawab pertanyaan user. Selalu pakai query ini untuk mengambil data nyata, jangan mengarang angka.",
      parameters: {
        type: "object",
        properties: {
          sql: {
            type: "string",
            description: "Satu statement SELECT MySQL yang valid. Tanpa titik koma di akhir.",
          },
        },
        required: ["sql"],
      },
    },
  },
];

function buildSystemPrompt(schema: string): string {
  const today = new Date().toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" });
  return `Kamu adalah "HR Agent", asisten AI internal untuk admin HR perusahaan AvA Group.
Tugasmu menjawab pertanyaan admin berdasarkan DATA NYATA di database MySQL melalui tool run_sql_query.

ATURAN PENTING:
- SELALU ambil data lewat tool run_sql_query (SELECT). Jangan pernah mengarang angka atau nama.
- Skema tabel SUDAH diberikan di bawah. Langsung tulis SQL berdasarkan skema itu — JANGAN query information_schema atau SHOW TABLES.
- Usahakan cukup 1 query untuk menjawab. Hanya panggil tool lagi bila benar-benar perlu.
- Untuk cari nama, pakai LIKE case-insensitive, contoh: WHERE LOWER(nama) LIKE '%ezra%'.
- Hanya query SELECT (read-only). Tidak boleh mengubah data.
- Jika query error, perbaiki SQL lalu coba lagi.
- Jawab ringkas, jelas, dalam Bahasa Indonesia. Gunakan tabel/daftar bila cocok.
- Format angka uang sebagai Rupiah (mis. Rp 1.500.000).
- Jika data tidak ada, katakan terus terang.
- Tanggal hari ini: ${today} (zona Asia/Jakarta).

KONTEKS DOMAIN:
- Periode payroll: tanggal 26 bulan sebelumnya s/d 25 bulan berjalan.
- karyawan.status_data = 'aktif' artinya karyawan masih bekerja.
- karyawan.status_kepegawaian: training/kontrak/tetap/freelance/magang/resign.
- absensi.status_absensi: hadir/sakit/izin/alfa/libur/setengah_hari. kode_absensi: O=hadir, T=terlambat, S=sakit, SX=sakit tanpa surat, I=izin, A=alfa, L=libur, C=cuti, H=setengah hari.
- payroll.gaji_bersih = take home pay. lembur.status_approval: pending/approved/rejected.
- pinjaman.status_pinjaman: pending/approved/berjalan/lunas/rejected.

SKEMA DATABASE (tabel(kolom tipe, ...)):
${schema}`;
}

async function callOllama(messages: OllamaMessage[]): Promise<OllamaMessage> {
  const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(OLLAMA_KEY ? { Authorization: `Bearer ${OLLAMA_KEY}` } : {}),
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      // Matikan reasoning panjang agar respons jauh lebih cepat (hindari timeout proxy).
      think: false,
      messages,
      tools: TOOLS,
      options: { temperature: 0 },
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Ollama error ${response.status}: ${text.slice(0, 300)}`);
  }

  const data = (await response.json()) as { message?: OllamaMessage };
  if (!data.message) {
    throw new Error("Respon Ollama tidak valid.");
  }
  return data.message;
}

const MAX_TOOL_ITERATIONS = 4;

export async function chatWithHrAgent(history: HrAgentMessage[]): Promise<string> {
  if (!OLLAMA_KEY) {
    throw new Error("OLLAMA_KEY belum di-set di environment server.");
  }

  const schema = await getDatabaseSchema();
  const messages: OllamaMessage[] = [
    { role: "system", content: buildSystemPrompt(schema) },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ];

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const message = await callOllama(messages);
    const toolCalls = message.tool_calls ?? [];

    if (toolCalls.length === 0) {
      return message.content?.trim() || "Maaf, tidak ada jawaban yang bisa diberikan.";
    }

    // Echo balik pesan assistant (berisi tool_calls) lalu lampirkan hasil tool.
    messages.push({
      role: "assistant",
      content: message.content ?? "",
      tool_calls: toolCalls,
    });

    for (const call of toolCalls) {
      const args =
        typeof call.function.arguments === "string"
          ? safeParseArgs(call.function.arguments)
          : call.function.arguments;
      const sql = typeof args.sql === "string" ? args.sql : "";
      const result =
        call.function.name === "run_sql_query"
          ? await runReadonlySql(sql)
          : JSON.stringify({ error: `Tool tidak dikenal: ${call.function.name}` });

      messages.push({
        role: "tool",
        tool_name: call.function.name,
        content: result,
      });
    }
  }

  // Iterasi habis — minta jawaban final tanpa tool.
  const finalMessage = await callOllama([
    ...messages,
    {
      role: "user",
      content:
        "Berdasarkan hasil query di atas, berikan jawaban final yang ringkas dalam Bahasa Indonesia sekarang.",
    },
  ]);
  return finalMessage.content?.trim() || "Maaf, tidak ada jawaban yang bisa diberikan.";
}

function safeParseArgs(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}
