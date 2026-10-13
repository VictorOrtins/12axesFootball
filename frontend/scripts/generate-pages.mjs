// Roda após o `vite build` e escreve direto em dist/: as cópias do index para
// as rotas do app (/br, /en, /240questions, /results), sitemap.xml e robots.txt.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(resolve(__dirname, '..'), 'dist');
const SITE = 'https://12axes.vercel.app';

function replaceBetween(html, startMarker, endMarker, replacement) {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start);
  if (start === -1 || end === -1) {
    throw new Error(`Marcador não encontrado no index.html: ${startMarker} … ${endMarker}`);
  }
  return html.slice(0, start) + replacement + html.slice(end);
}

// dist/en.html: cópia do index com o SEO em inglês e canonical próprio.
// dist/br.html: cópia fiel do index (o canonical continua apontando para /).
// O idioma forçado em ambos vem do caminho, resolvido pelo app.
function buildHomeVariants() {
  const index = readFileSync(join(DIST, 'index.html'), 'utf8');

  writeFileSync(join(DIST, 'br.html'), index);

  // results.html fica sem canonical/hreflang para que cada URL de resultado
  // compartilhado possa ser indexada individualmente.
  writeFileSync(join(DIST, '240questions.html'), index);
  const results = index
    .replace(/^\s*<link rel="canonical"[^\n]*\n/m, '')
    .replace(/^\s*<link rel="alternate" hreflang=[^\n]*\n/gm, '');
  writeFileSync(join(DIST, 'results.html'), results);

  const title = '12 Axes Football — Football Philosophy Quiz Across 12 Axes';
  const description =
    'Find your football philosophy across 12 axes: possession, pressing, structure, game plan, squad building and more. See which managers, teams and schools of play match you.';

  const enSeoBlock = `<!-- Primary SEO -->
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="author" content="12 Axes" />
    <meta name="application-name" content="12 Axes Football" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta name="language" content="English" />
    <link rel="canonical" href="${SITE}/en" />
    <link rel="alternate" hreflang="pt-BR" href="${SITE}/" />
    <link rel="alternate" hreflang="en" href="${SITE}/en" />
    <link rel="alternate" hreflang="x-default" href="${SITE}/en" />

    `;

  const enOgBlock = `<!-- Open Graph -->
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="12 Axes Football" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:url" content="${SITE}/en" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${SITE}/logo.png" />
    <meta property="og:image:width" content="512" />
    <meta property="og:image:height" content="512" />
    <meta property="og:image:alt" content="12 Axes Football logo" />

    `;

  const enTwitterBlock = `<!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${SITE}/logo.png" />

    `;

  const enJsonLdBlocks = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: '12 Axes Football',
      url: `${SITE}/en`,
      description,
      applicationCategory: 'EducationApplication',
      operatingSystem: 'Web',
      inLanguage: 'en',
      isAccessibleForFree: true,
      image: `${SITE}/logo.png`,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: '12 Axes Football',
      url: `${SITE}/en`,
      inLanguage: ['en', 'pt-BR']
    }
  ].map((block) => JSON.stringify(block));

  let en = index.replace('<html lang="pt-BR">', '<html lang="en">');
  en = replaceBetween(en, '<!-- Primary SEO -->', '<!-- Icons -->', enSeoBlock);
  en = replaceBetween(en, '<!-- Open Graph -->', '<!-- Twitter -->', enOgBlock);
  en = replaceBetween(en, '<!-- Twitter -->', '<style>', enTwitterBlock);
  // Troca apenas o conteúdo dos blocos ld+json, preservando os scripts do app que o Vite injeta no <head>.
  let ldIndex = 0;
  en = en.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, (block) =>
    ldIndex < enJsonLdBlocks.length
      ? `<script type="application/ld+json">${enJsonLdBlocks[ldIndex++]}</script>`
      : block
  );
  if (ldIndex !== enJsonLdBlocks.length) {
    throw new Error(`Esperava ${enJsonLdBlocks.length} blocos ld+json no index.html, encontrei ${ldIndex}`);
  }
  writeFileSync(join(DIST, 'en.html'), en);
}

buildHomeVariants();

const today = new Date().toISOString().slice(0, 10);
const sitemapUrls = ['/', '/en']
  .map((p) => `  <url><loc>${SITE}${p}</loc><lastmod>${today}</lastmod></url>`)
  .join('\n');
writeFileSync(
  join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls}\n</urlset>\n`
);

writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

console.log('Geradas br.html, en.html, 240questions.html, results.html + sitemap.xml + robots.txt em dist/');
