import { Router } from "express";
const router = Router();
import {
  newAssignedBooking,
  customNotification,
} from "../controllers/notificationsController.js";

router.post(
  "/new_assigned_booking_notification/:expoPushToken",
  newAssignedBooking
);

router.post("/custom_notification", customNotification);

export default router;
