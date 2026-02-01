import Sidebar from "@/components/admin/sidebar";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { checkRole } from "@/lib/checkRole";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAdmin = await checkRole("admin");

  if (!isAdmin) {
    redirect("/");
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">{children}</div>
      <ToastContainer autoClose={3000} theme="dark" pauseOnHover={false} />
    </div>
  );
}
