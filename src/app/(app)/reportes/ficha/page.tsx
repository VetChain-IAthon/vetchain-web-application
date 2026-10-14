import { Suspense } from "react";
import { CustomerBriefPage } from "@/features/reportes/customer-brief";

export default function Page() {
  return <Suspense><CustomerBriefPage /></Suspense>;
}
