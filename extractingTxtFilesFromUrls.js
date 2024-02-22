import jschardet from "jschardet";
import decompress from "decompress";
import { ERROR_MESSAGES } from "./messagesObj.js";
import fetch from "node-fetch";

const { BAD_RESPONSE, FILE_ERR, NO_TEXT_FOUND } = ERROR_MESSAGES;

export const getTextFromUrl = async (req, res, url) => {
  const response = await fetch(url);
  if (!response.ok) return res.status(500).send({ error: BAD_RESPONSE });
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type");
  if (contentType.includes("application/zip"))
    await extractTxtFilesFromZip(req, res, buffer);
  else if (contentType.includes("text/plain")) {
    const filename = extractFilenameFromUrl(url) || "dicta-results.txt";
    setTextAsString(req, buffer, filename);
  } else return res.status(400).send({ error: FILE_ERR });
};

const extractTxtFilesFromZip = async (req, res, buffer) => {
  const files = await decompress(buffer);
  const txtFiles = [];
  const notTxtFiles = [];

  for (const { data, path } of files) {
    const text = validateDataAndExtractText(data);
    if (text && MinHebrewWordsCheck(text))
      txtFiles.push({ filename: path, text });
    else notTxtFiles.push(path);
  }
  if (!txtFiles.length) return res.status(400).send({ error: NO_TEXT_FOUND });
  req.txtFiles = txtFiles;
  req.notTxtFiles = notTxtFiles;
};

const validateDataAndExtractText = (data) => {
  const detected = jschardet.detect(data);
  if (
    detected &&
    detected.confidence > 0.9 &&
    (detected.encoding === "UTF-8" || detected.encoding === "ISO-8859-1")
  )
    return data.toString();
};

const MinHebrewWordsCheck = (text) => {
  const hebrewWordRegex = /[\u05D0-\u05EA]+/g;
  const matches = text.match(hebrewWordRegex);
  return matches && matches.length >= 3;
};

const setTextAsString = (req, buffer, filename) => {
  const text = buffer.toString("utf8");
  if (MinHebrewWordsCheck(text)) req.txtFiles = [{ filename, text }];
};

const extractFilenameFromUrl = (url) => {
  const urlParts = url.split("/");
  const lastPart = urlParts[urlParts.length - 1];
  return lastPart || null;
};
