export async function getJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`요청 실패 ${response.status}: ${url}`);
  }
  return (await response.json()) as T;
}
