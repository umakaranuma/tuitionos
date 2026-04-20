import useSWR from "swr";
import { api } from "@/lib/api";
const fetcher = (url: string) => api.get(url).then(r => r.data);
export function useNotifications() {
  const { data, error, isLoading, mutate } = useSWR("/api/notifications/", fetcher);
  return { data, isLoading, error, mutate };
}
