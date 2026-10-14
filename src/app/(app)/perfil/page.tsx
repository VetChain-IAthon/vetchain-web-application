import { PageHeader } from "@/components/layout/page-header";
import { ProfileView } from "@/features/perfil/profile-view";
import { screen } from "@/config/screens";

export default function Page() {
  const s = screen("perfil");
  return (
    <>
      <PageHeader title={s.title} subtitle={s.subtitle} origin={s.origin} />
      <ProfileView />
    </>
  );
}
