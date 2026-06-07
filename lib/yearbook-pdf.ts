import { PDFDocument, StandardFonts, rgb, type PDFPage } from "pdf-lib";
import type { YearbookExportData } from "@/lib/yearbook-export";

const MARGIN = 50;
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const MAX_PHOTOS = 16;

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function embedPhoto(
  pdfDoc: PDFDocument,
  url: string,
): Promise<Awaited<ReturnType<PDFDocument["embedJpg"]>> | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    const type = res.headers.get("content-type") ?? "";
    if (type.includes("png")) return pdfDoc.embedPng(bytes);
    return pdfDoc.embedJpg(bytes);
  } catch {
    return null;
  }
}

function addPageHeader(page: PDFPage, title: string, font: Awaited<ReturnType<PDFDocument["embedFont"]>>) {
  page.drawText(title, {
    x: MARGIN,
    y: PAGE_HEIGHT - MARGIN,
    size: 16,
    font,
    color: rgb(0.02, 0.37, 0.27),
  });
  page.drawLine({
    start: { x: MARGIN, y: PAGE_HEIGHT - MARGIN - 8 },
    end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - MARGIN - 8 },
    thickness: 1,
    color: rgb(0.02, 0.37, 0.27),
  });
}

export async function buildYearbookPdf(data: YearbookExportData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const cover = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  cover.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 220,
    width: PAGE_WIDTH,
    height: 220,
    color: rgb(0.02, 0.6, 0.41),
  });
  cover.drawText(data.orgName, {
    x: MARGIN,
    y: PAGE_HEIGHT - 120,
    size: 28,
    font: fontBold,
    color: rgb(1, 1, 1),
    maxWidth: CONTENT_WIDTH,
  });
  cover.drawText("Digital Yearbook", {
    x: MARGIN,
    y: PAGE_HEIGHT - 155,
    size: 14,
    font,
    color: rgb(0.9, 1, 0.95),
  });
  cover.drawText(`${data.eventCount} events · ${data.photoCount} photos`, {
    x: MARGIN,
    y: PAGE_HEIGHT - 280,
    size: 12,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });
  cover.drawText(`Generated ${new Date(data.generatedAt).toLocaleString()}`, {
    x: MARGIN,
    y: 60,
    size: 9,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  if ((data.sections ?? []).length > 0) {
    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    addPageHeader(page, "Seniors, Awards & Messages", fontBold);
    let y = PAGE_HEIGHT - MARGIN - 36;

    for (const s of data.sections ?? []) {
      const block = [
        s.sectionType.replace(/_/g, " ").toUpperCase(),
        s.title,
        s.personName ?? "",
        s.body ?? "",
      ]
        .filter(Boolean)
        .join("\n");
      const lines = wrapText(block, 72);
      const needed = lines.length * 14 + 20;
      if (y - needed < MARGIN) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        addPageHeader(page, "Seniors, Awards & Messages (cont.)", fontBold);
        y = PAGE_HEIGHT - MARGIN - 36;
      }
      for (const line of lines) {
        page.drawText(line, { x: MARGIN, y, size: 11, font, maxWidth: CONTENT_WIDTH });
        y -= 14;
      }
      y -= 10;
    }
  }

  if (data.events.length > 0) {
    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    addPageHeader(page, "Semester Timeline", fontBold);
    let y = PAGE_HEIGHT - MARGIN - 36;

    for (const e of data.events) {
      const date = new Date(e.startsAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const line = `${date} — ${e.title} (${e.type.replace(/_/g, " ")})${e.hasAlbum ? " [album]" : ""}`;
      const lines = wrapText(line, 80);
      if (y - lines.length * 14 < MARGIN) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        addPageHeader(page, "Semester Timeline (cont.)", fontBold);
        y = PAGE_HEIGHT - MARGIN - 36;
      }
      for (const l of lines) {
        page.drawText(l, { x: MARGIN, y, size: 10, font, maxWidth: CONTENT_WIDTH });
        y -= 14;
      }
    }
  }

  const photos = data.photos.slice(0, MAX_PHOTOS);
  if (photos.length > 0) {
    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let headerTitle = "Highlight Reel";
    addPageHeader(page, headerTitle, fontBold);
    const thumb = 110;
    const gap = 12;
    let col = 0;
    let cursorY = PAGE_HEIGHT - MARGIN - 50;

    const newPhotoPage = () => {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      headerTitle = "Highlight Reel (cont.)";
      addPageHeader(page, headerTitle, fontBold);
      col = 0;
      cursorY = PAGE_HEIGHT - MARGIN - 50;
    };

    for (const p of photos) {
      const image = await embedPhoto(pdfDoc, p.url);
      if (!image) continue;

      const scale = Math.min(thumb / image.width, thumb / image.height);
      const w = image.width * scale;
      const h = image.height * scale;
      const rowHeight = thumb + 22;

      if (cursorY - rowHeight < MARGIN + 40) newPhotoPage();

      const x = MARGIN + col * (thumb + gap);
      const drawY = cursorY - h;
      page.drawImage(image, { x, y: drawY, width: w, height: h });
      if (p.caption) {
        const cap = p.caption.length > 28 ? `${p.caption.slice(0, 25)}…` : p.caption;
        page.drawText(cap, { x, y: drawY - 12, size: 7, font, maxWidth: thumb });
      }

      col += 1;
      if (col >= 4) {
        col = 0;
        cursorY -= rowHeight;
      }
    }
  }

  if (
    data.events.length === 0
    && data.photos.length === 0
    && !(data.sections ?? []).length
  ) {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawText("Your yearbook is empty — add events and approved photos in TouseOS.", {
      x: MARGIN,
      y: PAGE_HEIGHT / 2,
      size: 12,
      font,
      maxWidth: CONTENT_WIDTH,
    });
  }

  return pdfDoc.save();
}
