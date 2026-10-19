/**
 * Canonical Application URL & Embed Code Generator
 * Resolves the active deployment URL automatically across Vercel,
 * preview environments, and local development without requiring custom domains.
 */

export function getAppUrl(): string {
  if (typeof window !== 'undefined') {
    const custom = (import.meta as any).env?.VITE_APP_URL;
    if (custom && custom.trim() && !custom.includes('MY_APP_URL')) {
      return custom.replace(/\/$/, '');
    }
    return window.location.origin;
  }
  return (import.meta as any).env?.VITE_APP_URL || '';
}

export const APP_URL =
  typeof window !== 'undefined'
    ? ((import.meta as any).env?.VITE_APP_URL && !(import.meta as any).env?.VITE_APP_URL.includes('MY_APP_URL')
        ? (import.meta as any).env?.VITE_APP_URL.replace(/\/$/, '')
        : window.location.origin)
    : '';

/**
 * Generates the public standalone chat page URL
 * Example: https://my-deployment.vercel.app/chat/support-bot
 */
export function generateStandaloneUrl(slug: string): string {
  const base = getAppUrl();
  return `${base}/chat/${encodeURIComponent(slug.trim())}`;
}

/**
 * Generates the embeddable chat widget script
 * Loads from external websites using the canonical Vercel deployment host.
 */
export function generateWidgetEmbedCode(slug: string): string {
  const base = getAppUrl();
  const cleanSlug = slug.trim();
  return `<script src="${base}/widget.js"></script>
<script>
SelectBot.init({
  slug: "${cleanSlug}"
});
</script>`;
}
