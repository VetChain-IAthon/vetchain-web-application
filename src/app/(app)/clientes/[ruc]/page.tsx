import { CustomerDetail } from "@/features/clientes/customer-detail";

export default async function Page({ params }: { params: Promise<{ ruc: string }> }) {
  const { ruc } = await params;
  return <CustomerDetail ruc={ruc} />;
}
