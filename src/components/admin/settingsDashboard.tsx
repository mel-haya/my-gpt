import { getSystemPrompt } from "@/services/settingsService";
import SettingsForm from "./SettingsForm";

export default async function SettingsDashboard() {
  const systemPrompt = await getSystemPrompt();

  return (
    <div className="flex-1 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Configure system-wide settings and preferences.
          </p>
        </div>

        <SettingsForm initialSystemPrompt={systemPrompt} />
      </div>
    </div>
  );
}