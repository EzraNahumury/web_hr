# Perubahan Backend Web HR untuk Aplikasi Mobile

Aplikasi mobile karyawan butuh **autentikasi berbasis token** (Bearer), karena web
memakai cookie `httpOnly` yang tidak praktis di HP. Semua perubahan di bawah **bersifat
aditif** — tidak mengubah perilaku web yang sudah ada.

Perubahan ini sudah diterapkan pada salinan repo di
`D:\apps-hr\web_hr-main (1)\web_hr-main`. Tinggal salin ke repo produksi Anda lalu deploy.

> Pastikan environment variable `APP_SESSION_SECRET` di server **sama** seperti yang
> dipakai web (token mobile ditandatangani dengan secret ini).

---

## 1. `lib/auth.ts` — terima Bearer token (EDIT)

Tambah `headers` pada import `next/headers`, dan ubah `getCurrentEmployeeSession()` agar
membaca token dari header `Authorization` bila cookie tidak ada:

```ts
import { cookies, headers } from "next/headers";   // <- tambah `headers`

export async function getCurrentEmployeeSession() {
  // Web: cookie httpOnly
  const cookieStore = await cookies();
  const fromCookie = readSignedSession<EmployeeSession>(
    cookieStore.get(EMPLOYEE_SESSION_COOKIE)?.value,
  );
  if (fromCookie) return fromCookie;

  // Mobile: Authorization: Bearer <token>  (nilai token = signed-session yang sama)
  const headerStore = await headers();
  const authHeader =
    headerStore.get("authorization") ?? headerStore.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return readSignedSession<EmployeeSession>(authHeader.slice(7).trim());
  }
  return null;
}
```

➡️ Karena **semua** endpoint `/api/employee/*` memakai `getCurrentEmployeeSession()`,
satu perubahan ini langsung membuat seluruh endpoint employee kompatibel dengan token
mobile (check-in, check-out, profile, dll).

---

## 2. `app/api/mobile/login/route.ts` — login mobile (FILE BARU)

`POST /api/mobile/login` body `{ email, password }`:
- Validasi sama seperti `/api/login`.
- **Hanya role `karyawan`** (admin/SPV → 403).
- Balas `{ token, employee: { id, userId, nama, email, no_karyawan, jabatan, divisi, departemen, penempatan } }`.
- `token = createSignedSession({ id, userId, email, fullName })` — identik dengan cookie web.

(File lengkap sudah dibuat di repo.)

---

## 3. Endpoint GET baru untuk data karyawan (FILE BARU)

Web menampilkan data ini lewat Server Component (query langsung), jadi belum ada API
GET-nya. Ditambahkan endpoint berikut untuk mobile:

| Endpoint | Fungsi |
|----------|--------|
| `GET /api/employee/attendance/today` | Status presensi hari ini |
| `GET /api/employee/attendance/history` | Riwayat absensi (200 terbaru) |
| `GET /api/employee/overview` | Ringkasan dashboard (reuse `getEmployeeOverview`) |
| `GET /api/employee/payslips` | Daftar slip gaji yang sudah didistribusikan |
| `GET /api/employee/bonus-slips` | Daftar slip bonus |
| `GET /api/employee/contract` | Informasi kontrak (read-only) |

Semua memakai pola auth yang sama:
```ts
const session = await getCurrentEmployeeSession();
if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
```

---

## 4. Handler GET ditambahkan ke endpoint yang sudah ada (EDIT)

Endpoint ini sebelumnya hanya punya `POST` (untuk submit). Ditambahkan `GET` untuk
menampilkan daftar milik karyawan tsb (POST lama tidak diubah):

- `GET /api/employee/overtime` — daftar lembur
- `GET /api/employee/loans` — daftar pinjaman + sisa
- `GET /api/employee/reimbursements` — daftar reimburse
- `GET /api/employee/business-trips` — daftar perjalanan dinas

---

## 5. Catatan CORS

Aplikasi **native (APK)** tidak terkena CORS (CORS hanya berlaku di browser), jadi
**tidak perlu** konfigurasi CORS untuk distribusi APK.
CORS hanya relevan jika Anda menjalankan versi **web** dari Expo (`expo start --web`).

---

## Ringkasan file yang disentuh di repo Web HR

```
lib/auth.ts                                   (EDIT  — Bearer support)
app/api/mobile/login/route.ts                 (BARU)
app/api/employee/attendance/today/route.ts    (BARU)
app/api/employee/attendance/history/route.ts  (BARU)
app/api/employee/overview/route.ts            (BARU)
app/api/employee/payslips/route.ts            (BARU)
app/api/employee/bonus-slips/route.ts         (BARU)
app/api/employee/contract/route.ts            (BARU)
app/api/employee/overtime/route.ts            (EDIT  — tambah GET)
app/api/employee/loans/route.ts               (EDIT  — tambah GET)
app/api/employee/reimbursements/route.ts      (EDIT  — tambah GET)
app/api/employee/business-trips/route.ts      (EDIT  — tambah GET)
```
