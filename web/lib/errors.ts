export function formatUnknownError(e: unknown): string {
  if (typeof e === 'string') return e;

  // Supabase errors are often plain objects with a `message` field.
  if (e && typeof e === 'object' && 'message' in e) {
    const msg = (e as any).message;
    if (typeof msg === 'string' && msg.trim()) return msg;
  }

  if (e instanceof Error) {
    return e.message || e.name || 'Unknown error';
  }

  try {
    // Include non-enumerable Error fields (message/stack) when present.
    const props = e && typeof e === 'object' ? Object.getOwnPropertyNames(e) : [];
    return JSON.stringify(e, props.length ? props : undefined);
  } catch {
    return String(e);
  }
}

