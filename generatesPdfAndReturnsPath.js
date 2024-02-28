import fs from "fs";
import PDFDocument from "pdfkit";

export const generatePdfAndReturnPath = async (pagesArraay, categorizedIndex) => {
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
        doc.fontSize(14).text(mainCategory);
        for (const [subCategory, books] of subCategories) {
          doc.fontSize(12).text(`  ${subCategory}`);
          for (const [bookName, citations] of Object.entries(books)) {
            doc.fontSize(12).text(`    ${bookName}`);
            citations.forEach((citation) => {
              doc
                .fontSize(10)
                .text(`${citation.verseDispHeb}`, {
                  align: "right",
                  features: ["rtla"],
                })
                .text(
                  `  [${citation.footnoteNumber}] ${citation.chunckNumber} עמוד`,
                  { align: "right" }
                );
            });
          }
        }
      }
      doc.end();
    });
  };