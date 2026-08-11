import { notFound } from "next/navigation";

import AdminShell from "@/components/AdminShell";
import AdminMasterLookup from "@/components/AdminMasterLookup";
import { requireAdminSession } from "@/lib/auth";
import { isMasterCategory, listMasterLookup, MASTER_CATEGORIES } from "@/lib/master-lookup";

export const dynamic = "force-dynamic";

export default async function AdminMasterCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const admin = await requireAdminSession();
  const { category } = await params;

  if (!isMasterCategory(category)) {
    notFound();
  }

  const cfg = MASTER_CATEGORIES[category];
  const items = await listMasterLookup(category);

  return (
    <AdminShell
      title={`Master ${cfg.label}`}
      description={`Kelola isi dropdown ${cfg.label} pada form Data Karyawan — tambah atau hapus tanpa mengubah kode.`}
      adminName={admin.fullName}
      adminEmail={admin.email}
      currentPath={`/admin/master/${category}`}
    >
      <AdminMasterLookup category={category} categoryLabel={cfg.label} initialItems={items} />
    </AdminShell>
  );
}
