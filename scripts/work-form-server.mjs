import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = path.join(root, "assets", "imported");
const worksDir = path.join(root, "works");
const port = Number(process.env.PORT || 4180);

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function toSlug(title) {
  const slug = title
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
  return slug || `work-${Date.now()}`;
}

function splitList(value = "") {
  return value
    .split(/[\n,、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function youtubeEmbed(urlText) {
  const value = urlText.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    let id = "";
    if (url.hostname.includes("youtu.be")) id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    if (url.hostname.includes("youtube.com") && url.pathname.startsWith("/watch")) id = url.searchParams.get("v") ?? "";
    if (url.hostname.includes("youtube.com") && url.pathname.startsWith("/embed/")) id = url.pathname.split("/").filter(Boolean).pop() ?? "";
    if (!id) return null;
    return {
      src: `https://www.youtube.com/embed/${id}`,
      watch: `https://www.youtube.com/watch?v=${id}`,
      width: 16,
      height: 9,
    };
  } catch {
    return null;
  }
}

function mediaType(filename) {
  const ext = path.extname(filename).toLowerCase();
  return [".mp4", ".mov", ".webm", ".m4v"].includes(ext) ? "video" : "image";
}

function mediaTag(media, title) {
  if (media.type === "video") {
    return `<video src="../${media.src}" aria-label="${escapeHtml(title)}の記録映像" muted loop playsinline controls></video>`;
  }
  return `<img src="../${media.src}" alt="${escapeHtml(title)}の記録写真" />`;
}

function detailTemplate(work) {
  const techItems = work.technologies.map((tech) => `<li>${escapeHtml(tech)}</li>`).join("");
  const paragraphs = work.description
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br />")}</p>`)
    .join("\n          ");
  const youtubeEmbeds = work.youtubeEmbeds
    .map(
      (video, index) => `<div class="detail-video" style="aspect-ratio: ${video.width} / ${video.height};"><iframe src="${video.src}" title="${escapeHtml(work.title)}の動画${work.youtubeEmbeds.length > 1 ? ` ${index + 1}` : ""}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>
          <a class="video-fallback" href="${video.watch}" target="_blank" rel="noreferrer">YouTubeで動画を開く</a>`
    )
    .join("\n          ");
  const gallery = work.gallery.map((media) => mediaTag(media, work.title)).join("\n            ");

  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(work.title)} | Shimizu Kaito</title>
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
          <h1>${escapeHtml(work.title)}</h1>
        </div>
        <div class="detail-media">
          <img class="detail-cover" src="../${work.cover}" alt="${escapeHtml(work.title)}の代表画像" />
          ${youtubeEmbeds}
        </div>
      </section>
      <section class="detail-stack">
        <div>
          <p class="eyebrow">Technology</p>
          <ul class="tech-list">${techItems}</ul>
        </div>
        <div class="detail-description">
          ${paragraphs || `<p>${escapeHtml(work.title)}の制作記録です。</p>`}
        </div>
        <div class="detail-gallery-shell" aria-label="作品写真">
          <div class="detail-gallery">
            ${gallery}
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

function workCard(work) {
  return `          <a class="work-card" href="works/${work.slug}.html" aria-label="${escapeHtml(work.title)}の詳細へ">
            <figure>
              <img src="${work.cover}" alt="${escapeHtml(work.title)}のサムネイル" />
            </figure>
            <div class="work-meta">
              <h3>${escapeHtml(work.title)}</h3>
              <time datetime="${escapeHtml(work.date)}">${escapeHtml(work.date)}</time>
            </div>
          </a>`;
}

async function addWorkToIndex(work) {
  const indexPath = path.join(root, "index.html");
  const html = await fs.readFile(indexPath, "utf-8");
  const marker = /(\s*<div class="work-grid">\n)/;
  if (!marker.test(html)) throw new Error("index.htmlのwork-gridが見つかりません。");
  const next = html.replace(marker, `$1${workCard(work)}\n\n`);
  await fs.writeFile(indexPath, next);
}

function parseMultipart(buffer, boundary) {
  const parts = [];
  const delimiter = Buffer.from(`--${boundary}`);
  let cursor = buffer.indexOf(delimiter);

  while (cursor !== -1) {
    const next = buffer.indexOf(delimiter, cursor + delimiter.length);
    if (next === -1) break;
    const part = buffer.subarray(cursor + delimiter.length + 2, next - 2);
    cursor = next;

    const headerEnd = part.indexOf(Buffer.from("\r\n\r\n"));
    if (headerEnd === -1) continue;
    const rawHeaders = part.subarray(0, headerEnd).toString("utf-8");
    const body = part.subarray(headerEnd + 4);
    const name = rawHeaders.match(/name="([^"]+)"/)?.[1];
    const filename = rawHeaders.match(/filename="([^"]*)"/)?.[1];
    if (!name) continue;
    parts.push({ name, filename, body });
  }

  return parts;
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function handleCreate(request, response) {
  const contentType = request.headers["content-type"] ?? "";
  const boundary = contentType.match(/boundary=(.+)$/)?.[1];
  if (!boundary) throw new Error("フォームデータを読み取れませんでした。");

  const parts = parseMultipart(await readBody(request), boundary);
  const fields = new Map();
  const files = [];

  for (const part of parts) {
    if (part.filename) {
      if (part.filename && part.body.length > 0) files.push(part);
    } else {
      fields.set(part.name, part.body.toString("utf-8").trim());
    }
  }

  const title = fields.get("title") ?? "";
  if (!title) throw new Error("タイトルを入力してください。");
  if (!files.length) throw new Error("画像を1枚以上選んでください。");

  const slug = toSlug(fields.get("slug") || title);
  const date = fields.get("date") || "2026.01";
  const technologies = splitList(fields.get("technologies") ?? "");
  const youtubeEmbeds = splitList(fields.get("youtube") ?? "").map(youtubeEmbed).filter(Boolean);
  const gallery = [];

  await fs.mkdir(assetsDir, { recursive: true });
  await fs.mkdir(worksDir, { recursive: true });

  for (const [index, file] of files.entries()) {
    const ext = path.extname(file.filename) || ".jpg";
    const filename = `${slug}-${index + 1}${ext}`;
    const destination = path.join(assetsDir, filename);
    await fs.writeFile(destination, file.body);
    gallery.push({ src: `assets/imported/${filename}`, type: mediaType(filename) });
  }

  const cover = gallery.find((media) => media.type === "image")?.src ?? gallery[0].src;
  const work = {
    title,
    slug,
    date,
    cover,
    gallery,
    technologies: technologies.length ? technologies : ["制作"],
    description: fields.get("description") ?? "",
    youtubeEmbeds,
  };

  const workPath = path.join(worksDir, `${slug}.html`);
  try {
    await fs.access(workPath);
    throw new Error(`works/${slug}.html は既に存在します。slugを変更してください。`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  await fs.writeFile(workPath, detailTemplate(work));
  await addWorkToIndex(work);

  const recordPath = path.join(root, "data", "manual-works.json");
  let records = [];
  try {
    records = JSON.parse(await fs.readFile(recordPath, "utf-8"));
  } catch {
    records = [];
  }
  records.unshift(work);
  await fs.writeFile(recordPath, `${JSON.stringify(records, null, 2)}\n`);

  sendHtml(
    response,
    `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>追加しました</title>${adminStyles()}</head><body><main><h1>追加しました</h1><p>${escapeHtml(title)} をWORKSに追加しました。</p><div class="actions"><a href="/works/${slug}.html">作品ページを見る</a><a href="/index.html#works">WORKSを見る</a><a href="/">続けて追加する</a></div></main></body></html>`
  );
}

function adminStyles() {
  return `<style>
    body { margin: 0; background: #f7f4ee; color: #17201f; font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic", sans-serif; line-height: 1.7; }
    main { margin: 0 auto; max-width: 860px; padding: 48px 20px 80px; }
    h1 { font-size: clamp(34px, 5vw, 64px); line-height: 1.05; margin: 0 0 28px; }
    form { display: grid; gap: 20px; }
    label { display: grid; gap: 8px; font-weight: 800; }
    input, textarea { border: 1px solid #ded9ce; border-radius: 8px; color: inherit; font: inherit; padding: 12px 14px; }
    textarea { min-height: 160px; resize: vertical; }
    small { color: #62706e; font-weight: 500; }
    button, .actions a { align-items: center; background: #0f766e; border: 0; border-radius: 8px; color: white; cursor: pointer; display: inline-flex; font-weight: 800; justify-content: center; min-height: 48px; padding: 0 18px; text-decoration: none; }
    .grid { display: grid; gap: 16px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
    @media (max-width: 680px) { .grid { grid-template-columns: 1fr; } }
  </style>`;
}

function adminPage() {
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>WORKS追加フォーム</title>
    ${adminStyles()}
  </head>
  <body>
    <main>
      <h1>WORKS追加フォーム</h1>
      <form action="/api/works" method="post" enctype="multipart/form-data">
        <div class="grid">
          <label>作品タイトル<input name="title" required placeholder="例: New Interaction Device" /></label>
          <label>年月<input name="date" required pattern="\\d{4}\\.\\d{2}" placeholder="2026.05" /></label>
        </div>
        <label>URL用の名前<small>空欄ならタイトルから自動生成します。英数字推奨。</small><input name="slug" placeholder="new-interaction-device" /></label>
        <label>使用技術<small>改行またはカンマ区切りで入力できます。</small><textarea name="technologies" placeholder="p5.js&#10;Arduino&#10;M5Stack"></textarea></label>
        <label>説明文<small>空行を入れると段落になります。</small><textarea name="description" placeholder="作品の概要、仕組み、展示情報など"></textarea></label>
        <label>YouTube URL<small>複数ある場合は改行で追加。ない場合は空欄でOKです。</small><textarea name="youtube" placeholder="https://www.youtube.com/watch?v=..."></textarea></label>
        <label>写真・動画<small>最初の画像がメイン写真になります。複数選択できます。</small><input name="media" type="file" accept="image/*,video/*" multiple required /></label>
        <button type="submit">WORKSに追加する</button>
      </form>
    </main>
  </body>
</html>`;
}

async function serveStatic(request, response) {
  const url = new URL(request.url, `http://127.0.0.1:${port}`);
  const target = path.normalize(decodeURIComponent(url.pathname)).replace(/^\/+/, "");
  const filePath = path.join(root, target || "index.html");
  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }
  const bytes = await fs.readFile(filePath);
  response.writeHead(200);
  response.end(bytes);
}

function sendHtml(response, html, status = 200) {
  response.writeHead(status, { "content-type": "text/html; charset=utf-8" });
  response.end(html);
}

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url === "/") {
      sendHtml(response, adminPage());
      return;
    }
    if (request.method === "POST" && request.url === "/api/works") {
      await handleCreate(request, response);
      return;
    }
    if (request.method === "GET") {
      await serveStatic(request, response);
      return;
    }
    response.writeHead(405);
    response.end("Method Not Allowed");
  } catch (error) {
    sendHtml(response, `<!doctype html><html lang="ja"><head><meta charset="utf-8">${adminStyles()}<title>エラー</title></head><body><main><h1>追加できませんでした</h1><p>${escapeHtml(error.message)}</p><div class="actions"><a href="/">フォームに戻る</a></div></main></body></html>`, 500);
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`WORKS form: http://127.0.0.1:${port}/`);
});
