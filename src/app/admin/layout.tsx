"use client";

import Sidebar from "@/components/admin/sidebar";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <Sidebar />
      {children}
      <ToastContainer autoClose={3000} theme="dark" pauseOnHover={false} />
    </div>
  );
}