import validator from "validator";
import { MESSAGES } from "./messagesObj.js";
import { getTextFromUrl } from "./extractingTxtFilesFromUrls.js";
import { handleSearch } from "./dictaSearch.js";
import { sendEmail } from "./emailingFinalResults.js";

const { INVALID_EMAIL, NO_TEXT_FOUND, VALID_REQUEST } = MESSAGES;

export const validateAndProcessRequest = async (req, res, next) => {
  const {
    body: { url, email },
  } = req;

  try {
    if (!validator.isEmail(email))
      return res.status(400).send({ error: INVALID_EMAIL });
    if (url && url.startsWith("https://upload.loadbalancer.dicta.org.il/"))
      await getTextFromUrl(req, res, url);
    else return res.status(400).send({ error: NO_TEXT_FOUND });
    if (!res.headersSent) {
      res.send(VALID_REQUEST);
      next();
    }
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
};

export const handleProcessedRequest = async (req) => {
  const resultsFilePath = [];

  try {
    const {
      txtFiles,
      notTxtFiles,
      body,
      body: { email },
    } = req;
    for (const { filename, text } of txtFiles) {
      const path = await handleSearch(text, body);
      resultsFilePath.push({ filename, path });
    }
    sendEmail(resultsFilePath, email, notTxtFiles);
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
};