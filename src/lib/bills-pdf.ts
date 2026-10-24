export type Bill = {
  id: string;
  bill_title: string;
  name: string;
  amount: number;
  bill_date: string;
  image_base64: string;
  created_at: string;
};

export const formatLKR = (n: number) =>
  "LKR " + n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function imageSize(src: string) {
  return new Promise<{ w: number; h: number }>((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 0, h: 0 });
    img.src = src;
  });
}

// Re-encode any image as JPEG so jsPDF can embed it (handles webp/gif etc.)
function toJpeg(src: string) {
  return new Promise<string | null>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function generateBillsPdf(bills: Bill[]) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const m = 14;
  const total = bills.reduce((s, b) => s + Number(b.amount), 0);

  doc.setFont("helvetica", "bold").setFontSize(18).text("Bill Report", m, 20);
  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.text(`Report date: ${new Date().toLocaleString()}`, m, 28);
  doc.text(`Total bills: ${bills.length}`, m, 34);
  doc.text(`Total amount: ${formatLKR(total)}`, m, 40);

  autoTable(doc, {
    startY: 46,
    head: [["#", "Title", "Name", "Date", "Amount"]],
    body: bills.map((b, i) => [String(i + 1), b.bill_title, b.name, b.bill_date, formatLKR(Number(b.amount))]),
    foot: [["", "", "", "Total", formatLKR(total)]],
    theme: "grid",
    headStyles: { fillColor: [33, 37, 41] },
    footStyles: { fillColor: [233, 236, 239], textColor: 20, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 10 }, 4: { halign: "right" } },
    styles: { fontSize: 9 },
    margin: { left: m, right: m },
  });

  // Detail section: one block per bill with embedded image
  doc.addPage();
  let y = m + 4;
  doc.setFont("helvetica", "bold").setFontSize(14).text("Bill Details", m, y);
  y += 8;
  const maxImgW = 80;
  const maxImgH = 90;

  for (let i = 0; i < bills.length; i++) {
    const b = bills[i];
    const jpeg = await toJpeg(b.image_base64);
    let w = 0, h = 0;
    if (jpeg) {
      const s = await imageSize(jpeg);
      if (s.w && s.h) {
        const r = Math.min(maxImgW / s.w, maxImgH / s.h);
        w = s.w * r;
        h = s.h * r;
      }
    }
    const blockH = Math.max(34, h + 6) + 6;
    if (y + blockH > pageH - m) {
      doc.addPage();
      y = m + 4;
    }
    doc.setDrawColor(200).rect(m, y, pageW - 2 * m, blockH - 4);
    doc.setFont("helvetica", "bold").setFontSize(11).text(`${i + 1}. ${b.bill_title}`, m + 4, y + 7, { maxWidth: pageW - 2 * m - maxImgW - 12 });
    doc.setFont("helvetica", "normal").setFontSize(10);
    doc.text(`Name: ${b.name}`, m + 4, y + 15);
    doc.text(`Date: ${b.bill_date}`, m + 4, y + 21);
    doc.text(`Amount: ${formatLKR(Number(b.amount))}`, m + 4, y + 27);
    if (jpeg && w) doc.addImage(jpeg, "JPEG", pageW - m - 4 - w, y + 3, w, h);
    y += blockH;
  }

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(8).setTextColor(120);
    doc.text(`Page ${p} of ${pages}`, pageW - m, pageH - 6, { align: "right" });
    doc.setTextColor(0);
  }
  doc.save(`bills-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
