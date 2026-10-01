// Os assets .asset.json guardam caminhos relativos servidos pelo CDN do Lovable
// (/__l5e/assets-v1/...). Fora do dominio *.lovable.app esses caminhos nao existem,
// entao precisam ser apontados para o host que realmente serve os arquivos.
export const LOVABLE_ASSET_HOST = 'https://coworking-013.lovable.app';

const LOVABLE_ASSET_PREFIX = '/__l5e/assets-v1/';

export function resolveAssetUrl(value?: string): string {
  if (!value) return '';
  if (!value.startsWith(LOVABLE_ASSET_PREFIX)) return value;
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  if (host.endsWith('.lovable.app')) return value;
  return `${LOVABLE_ASSET_HOST}${value}`;
}
