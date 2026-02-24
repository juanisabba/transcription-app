export function getBearerToken(event: { headers?: Record<string, string | undefined> }): string | null {
  const auth = event.headers?.Authorization ?? event.headers?.authorization ?? "";
  if (!auth.startsWith("Bearer ")) {
    return null;
  }
  const token = auth.slice(7).trim();
  return token || null;
}
