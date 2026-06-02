export interface YearbookEvent {
  id: string;
  title: string;
  type: string;
  startsAt: string;
  hasAlbum: boolean;
}

export interface YearbookPhoto {
  id: string;
  url: string;
  caption: string | null;
  createdAt: string;
}

export interface YearbookSection {
  id: string;
  sectionType: string;
  title: string;
  body: string | null;
  personName: string | null;
  imageUrl: string | null;
}

export interface YearbookExportData {
  orgName: string;
  generatedAt: string;
  eventCount: number;
  photoCount: number;
  events: YearbookEvent[];
  photos: YearbookPhoto[];
  sections?: YearbookSection[];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildYearbookHtml(data: YearbookExportData): string {
  const title = `${data.orgName} — Digital Yearbook`;
  const eventsHtml = data.events.map((e) => `
    <article class="event">
      <h3>${escapeHtml(e.title)}</h3>
      <p class="meta">${escapeHtml(new Date(e.startsAt).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" }))} · ${escapeHtml(e.type.replace(/_/g, " "))}${e.hasAlbum ? " · 📸 Album linked" : ""}</p>
    </article>
  `).join("");

  const sectionsHtml = (data.sections ?? []).map((s) => `
    <article class="yearbook-section">
      <p class="section-type">${escapeHtml(s.sectionType.replace(/_/g, " "))}</p>
      <h3>${escapeHtml(s.title)}</h3>
      ${s.personName ? `<p class="person">${escapeHtml(s.personName)}</p>` : ""}
      ${s.body ? `<p class="body">${escapeHtml(s.body)}</p>` : ""}
      ${s.imageUrl ? `<img src="${escapeHtml(s.imageUrl)}" alt="" class="section-img" loading="lazy" />` : ""}
    </article>
  `).join("");

  const photosHtml = data.photos.map((p) => `
    <figure class="photo">
      <img src="${escapeHtml(p.url)}" alt="${escapeHtml(p.caption ?? "Chapter memory")}" loading="lazy" />
      ${p.caption ? `<figcaption>${escapeHtml(p.caption)}</figcaption>` : ""}
    </figure>
  `).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Georgia, "Times New Roman", serif; background: #faf9f7; color: #1a1a1a; line-height: 1.6; }
    header { background: linear-gradient(135deg, #059669, #065f46); color: white; padding: 3rem 2rem; text-align: center; }
    header h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    header p { opacity: 0.9; font-size: 0.95rem; }
    .stats { display: flex; justify-content: center; gap: 2rem; margin-top: 1.5rem; flex-wrap: wrap; }
    .stat { text-align: center; }
    .stat strong { display: block; font-size: 1.75rem; }
    .stat span { font-size: 0.8rem; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.05em; }
    main { max-width: 960px; margin: 0 auto; padding: 2rem 1.5rem 4rem; }
    section { margin-bottom: 3rem; }
    section h2 { font-size: 1.5rem; margin-bottom: 1.25rem; padding-bottom: 0.5rem; border-bottom: 2px solid #059669; color: #065f46; }
    .event { padding: 1rem 0; border-bottom: 1px solid #e5e5e5; }
    .event h3 { font-size: 1.1rem; margin-bottom: 0.25rem; }
    .event .meta { font-size: 0.85rem; color: #666; }
    .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
    .photo { break-inside: avoid; }
    .photo img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .photo figcaption { font-size: 0.8rem; color: #555; margin-top: 0.35rem; padding: 0 0.25rem; }
    .yearbook-section { padding: 1.25rem 0; border-bottom: 1px solid #e5e5e5; }
    .yearbook-section .section-type { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.08em; color: #059669; margin-bottom: 0.25rem; }
    .yearbook-section .person { font-weight: 600; color: #065f46; margin: 0.25rem 0; }
    .yearbook-section .body { margin-top: 0.5rem; white-space: pre-wrap; }
    .yearbook-section .section-img { max-width: 280px; border-radius: 8px; margin-top: 0.75rem; }
    footer { text-align: center; padding: 2rem; font-size: 0.8rem; color: #888; border-top: 1px solid #e5e5e5; }
    @media print { header { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .photo img { box-shadow: none; } }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(data.orgName)}</h1>
    <p>Digital Yearbook · Semester Recap</p>
    <div class="stats">
      <div class="stat"><strong>${data.eventCount}</strong><span>Events</span></div>
      <div class="stat"><strong>${data.photoCount}</strong><span>Photos</span></div>
    </div>
  </header>
  <main>
    ${(data.sections ?? []).length > 0 ? `<section><h2>Seniors, Awards & Messages</h2>${sectionsHtml}</section>` : ""}
    ${data.events.length > 0 ? `<section><h2>Semester Timeline</h2>${eventsHtml}</section>` : ""}
    ${data.photos.length > 0 ? `<section><h2>Highlight Reel</h2><div class="gallery">${photosHtml}</div></section>` : ""}
    ${data.events.length === 0 && data.photos.length === 0 && !(data.sections ?? []).length ? "<p>Your yearbook is empty — add events and approved photos in TouseOS Social.</p>" : ""}
  </main>
  <footer>Generated by TouseOS on ${escapeHtml(new Date(data.generatedAt).toLocaleString())} · Print this page or save as PDF from your browser</footer>
</body>
</html>`;
}

export function downloadYearbookHtml(data: YearbookExportData): void {
  const html = buildYearbookHtml(data);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.orgName.toLowerCase().replace(/\s+/g, "-")}-yearbook.html`;
  a.click();
  URL.revokeObjectURL(url);
}
