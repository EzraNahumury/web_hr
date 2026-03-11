import { NextResponse } from "next/server";

import { getCurrentAdminSession } from "@/lib/auth";
import {
  upsertPayrollPeriodOmzet,
  upsertPayrollFromForm,
  type PayrollFormPayload,
} from "@/lib/payroll-admin";

function parseCurrency(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function parsePositiveInt(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function getRequestedPeriod(body: Record<string, unknown>) {
  const month = parsePositiveInt(body.month);
  const year = parsePositiveInt(body.year);

  if (month === null || year === null || month > 12) {
    return { error: "Periode payroll tidak valid." };
  }

  return { period: { month, year } };
}

function validatePayrollPayload(body: Record<string, unknown>) {
  const employeeId = Number(body.employeeId);

  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    return { error: "Karyawan wajib dipilih." };
  }

  const values = {
    gajiPerDay: parseCurrency(body.gajiPerDay),
    tunjanganJabatan: parseCurrency(body.tunjanganJabatan),
    uangMakan: parseCurrency(body.uangMakan),
    subsidi: parseCurrency(body.subsidi),
    uangKerajinan: parseCurrency(body.uangKerajinan),
    bpjs: parseCurrency(body.bpjs),
    bonusPerforma: parseCurrency(body.bonusPerforma),
    insentif: parseCurrency(body.insentif),
    uangTransport: parseCurrency(body.uangTransport),
  };

  if (Object.values(values).some((value) => value === null)) {
    return { error: "Semua nominal payroll harus berupa angka valid dan tidak boleh negatif." };
  }

  const payload: PayrollFormPayload = {
    employeeId,
    payrollType: "non_sales",
    gajiPerDay: values.gajiPerDay ?? 0,
    tunjanganJabatan: values.tunjanganJabatan ?? 0,
    uangMakan: values.uangMakan ?? 0,
    subsidi: values.subsidi ?? 0,
    uangKerajinan: values.uangKerajinan ?? 0,
    bpjs: values.bpjs ?? 0,
    bonusPerforma: values.bonusPerforma ?? 0,
    totalOmzet: 0,
    insentif: values.insentif ?? 0,
    uangTransport: values.uangTransport ?? 0,
  };

  return { payload };
}

function validateOmzetPayload(body: Record<string, unknown>) {
  const totalOmzet = parseCurrency(body.totalOmzet);

  if (totalOmzet === null) {
    return { error: "Total omzet harus berupa angka valid dan tidak boleh negatif." };
  }

  return { totalOmzet };
}

export async function POST(request: Request) {
  const admin = await getCurrentAdminSession();

  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const periodResult = getRequestedPeriod(body);

    if ("error" in periodResult) {
      return NextResponse.json({ message: periodResult.error }, { status: 400 });
    }

    const action = body.action === "save_omzet" ? "save_omzet" : "save_payroll";

    if (action === "save_omzet") {
      const result = validateOmzetPayload(body);

      if ("error" in result) {
        return NextResponse.json({ message: result.error }, { status: 400 });
      }

      const saved = await upsertPayrollPeriodOmzet(result.totalOmzet, periodResult.period);

      return NextResponse.json({
        message: saved.isUpdate
          ? `Total omzet periode ${saved.periodMonth}/${saved.periodYear} berhasil diupdate. Bonus omzet ${saved.bonusOmzet.toLocaleString("id-ID")}.`
          : `Total omzet periode ${saved.periodMonth}/${saved.periodYear} berhasil disimpan. Bonus omzet ${saved.bonusOmzet.toLocaleString("id-ID")}.`,
        saved,
      });
    }

    const result = validatePayrollPayload(body);

    if ("error" in result) {
      return NextResponse.json({ message: result.error }, { status: 400 });
    }

    const saved = await upsertPayrollFromForm(result.payload, periodResult.period);

    return NextResponse.json({
      message: `Payroll ${saved.employeeName} untuk periode ${saved.periodMonth}/${saved.periodYear} berhasil disimpan.`,
      saved,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan payroll.";
    console.error("Create payroll summary error", error);
    return NextResponse.json({ message }, { status: 500 });
  }
}
