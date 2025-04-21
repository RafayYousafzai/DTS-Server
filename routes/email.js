import { Router } from "express";
const router = Router();
import { sendEmail } from "../controllers/emailController.js";

router.post("/send_custom_email", sendEmail);

export default router;
