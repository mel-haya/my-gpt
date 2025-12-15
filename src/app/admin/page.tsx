"use client";
import { useState } from "react";

import FilesDashboard from "@/components/admin/filesDashboard";
import Sidebar from "@/components/admin/sidebar";

export default function AdminPage() {
  const [activePage, setActivePage] = useState<string>("users");

  return (
    <div className="flex ">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />

      {activePage === "files" && <FilesDashboard />}
    </div>
  );
}
