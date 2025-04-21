import { Router } from "express";
const router = Router();
import generatePdf from "../controllers/pdf/generatePdf.js";

router.post("/generate-pdf", generatePdf);

export default router;
