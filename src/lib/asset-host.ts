// Resolve CMS asset paths without relying on a platform-specific CDN.
export function resolveAssetUrl(value?: string): string {
  return value || '';
}
