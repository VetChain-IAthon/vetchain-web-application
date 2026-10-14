const PUBLIC_DOMAINS = new Set([
  "hotmail.com", "outlook.com", "live.com", "msn.com",
  "yahoo.com", "yahoo.es", "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com",
]);

export function publicSenderDomain(address: string): string | null {
  const domain = address.trim().toLowerCase().split("@").pop() ?? "";
  return PUBLIC_DOMAINS.has(domain) ? domain : null;
}

export function isGmailSender(address: string): boolean {
  const domain = address.trim().toLowerCase().split("@").pop();
  return domain === "gmail.com" || domain === "googlemail.com";
}
