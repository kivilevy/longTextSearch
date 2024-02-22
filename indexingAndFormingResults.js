import fs from "fs";
import PDFDocument from "pdfkit";
import { BOOKS_ORDER } from "./hebrewBooksOrder.js";

export const setIndexAndCreatePdf = async (pagesArraay, matchDetailsArray) => {
  matchDetailsArray = matchDetailsArray.map((citation) => {
    if (citation.verseId.startsWith("Talmud.Bavli")) {
      return {
        ...citation,
        verseId: citation.verseId.replace("Talmud.Bavli", "TalmudBavli"),
      };
    }
    return citation;
  });
  const sortedCitations = sortCitationArray(matchDetailsArray);
  const pdfPath = await generatePdfAndReturnPath(
    pagesArraay,
    categorizeCitations(sortedCitations)
  );
  return pdfPath;
};

const sortCitationArray = (citationArray) => {
  return citationArray.sort((a, b) => {
    const [, , bookNameA, chapterA, verseA] = a.verseId.split(".");
    const [, , bookNameB, chapterB, verseB] = b.verseId.split(".");
    const bookIndexA = BOOKS_ORDER.indexOf(bookNameA);
    const bookIndexB = BOOKS_ORDER.indexOf(bookNameB);
    if (bookIndexA !== bookIndexB) return bookIndexA - bookIndexB;
    if (Number(chapterA) !== Number(chapterB))
      return Number(chapterA) - Number(chapterB);
    if (verseA === "a" || verseA === "b") return verseA.localeCompare(verseB);
    return Number(verseA) - Number(verseB);
  });
};

const categorizeCitations = (sortedCitations) => {
  const categorizedCitations = new Map();

  for (const citation of sortedCitations) {
    const { verseId } = citation;
    const [mainCategory, subCategory, bookName] = verseId.split(".");
    if (!categorizedCitations.has(mainCategory))
      categorizedCitations.set(mainCategory, new Map());
    const mainCatMap = categorizedCitations.get(mainCategory);
    if (!mainCatMap.has(subCategory)) mainCatMap.set(subCategory, {});
    const subCatMap = mainCatMap.get(subCategory);
    if (!subCatMap[bookName]) subCatMap[bookName] = [];
    subCatMap[bookName].push(citation);
  }
  return categorizedCitations;
};

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