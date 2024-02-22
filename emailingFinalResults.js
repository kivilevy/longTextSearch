import JSZip from "jszip";
import mimemessage from "mimemessage";
import {
  SESClient,
  SendEmailCommand,
  SendRawEmailCommand,
} from "@aws-sdk/client-ses";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("./config.json", "utf-8"));
const {
  EMAIL: { SENDER, SUBJECT, REGION },
} = config;
const sesClient = new SESClient({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const sendEmail = async (resultsFilePath, recipient, invalidFiles) => {
  const zipFile = await zipResults(resultsFilePath, recipient);
  const invalidFilesReport = invalidFiles?.length
    ? `Invalid files not processed:\n${invalidFiles.join(". \n")}`
    : "";
  const rawEmail = formRawEmail(recipient, zipFile, invalidFilesReport);
  const command = new SendRawEmailCommand({
    RawMessage: { Data: Buffer.from(rawEmail) },
  });
  await sesClient.send(command);
  deleteFiles(resultsFilePath);
};

const zipResults = async (resultsFilePath, recipient) => {
  const zip = new JSZip();

  resultsFilePath.forEach(({ path, filename }) => {
    if (path == null) sendErrMsgEmail(recipient, filename);
    else {
      const pdfData = fs.readFileSync(path);
      zip.file(`${filename}.pdf`, pdfData);
    }
  });
  return zip.generateAsync({ type: "nodebuffer" });
};

const formRawEmail = (recipient, zipFile, invalidFilesReport) => {
  const msg = mimemessage.factory({
    contentType: "multipart/mixed",
    body: [],
  });

  msg.header("From", SENDER);
  msg.header("To", recipient);
  msg.header("Subject", SUBJECT);
  const bodyPart = mimemessage.factory({
    contentType: "text/html",
    body: `<h1>Dicta Citation Finder Results</h1>
            <p>Find the document requested attached</p>${invalidFilesReport}`,
  });
  msg.body.push(bodyPart);
  const attachmentPart = mimemessage.factory({
    contentType: "application/zip",
    contentTransferEncoding: "base64",
    body: zipFile.toString("base64"),
  });
  attachmentPart.header(
    "Content-Disposition",
    `attachment; filename ="Dicta-Results.zip"`
  );
  msg.body.push(attachmentPart);
  return msg.toString();
};

const sendErrMsgEmail = async (recipient, filename) => {
  const command = new SendEmailCommand({
    Destination: {
      ToAddresses: [recipient],
    },
    Message: {
      Body: {
        Text: {
          Data: `An error occurred while processing your request for file '${filename}'. Please check your file or try again`,
          Charset: "UTF-8",
        },
      },
      Subject: {
        Data: "Dicta search request",
        Charset: "UTF-8",
      },
    },
    Source: SENDER,
  });
  await sesClient.send(command);
};

const deleteFiles = (resultsFilePath) => {
  resultsFilePath.forEach(({ path }) => {
    fs.unlink(path, (err) => {
      if (err) throw err;
    });
  });
};
