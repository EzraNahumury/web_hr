import { redirect } from "next/navigation";

// Master tanpa kategori → arahkan ke submenu pertama (Unit).
export default function AdminMasterIndexPage() {
  redirect("/admin/master/unit");
}
