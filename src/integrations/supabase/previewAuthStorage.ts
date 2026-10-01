// Storage adapter for external hosting and local development.
// Kept as a small function for compatibility with the generated Supabase client.
export function brokeredPreviewStorage(): Storage | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.localStorage;
}
