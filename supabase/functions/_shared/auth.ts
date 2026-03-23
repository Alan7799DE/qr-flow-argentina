/**
 * Timing-safe string comparison to prevent timing attacks on secret comparison.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  if (bufA.length !== bufB.length) return false;
  let result = 0;
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i] ^ bufB[i];
  }
  return result === 0;
}

/**
 * Verifies that the bearer token matches either the CRON_SECRET or SUPABASE_SERVICE_ROLE_KEY.
 */
export function verifyCronAuth(bearerToken: string | undefined): boolean {
  if (!bearerToken) return false;
  const cronSecret = Deno.env.get("CRON_SECRET");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  return (
    (!!cronSecret && timingSafeEqual(bearerToken, cronSecret)) ||
    (!!serviceRoleKey && timingSafeEqual(bearerToken, serviceRoleKey))
  );
}
