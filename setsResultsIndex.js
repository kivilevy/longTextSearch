import { BOOKS_ORDER } from "./hebrewBooksOrder.js";

export const setIndex = async (matchDetailsArray) => {
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
  return categorizeCitations(sortedCitations);
};

const sortCitationArray = (matchDetailsArray) => {
  return matchDetailsArray.sort((a, b) => {
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
