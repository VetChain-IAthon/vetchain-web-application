import { redirect } from "next/navigation";

/** El pronóstico por producto vive dentro de Stock y merma. */
export default function Page() {
  redirect("/reportes/stock#pronostico");
}
