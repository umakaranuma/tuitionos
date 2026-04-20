import useSWR from "swr";
import { api } from "@/lib/api";
const fetcher = (url: string) => api.get(url).then(r => r.data);
export function useAlerts() {
  const { data, error, isLoading, mutate } = useSWR("/api/admin/alerts/", fetcher);
  return { data, isLoading, error, mutate };
}
