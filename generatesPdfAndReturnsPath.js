import fs from "fs";
import PDFDocument from "pdfkit";

export const generatePdfAndReturnPath = async (
  pagesArraay,
  categorizedIndex
) => {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now();
    const pdfPath = `./results/results_${timestamp}.pdf`;
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(pdfPath);
    doc.registerFont(
      "NotoSansHebrew",
      "./notoFont/NotoSansHebrew-VariableFont_wdth,wght.ttf"
    );
    doc.font("NotoSansHebrew");
    stream.on("finish", () => resolve(pdfPath));
    stream.on("error", (err) => reject(err));
    doc.pipe(stream);

    pagesArraay.forEach((page, index) => {
      if (index > 0) doc.addPage();
      doc
        .font("NotoSansHebrew")
        .fontSize(12)
        .text(page.footnotedText, { align: "right", features: ["rtla"] });
      doc.moveDown();
      let y = doc.y;
      doc
        .moveTo(doc.page.margins.left, y)
        .lineTo(doc.page.width - doc.page.margins.right, y)
        .stroke();
      doc
        .font("NotoSansHebrew")
        .fontSize(12)
        .text(page.footnotes, { align: "right", features: ["rtla"] });
    });
    doc.addPage();
    doc.font("NotoSansHebrew").fontSize(12).text(`INDEX`, { align: "center" });
    doc.moveDown();
    for (const [mainCategory, subCategories] of categorizedIndex) {
      doc.moveDown();
      doc.fontSize(16).text(`${mainCategory}`, { align: "right" });
      for (const [_, books] of subCategories) {
        for (const [_, citations] of Object.entries(books)) {
          const printedCitations = new Set();
          citations.forEach((citation) => {
            if (!printedCitations.has(citation.verseDispHeb)) {
              printedCitations.add(citation.verseDispHeb);
              doc.moveDown();
              doc.fontSize(10).text(`${citation.verseDispHeb}`, {
                align: "right",
                features: ["rtla"],
              });
            }
            doc
              .fontSize(8)
              .text(
                `  [${citation.footnoteNumber}] ${citation.chunckNumber} עמוד`,
                {
                  align: "right",
                }
              );
          });
        }
      }
      doc.moveDown();
    }
    doc.end();
  });
};
