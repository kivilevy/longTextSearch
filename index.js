import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import {
  validateAndProcessRequest,
  handleProcessedRequest,
} from "./handelsRequest.js";

dotenv.config();

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(cors());
app.post("/long-text", validateAndProcessRequest, handleProcessedRequest);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));