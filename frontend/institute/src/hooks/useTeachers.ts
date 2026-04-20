import useSWR from "swr";
import { api } from "@/lib/api";
const fetcher = (url: string) => api.get(url).then(r => r.data);
export function useTeachers() {
  const { data, error, isLoading, mutate } = useSWR("/api/academics/teachers/", fetcher);
  return { data, isLoading, error, mutate };
}
