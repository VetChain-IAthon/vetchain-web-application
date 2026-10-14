import { ManagerOnly } from "@/components/auth/manager-only";
import { SettingsView } from "@/features/ajustes/settings-view";

export default function Page() {
  return <ManagerOnly><SettingsView /></ManagerOnly>;
}
