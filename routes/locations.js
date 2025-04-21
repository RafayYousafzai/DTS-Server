import { Router } from "express";
const router = Router();
import {
  updateCurrentLocations,
  deleteCurrentLocation,
} from "../controllers/locationsController.js";

router.post("/update_current_location", updateCurrentLocations);
router.delete("/delete_current_location/:id", deleteCurrentLocation);

export default router;
