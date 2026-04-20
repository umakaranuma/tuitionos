import useSWR from "swr";
import { api } from "@/lib/api";
const fetcher = (url: string) => api.get(url).then(r => r.data);
export function useSubjects() {
  const { data, error, isLoading, mutate } = useSWR("/api/academics/subjects/", fetcher);
  return { data, isLoading, error, mutate };
}
