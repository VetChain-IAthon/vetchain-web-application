/**
 * Número de un cliente peruano en formato internacional (+51) para enlaces `tel:`.
 * Formatos que llegan del maestro de Defontana: celulares de 9 dígitos, fijos de Lima de 7 (código de área 1),
 * fijos con prefijo de larga distancia (01 7210378, 066-6428556), dos números en el mismo campo
 * («6712260 / 997519571») y algún número extranjero que ya trae su código (+34 …), que se respeta.
 * Devuelve null si no hay un número usable.
 */
export function peruPhone(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  // Un número extranjero ya trae su código: se respeta tal cual (solo el primero si hay varios).
  if (raw.trim().startsWith("+")) return `+${raw.trim().split(/[/,;]/)[0].replace(/\D/g, "")}`;
  // Si el campo trae dos números, se usa el primero.
  const first = raw.split(/[/,;]|\s{2,}|\s(?=\d{9}\b)/).map((part) => part.trim()).find((part) => /\d{6,}/.test(part.replace(/\D/g, "")));
  if (!first) return null;

  let digits = first.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("51")) return `+${digits}`;
  digits = digits.replace(/^0+/, ""); // prefijo de larga distancia nacional
  if (digits.length === 7) digits = `1${digits}`; // fijo de Lima sin código de área
  return digits.length >= 7 ? `+51${digits}` : null;
}

/** «+51 959 420 596» o «+51 1 4631792», para mostrar el número que se marcará. */
export function formatPeruPhone(phone: string): string {
  if (!phone.startsWith("+51")) return phone;
  const local = phone.slice(3);
  if (local.length === 9 && local.startsWith("9")) return `+51 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  if (local.startsWith("1")) return `+51 1 ${local.slice(1)}`;
  return `+51 ${local.slice(0, 2)} ${local.slice(2)}`;
}
