import { Router } from "express";
const router = Router();
import { sendMessage } from "../controllers/chatController.js";

router.post("/send_message", sendMessage);

export default router;
