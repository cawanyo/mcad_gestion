// Convex wraps a thrown `Error("message")` from a query/mutation/action in
// noisy client-side text like "[Request ID: xyz] Server Error\nUncaught
// Error: <message>\n    at ...". The backend throws plain Errors (not
// ConvexError) with the actual French message meant for the end user, so
// this pulls just that line back out instead of showing the raw wrapper.
export function convexErrorMessage(e: unknown, fallback = 'Une erreur est survenue.'): string {
  if (e && typeof e === 'object' && 'data' in (e as any) && typeof (e as any).data === 'string') {
    return (e as any).data;
  }
  if (e instanceof Error) {
    const match = e.message.match(/Uncaught Error: ([^\n]+)/);
    if (match) return match[1].trim();
    if (!/Request ID|Server Error/.test(e.message)) return e.message;
  }
  return fallback;
}
