import useSWR from "swr";
import { api } from "@/lib/api";
const fetcher = (url: string) => api.get(url).then(r => r.data);
export function useIncome() {
  const { data, error, isLoading, mutate } = useSWR("/api/admin/billing/income-summary/", fetcher);
  return { data, isLoading, error, mutate };
}
