import fs from "fs";
import { setIndexAndCreatePdf } from "./indexingAndFormingResults.js";

const config = JSON.parse(fs.readFileSync("./config.json", "utf-8"));
const { BASE_URL } = config;
const PSUKIM_URL = `${BASE_URL}/markpsukim`;
const GROUPS_URL = `${BASE_URL}/parsetogroups`;
const CHUNK_SIZE = 1000;

export const handleSearch = async (text, reqBody) => {
  const pagesArray = [];
  const matchInfoArray = [];
  try {
    const chunks = splitToChunks(text);
    for (const [index, { overlap, chunk }] of chunks.entries()) {
      const chunkResults = await searchChunk(overlap + chunk, reqBody);
      pagesArray.push(
        insertFootnotes(overlap, chunk, index + 1, chunkResults, matchInfoArray)
      );
    }
    const pdfPath = await setIndexAndCreatePdf(pagesArray, matchInfoArray);
    return pdfPath;
  } catch (error) {
    return null;
  }
};

const splitToChunks = (text) => {
  const chunks = [];
  let start = 0;
  let overlap = "";

  while (start < text.length) {
    let end = Math.min(start + CHUNK_SIZE, text.length);
    if (end < text.length) {
      let lastSpaceIndex = text.lastIndexOf(" ", end);
      if (lastSpaceIndex > -1 && lastSpaceIndex > start) end = lastSpaceIndex;
    }
    let chunk = text.slice(start, end).trimEnd();
    chunks.push({ overlap, chunk });
    overlap = getLastWords(chunk);
    start = end + 1;
  }
  return chunks;
};

const searchChunk = async (chunk) => {
  const modes = ["tanakh", "mishna", "talmud"];
  const headers = { "Content-Type": "application/json; charset=utf-8" };
  const psukimResults = [];
  let psukimDownloadId;

  for (const mode of modes) {
    const body = { mode, thresh: 0, fdirectonly: false, data: chunk };
    const { downloadId, results } = await fetch(PSUKIM_URL, {
      method: "POST",
      body: JSON.stringify(body),
      headers,
    }).then((d) => d.json());
    psukimResults.push(...results);
    if (results.length) psukimDownloadId = downloadId;
  }
  const body = {
    allText: chunk,
    downloadId: psukimDownloadId,
    keepredundant: true,
    results: psukimResults,
  };
  const url = `${GROUPS_URL}?smin=22&smax=10000`;
  const res = await fetch(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers,
  });
  return res.json();
};

const insertFootnotes = (overlap, chunk, index, results, matchInfoArray) => {
  let footnotedChunk = "";
  let currentPos = 0;
  let footnoteNumber = 1;
  let footnotes = "";
  const sortedResults = results.sort((a, b) => a.endIChar - b.endIChar);

  for (const result of sortedResults) {
    storeMatchInfo(
      result,
      reverseNumber(footnoteNumber),
      index,
      matchInfoArray
    );
    const { endIChar, matches } = result;
    footnotedChunk +=
      chunk.slice(currentPos, endIChar - overlap.length) +
      `]${reverseNumber(footnoteNumber)}[`;
    currentPos = endIChar - overlap.length;
    footnotes += addFootnote(reverseNumber(footnoteNumber), matches);
    footnoteNumber++;
  }
  footnotedChunk += chunk.slice(currentPos);
  footnotedChunk = footnotedChunk.replace(/<b>|<\/b>/g, "");
  return {
    footnotedText: footnotedChunk,
    footnotes,
  };
};

const addFootnote = (footnoteNumber, matches) => {
  return (
    `\n]${footnoteNumber}[ ` +
    matches
      .map((match) => `${match.matchedText} )${match.verseDispHeb}(`)
      .join(", ")
      .replace(/<b>|<\/b>/g, "")
  );
};

const getLastWords = (chunk) => {
  const numWords = 2;
  const safeMargin = 10 * numWords;
  const startSliceIndex = Math.max(0, chunk.length - safeMargin);
  const endSliceIndex = chunk.length;
  const lastPortion = chunk.slice(startSliceIndex, endSliceIndex);
  let words = lastPortion.trim().split(/\s+/);
  return words.slice(-numWords).join(" ");
};

const storeMatchInfo = (result, footnoteNumber, index, matchInfoArray) => {
  result.matches.forEach((match) => {
    matchInfoArray.push({
      verseId: match.verseId,
      verseDispHeb: match.verseDispHeb,
      footnoteNumber: footnoteNumber,
      chunckNumber: index,
    });
  });
};

const reverseNumber = (num) => {
  const reversedString = num.toString().split("").reverse().join("");
  return parseInt(reversedString, 10);
};
