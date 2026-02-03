import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { checkRoles, getUserHotelId } from "@/lib/checkRole";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getUserById } from "@/services/userService";
import { Roles } from "@/types/globals";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const user = await getUserById(userId);
  const userRole = user?.role as Roles | null;

  // Admin should go to /admin
  if (userRole === "admin") {
    redirect("/admin");
  }

  // Only hotel_owner and hotel_staff can access dashboard
  const hasAccess = await checkRoles(["hotel_owner", "hotel_staff"]);
  if (!hasAccess) {
    redirect("/");
  }

  // Must have a hotel assigned
  const hotelId = await getUserHotelId();
  if (!hotelId) {
    redirect("/");
  }

  return (
    <div className="flex h-screen">
      <DashboardSidebar userRole={userRole as "hotel_owner" | "hotel_staff"} />
      <div className="flex-1 overflow-y-auto">{children}</div>
      <ToastContainer autoClose={3000} theme="dark" pauseOnHover={false} />
    </div>
  );
}
