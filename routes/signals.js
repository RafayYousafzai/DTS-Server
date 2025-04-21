import { Router } from "express";
const router = Router();
import {
  verifyUserActivitySignal,
  monitorUserInactivity,
} from "../controllers/OnlineSignalController.js";

// verify_activity_signal
router.post("/verify", verifyUserActivitySignal);
router.get("/monitor_drivers_inactivity", monitorUserInactivity);

export default router;
