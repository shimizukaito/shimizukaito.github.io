import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceBase = "https://shimizukaito.github.io/";
const outputImageDir = path.join(root, "assets", "imported");
const worksDir = path.join(root, "works");
const manualWorksPath = path.join(root, "data", "manual-works.json");
const displayDates = {
  "mealody-plate": "2025.05",
  m5arcade: "2025.04",
  "meisei-clossing": "2024.07",
  "highly-explosive": "2024.07",
  "robotic-drum-machine": "2024.06",
  "twisted-band-display": "2024.03",
  stoolws: "2023.12",
  snowflake: "2023.08",
  "conecting-past-spase": "2023.08",
  "sounds-drop": "2023.07",
  "voice-flower": "2023.06",
  korekuraidecice: "2022.12",
  ywine: "2021.12",
  "maze-generator": "2021.07",
  "works-furtoblue": "2020.12",
};

const textDecoder = new TextDecoder("utf-8");

async function fetchBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

async function fetchText(url) {
  return textDecoder.decode(await fetchBuffer(url));
}

function cleanText(value = "") {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function matchFirst(html, pattern) {
  return html.match(pattern)?.[1]?.trim() ?? "";
}

function toSlug(title, fallback = "work") {
  const slug = title
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();

  if (slug) return slug;
  return fallback
    .normalize("NFKD")
    .replace(/\.[^.]+$/, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function extFromUrl(url) {
  const pathname = new URL(url).pathname;
  const ext = path.extname(pathname);
  return ext || ".jpg";
}

function mediaTypeFromPath(src) {
  const ext = path.extname(new URL(src, sourceBase).pathname).toLowerCase();
  if ([".mp4", ".mov", ".webm", ".m4v"].includes(ext)) return "video";
  return "image";
}

function resolveSourceUrl(baseUrl, relativePath) {
  return new URL(relativePath.replaceAll(" ", "%20"), baseUrl).href;
}

async function downloadImage(url, filenameBase) {
  const ext = extFromUrl(url);
  const safeName = `${filenameBase}${ext}`;
  const destination = path.join(outputImageDir, safeName);
  const bytes = await fetchBuffer(url);
  await fs.writeFile(destination, bytes);
  return `assets/imported/${safeName}`;
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function stripHtmlComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, "");
}

function extractMediaPaths(detailHtml) {
  const contentBlocks = [
    ...detailHtml.matchAll(/<div class="works-img">([\s\S]*?)<\/div>/gi),
    ...detailHtml.matchAll(/<div class="works-main">([\s\S]*?)<\/div>/gi),
  ].map((match) => match[1]);
  const source = contentBlocks.length ? contentBlocks.join("\n") : detailHtml;
  const srcMatches = [
    ...source.matchAll(/<(?:img|source|video)\b[^>]*(?:src|data-src)="([^"]+)"/gi),
    ...source.matchAll(/background-image:\s*url\((['"]?)(.*?)\1\)/gi),
  ];

  return uniqueValues(
    srcMatches
      .map((match) => match[1] || match[2])
      .filter((src) => !/^https?:\/\/(?:www\.)?youtube\.com/i.test(src))
      .filter((src) => !/^(?:#|mailto:|javascript:)/i.test(src))
      .filter((src) => /\.(?:jpe?g|png|gif|webp|svg|mp4|mov|webm|m4v)(?:[?#].*)?$/i.test(src))
      .filter((src) => !/logo|icon|favicon/i.test(src))
  );
}

function mediaTag(media, work) {
  if (media.type === "video") {
    return `<video src="../${media.src}" aria-label="${work.title}の記録映像" muted loop playsinline controls></video>`;
  }

  return `<img src="../${media.src}" alt="${work.title}の記録写真" />`;
}

function youtubeWatchUrl(embedUrl) {
  if (!embedUrl) return "";
  const url = new URL(embedUrl);
  const id = url.pathname.split("/").filter(Boolean).pop();
  return id ? `https://www.youtube.com/watch?v=${id}` : embedUrl;
}

function extractYoutubeEmbeds(detailHtml) {
  const embeds = [];
  const seen = new Set();

  for (const match of detailHtml.matchAll(/<iframe\b([^>]*)>/gi)) {
    const attributes = match[1];
    const src = matchFirst(attributes, /\bsrc="([^"]+)"/i);
    if (!src || !/youtube\.com\/embed\//i.test(src)) continue;
    if (seen.has(src)) continue;
    seen.add(src);

    const width = Number(matchFirst(attributes, /\bwidth="(\d+)"/i)) || 16;
    const height = Number(matchFirst(attributes, /\bheight="(\d+)"/i)) || 9;
    const title = cleanText(matchFirst(attributes, /\btitle="([^"]+)"/i));
    embeds.push({ src, width, height, title });
  }

  return embeds;
}

function detailTemplate(work) {
  const techItems = work.technologies.map((tech) => `<li>${tech}</li>`).join("");
  const galleryImages = work.gallery
    .map((media) => mediaTag(media, work))
    .join("\n            ");
  const cover = work.gallery.find((media) => media.type === "image")?.src ?? work.cover;
  const youtubeEmbeds = work.youtubeEmbeds ?? [];
  const videoEmbed = youtubeEmbeds
    .map((video, index) => {
      const title = video.title || `${work.title}の動画${youtubeEmbeds.length > 1 ? ` ${index + 1}` : ""}`;
      return `<div class="detail-video" style="aspect-ratio: ${video.width} / ${video.height};"><iframe src="${video.src}" title="${title}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>
          <a class="video-fallback" href="${youtubeWatchUrl(video.src)}" target="_blank" rel="noreferrer">YouTubeで動画を開く</a>`;
    })
    .join("\n          ");
  const paragraphs = work.description
    .split("\n\n")
    .map((paragraph) => `<p>${paragraph}</p>`)
    .join("\n          ");

  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${work.title} | Shimizu Kaito</title>
    <link rel="stylesheet" href="../styles.css?v=detail-layout-2" />
  </head>
  <body>
    <header class="site-header">
      <a class="brand" href="../index.html#top"><span class="brand-mark"><img src="../assets/astronaut.ico" alt="" /></span><span>Shimizu Kaito</span></a>
      <nav class="nav" aria-label="主要ナビゲーション">
        <a href="../index.html#works">Works</a>
        <a href="../about.html#about">About</a>
        <a href="../about.html#achievements">Achievements</a>
        <a href="../index.html#contact">Contact</a>
      </nav>
    </header>
    <main class="work-detail">
      <a class="back-link" href="../index.html#works">← Worksへ戻る</a>
      <section class="detail-hero">
        <div class="detail-title">
          <h1>${work.title}</h1>
        </div>
        <div class="detail-media">
          <img class="detail-cover" src="../${cover}" alt="${work.title}の代表画像" />
          ${videoEmbed}
        </div>
      </section>
      <section class="detail-stack">
        <div>
          <p class="eyebrow">Technology</p>
          <ul class="tech-list">${techItems}</ul>
        </div>
        <div class="detail-description">
          ${paragraphs}
        </div>
        <div class="detail-gallery-shell" aria-label="作品写真">
          <div class="detail-gallery">
            ${galleryImages}
          </div>
        </div>
      </section>
    </main>
    <footer class="footer"><span>© 2026 Shimizu Kaito</span><button class="theme-toggle" type="button" aria-label="テーマを切り替える">◐</button></footer>
    <script src="../script.js?v=detail-layout-2"></script>
  </body>
</html>
`;
}

function worksGridTemplate(works) {
  return `<div class="work-grid">
${works
  .map(
    (work) => `          <a class="work-card" href="works/${work.slug}.html" aria-label="${work.title}の詳細へ">
            <figure>
              <img src="${work.cover}" alt="${work.title}のサムネイル" />
            </figure>
            <div class="work-meta">
              <h3>${work.title}</h3>
              <time datetime="${work.dateDisplay}">${work.dateDisplay}</time>
            </div>
          </a>`
  )
  .join("\n\n")}
        </div>`;
}

function replaceWorksGrid(indexHtml, works) {
  return indexHtml.replace(/<div class="work-grid">[\s\S]*?<\/div>\s*<\/section>/, `${worksGridTemplate(works)}
      </section>`);
}

async function main() {
  await fs.mkdir(outputImageDir, { recursive: true });
  await fs.mkdir(worksDir, { recursive: true });

  const indexHtml = await fetchText(sourceBase);
  const itemPattern =
    /<div class="item">\s*<a href="([^"]+)">\s*<figure>\s*<img src="([^"]+)" alt="([^"]*)">\s*<figcaption>\s*<h3>([\s\S]*?)<\/h3>\s*<span class="year">(\d{4})<\/span>/g;

  const works = [];
  for (const match of indexHtml.matchAll(itemPattern)) {
    const [, href, coverPath, , rawTitle, year] = match;
    const title = cleanText(rawTitle);
    const detailUrl = resolveSourceUrl(sourceBase, href);
    const detailHtml = await fetchText(detailUrl);
    const visibleDetailHtml = stripHtmlComments(detailHtml);
    const titleFromDetail = cleanText(matchFirst(visibleDetailHtml, /<div class="works-name">([\s\S]*?)<\/div>/i)) || title;
    const finalTitle = titleFromDetail === "Melody Plate" && title === "Mealody Plate" ? "Mealody Plate" : titleFromDetail;
    const hrefBase = decodeURIComponent(href.split("/").pop() ?? "work");
    const detailSlug = toSlug(finalTitle, hrefBase);
    const detailBase = detailUrl.replace(/[^/]+$/, "");
    const technologyBlock = matchFirst(visibleDetailHtml, /<div class="works-technology">([\s\S]*?)<\/div>\s*<hr/i);
    const technologies = [...technologyBlock.matchAll(/<div class="tag">([\s\S]*?)<\/div>/gi)]
      .map((tagMatch) => cleanText(tagMatch[1]).replace(/^-\s*/, ""))
      .filter(Boolean);
    const infoBlock = matchFirst(visibleDetailHtml, /<div class="works-info">([\s\S]*?)<\/div>/i);
    const description = cleanText(infoBlock) || `${finalTitle}の制作記録です。`;
    const summary = description.split("\n\n")[0]?.slice(0, 120) || `${finalTitle}の制作記録です。`;
    const imagePaths = extractMediaPaths(visibleDetailHtml);
    const youtubeEmbeds = extractYoutubeEmbeds(visibleDetailHtml);

    const cover = await downloadImage(resolveSourceUrl(sourceBase, coverPath), `${detailSlug}-cover`);
    const gallery = [];
    for (const [index, imagePath] of imagePaths.entries()) {
      try {
        const mediaUrl = resolveSourceUrl(detailBase, imagePath);
        gallery.push({
          src: await downloadImage(mediaUrl, `${detailSlug}-${index + 1}`),
          type: mediaTypeFromPath(mediaUrl),
        });
      } catch {
        // Some old paths are brittle; the cover still keeps the work visible.
      }
    }

    works.push({
      title: finalTitle,
      slug: detailSlug,
      year,
      dateDisplay: displayDates[detailSlug] ?? `${year}.01`,
      category: title,
      cover,
      gallery: gallery.length ? gallery : [{ src: cover, type: "image" }],
      technologies: technologies.length ? technologies : ["制作"],
      summary,
      description,
      youtubeEmbeds,
      sourceUrl: detailUrl,
    });
  }

  await fs.writeFile(path.join(root, "data", "imported-works.json"), `${JSON.stringify(works, null, 2)}\n`);

  for (const work of works) {
    await fs.writeFile(path.join(worksDir, `${work.slug}.html`), detailTemplate(work));
  }

  let manualWorks = [];
  try {
    manualWorks = JSON.parse(await fs.readFile(manualWorksPath, "utf-8"));
  } catch {
    manualWorks = [];
  }

  const localIndexPath = path.join(root, "index.html");
  const localIndex = await fs.readFile(localIndexPath, "utf-8");
  await fs.writeFile(localIndexPath, replaceWorksGrid(localIndex, [...manualWorks, ...works]));

  console.log(`Imported ${works.length} works. Preserved ${manualWorks.length} manual works.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
