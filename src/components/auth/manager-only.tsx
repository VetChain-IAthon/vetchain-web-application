"use client";

import { Notice } from "@/components/data/notice";
import { useAuth } from "@/lib/auth";

/** El backend ya rechaza al vendedor (403); esto evita mostrarle una pantalla que no puede usar. */
export function ManagerOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== "manager") return <Notice>Esta sección es solo para gerencia comercial. Si necesitas cambiar algo aquí, pídeselo a tu gerente.</Notice>;
  return <>{children}</>;
}
