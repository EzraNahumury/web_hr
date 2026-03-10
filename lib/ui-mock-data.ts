export const adminUser = {
  name: "Ezra Kristanto",
  email: "ezra.kristanto@ti.ukdw.ac.id",
};

export const employeeUser = {
  name: "Rina Saputri",
  nip: "KRY-2026-001",
  division: "Operasional",
  department: "Office",
  role: "Staff Admin",
};

export const adminStats = [
  { label: "Total Karyawan", value: "128", hint: "Aktif bulan ini" },
  { label: "Absensi Hari Ini", value: "116", hint: "12 belum check-in" },
  { label: "Payroll Draft", value: "2", hint: "Periode Maret 2026" },
  { label: "Slip Siap Distribusi", value: "84", hint: "Menunggu publish" },
];

export const employeeStats = [
  { label: "Masuk Bulan Ini", value: "22 Hari", hint: "2 izin, 1 sakit" },
  { label: "Total Lembur", value: "11 Jam", hint: "4 request approved" },
  { label: "Sisa Pinjaman", value: "Rp900.000", hint: "3 cicilan lagi" },
  { label: "Slip Gaji", value: "Maret 2026", hint: "Sudah tersedia" },
];

export const adminMenu = [
  { label: "Dashboard", href: "/admin", description: "Ringkasan sistem" },
  { label: "Data Karyawan", href: "/admin/employees", description: "Master karyawan" },
  { label: "Absensi", href: "/admin/attendance", description: "Spreadsheet bulanan" },
  { label: "Lembur", href: "/admin/overtime", description: "Pengajuan dan approval" },
  { label: "Pinjaman", href: "/admin/loans", description: "Potongan dan cicilan" },
  { label: "Potongan Kontrak", href: "/admin/contract-deductions", description: "Kontrak dan kenaikan" },
  { label: "Summary Payroll", href: "/admin/payroll-summary", description: "Summary payroll" },
  { label: "Finance", href: "/admin/finance", description: "Pembebanan dan pencairan" },
  { label: "Slip Gaji", href: "/admin/payslips", description: "Normal dan sales" },
  { label: "Distribusi Slip", href: "/admin/payslip-distribution", description: "Distribusi slip gaji" },
];

export const employeeMenu = [
  { label: "Dashboard", href: "/employee", description: "Ringkasan pribadi" },
  { label: "Presensi Masuk", href: "/employee/check-in", description: "Selfie dan lokasi" },
  { label: "Presensi Pulang", href: "/employee/check-out", description: "Checkout harian" },
  { label: "Riwayat Absensi", href: "/employee/attendance-history", description: "Riwayat bulanan" },
  { label: "Data Lembur", href: "/employee/overtime", description: "Lembur dan approval" },
  { label: "Status Pinjaman", href: "/employee/loans", description: "Sisa pinjaman" },
  { label: "Informasi Kontrak", href: "/employee/contract", description: "Kontrak dan potongan" },
  { label: "Slip Gaji", href: "/employee/payslips", description: "Arsip slip gaji" },
];

export const employeesTable = [
  {
    name: "Rina Saputri",
    nip: "KRY-2026-001",
    email: "rina.saputri@company.local",
    password: "rina12345",
    role: "Staff Admin",
    division: "Operasional",
    department: "Office",
    recap: "Office A",
    bank: "BCA",
    account: "1234567890",
    status: "Kontrak",
  },
  {
    name: "Budi Hartono",
    nip: "KRY-2026-002",
    email: "budi.hartono@company.local",
    password: "budi12345",
    role: "Partner Toko",
    division: "Penjualan",
    department: "Toko",
    recap: "Toko Timur",
    bank: "BRI",
    account: "9876543210",
    status: "Tetap",
  },
  {
    name: "Salsa Permata",
    nip: "KRY-2026-003",
    email: "salsa.permata@company.local",
    password: "salsa12345",
    role: "Staff Gudang",
    division: "Distribusi",
    department: "Gudang",
    recap: "Gudang Sentral",
    bank: "Mandiri",
    account: "1112223334",
    status: "Kontrak",
  },
];

export const attendanceDays = Array.from({ length: 31 }, (_, index) => index + 1);

export const attendanceSheet = [
  {
    name: "Rina Saputri",
    nip: "KRY-2026-001",
    role: "Staff Admin",
    division: "Operasional",
    department: "Office",
    email: "rina.saputri@company.local",
    password: "rina12345",
    codes: ["M", "M", "M", "T", "M", "L", "L", "M", "M", "M", "M", "M", "S", "L", "M", "M", "M", "M", "M", "L", "L", "M", "M", "M", "I", "M", "M", "M", "M", "M", "M"],
  },
  {
    name: "Budi Hartono",
    nip: "KRY-2026-002",
    role: "Partner Toko",
    division: "Penjualan",
    department: "Toko",
    email: "budi.hartono@company.local",
    password: "budi12345",
    codes: ["M", "M", "M", "M", "M", "M", "L", "M", "M", "M", "M", "M", "M", "L", "M", "M", "M", "M", "M", "M", "L", "M", "M", "M", "M", "M", "M", "M", "M", "M", "M"],
  },
];

export const contractRows = [
  {
    name: "Rina Saputri",
    nip: "KRY-2026-001",
    role: "Staff Admin",
    division: "Operasional",
    department: "Office",
    contract: "Kontrak 12 Bulan",
    annualRaise: "Rp500.000",
    monthlyDeduction: "Rp200.000",
  },
  {
    name: "Salsa Permata",
    nip: "KRY-2026-003",
    role: "Staff Gudang",
    division: "Distribusi",
    department: "Gudang",
    contract: "Kontrak 6 Bulan",
    annualRaise: "Rp300.000",
    monthlyDeduction: "Rp200.000",
  },
];

export const loanRows = [
  {
    name: "Rina Saputri",
    role: "Staff Admin",
    department: "Office",
    loan: "Rp1.500.000",
    installment: "Rp300.000",
    monthlyCut: "Rp300.000",
    history: "2x bayar",
    paid: "Rp600.000",
    remaining: "Rp900.000",
  },
  {
    name: "Budi Hartono",
    role: "Partner Toko",
    department: "Toko",
    loan: "Rp2.000.000",
    installment: "Rp500.000",
    monthlyCut: "Rp500.000",
    history: "Baru approve",
    paid: "Rp0",
    remaining: "Rp2.000.000",
  },
];

export const overtimeRows = [
  {
    name: "Budi Hartono",
    date: "01 Mar 2026",
    start: "16:30",
    end: "18:30",
    total: "2 Jam",
    proof: "Foto + form",
    approval: "Approved",
    note: "Pengganti shift partner",
  },
  {
    name: "Rina Saputri",
    date: "05 Mar 2026",
    start: "16:30",
    end: "17:30",
    total: "1 Jam",
    proof: "Screenshot laporan",
    approval: "Pending",
    note: "Menunggu approval atasan",
  },
];

export const payrollRows = [
  {
    name: "Rina Saputri",
    period: "Maret 2026",
    base: "Rp3.200.000",
    finalDaily: "Rp123.077",
    allowanceRole: "Rp300.000",
    allowanceOther: "Rp150.000",
    transport: "Rp150.000",
    bpjs: "Rp120.000",
    performance: "Rp100.000",
    workDays: "26",
    present: "25",
    totalBase: "Rp3.076.925",
    omzet: "-",
    meal: "Rp250.000",
    diligence: "Rp0",
    overtime: "Rp0",
    bonus: "Rp0",
    leave: "1",
    halfDay: "0",
    totalDeduction: "Rp520.000",
    beforeDeduction: "Rp4.150.000",
    contractCut: "Rp200.000",
    loanCut: "Rp300.000",
    fineCut: "Rp20.000",
    diligenceCut: "Rp0",
    net: "Rp3.630.000",
  },
  {
    name: "Budi Hartono",
    period: "Maret 2026",
    base: "Rp3.500.000",
    finalDaily: "Rp134.615",
    allowanceRole: "Rp450.000",
    allowanceOther: "Rp200.000",
    transport: "Rp200.000",
    bpjs: "Rp140.000",
    performance: "Rp250.000",
    workDays: "26",
    present: "26",
    totalBase: "Rp3.500.000",
    omzet: "Rp28.000.000",
    meal: "Rp300.000",
    diligence: "Rp100.000",
    overtime: "Rp160.000",
    bonus: "Rp250.000",
    leave: "0",
    halfDay: "0",
    totalDeduction: "Rp500.000",
    beforeDeduction: "Rp5.410.000",
    contractCut: "Rp0",
    loanCut: "Rp500.000",
    fineCut: "Rp0",
    diligenceCut: "Rp0",
    net: "Rp4.910.000",
  },
];

export const financeRows = [
  {
    department: "Office",
    recap: "Office A",
    allocation: "Biaya operasional kantor",
    disbursement: "Rp18.500.000",
    notes: "Termasuk potongan kontrak dan pinjaman",
  },
  {
    department: "Toko",
    recap: "Toko Timur",
    allocation: "Beban penjualan dan sales",
    disbursement: "Rp22.400.000",
    notes: "Ada hutang karyawan Rp2.000.000",
  },
];

export const payslipCards = [
  {
    title: "Slip Gaji Normal",
    subtitle: "Template staff office / gudang / produksi",
    period: "Maret 2026",
    net: "Rp3.630.000",
  },
  {
    title: "Slip Gaji Sales",
    subtitle: "Template sales dengan komponen omzet / bonus",
    period: "Maret 2026",
    net: "Rp4.910.000",
  },
];

export const distributionRows = [
  {
    slipNo: "SLIP-202603-001",
    employee: "Rina Saputri",
    period: "Maret 2026",
    status: "Terkirim",
    read: "Belum dibaca",
  },
  {
    slipNo: "SLIP-202603-002",
    employee: "Budi Hartono",
    period: "Maret 2026",
    status: "Terkirim",
    read: "Sudah dibaca",
  },
];

export const employeeAttendanceHistory = [
  { date: "01 Mar 2026", checkIn: "08:34", checkOut: "16:35", status: "Hadir", late: "4 menit" },
  { date: "02 Mar 2026", checkIn: "08:27", checkOut: "16:31", status: "Hadir", late: "-" },
  { date: "03 Mar 2026", checkIn: "08:31", checkOut: "16:32", status: "Hadir", late: "1 menit" },
  { date: "04 Mar 2026", checkIn: "-", checkOut: "-", status: "Izin", late: "-" },
];

export const employeeOvertime = [
  { date: "05 Mar 2026", hours: "1 Jam", status: "Pending", note: "Closing laporan bulanan" },
  { date: "12 Mar 2026", hours: "2 Jam", status: "Approved", note: "Support audit stok" },
];

export const employeePayslips = [
  { period: "Maret 2026", type: "Slip Gaji Normal", net: "Rp3.630.000", status: "Tersedia" },
  { period: "Februari 2026", type: "Slip Gaji Normal", net: "Rp3.540.000", status: "Tersedia" },
];

export const payslipDetail = {
  employee: "Rina Saputri",
  title: "Staff Admin / Operasional",
  bank: "BCA",
  account: "1234567890",
  period: "Maret 2026",
  totalDays: "26",
  overtime: "0 Jam",
  late: "12 Menit",
  halfDay: "0",
  earnings: [
    ["Gaji Pokok", "Rp3.200.000"],
    ["Tunjangan Jabatan", "Rp300.000"],
    ["Tunjangan Lain", "Rp150.000"],
    ["Uang Makan", "Rp250.000"],
    ["Transport", "Rp150.000"],
    ["Bonus Performa", "Rp100.000"],
  ],
  deductions: [
    ["BPJS", "Rp120.000"],
    ["Potongan Kontrak", "Rp200.000"],
    ["Potongan Pinjaman", "Rp300.000"],
    ["Potongan Denda", "Rp20.000"],
  ],
  net: "Rp3.630.000",
};
