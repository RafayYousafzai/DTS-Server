import { Router } from "express";
const router = Router();
import sendPodPdf from "../controllers/pdf/sendPodPdf.js";

router.post("/send-pod-pdf", sendPodPdf);

export default router;
