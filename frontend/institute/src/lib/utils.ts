export const formatLKR = (n: number) => new Intl.NumberFormat("si-LK", { style: "currency", currency: "LKR" }).format(n);
export const formatDate = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));
