"use client";
import { useState } from "react";

import FilesDashboard from "@/components/admin/filesDashboard";
import UsersDashboard from "@/components/admin/usersDashboard";
import SettingsDashboard from "@/components/admin/settingsDashboard";
import Sidebar from "@/components/admin/sidebar";

export default function AdminPage() {
  const [activePage, setActivePage] = useState<string>("users");

  return (
    <div className="flex ">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />

      {activePage === "users" && <UsersDashboard />}
      {activePage === "files" && <FilesDashboard />}
      {activePage === "settings" && <SettingsDashboard />}
    </div>
  );
}
