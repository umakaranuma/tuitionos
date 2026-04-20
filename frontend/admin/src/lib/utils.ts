export const formatLKR = (n: number) => new Intl.NumberFormat("si-LK", { style: "currency", currency: "LKR" }).format(n);
export const formatDate = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));
export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
