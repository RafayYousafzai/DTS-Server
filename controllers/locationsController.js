import { ref as dbRef, remove, update } from "firebase/database";
import app, { authenticate, realtimeDbOFL } from "../lib/firebase/firebaseConfig.js";
import {
  doc,
  getFirestore,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

const db = getFirestore(app);
const currentTimestamp = Date.now();

export const updateCurrentLocations = async (req, res, next) => {
  console.log("Received request to update location"); // Log when the request hits the endpoint

  async function uploadLocation(location, email) {
    try {
      const sanitizedEmail = email.replace(/[.#$[\]]/g, "_");
      const { latitude, longitude } = location;

      const currentLocationRef = dbRef(
        realtimeDbOFL,
        `driversLocations/${sanitizedEmail}`
      );

      console.log(
        `Attempting to update Realtime Database for email: ${email} with location:`,
        { latitude, longitude }
      ); // Log before Realtime Database update

      await update(currentLocationRef, {
        email,
        current: { latitude, longitude },
      });

      console.log(
        `Firebase Realtime Database updated successfully for ${sanitizedEmail}`
      ); // Log on successful Realtime Database update
    } catch (error) {
      console.error(
        "Failed to update location in Firebase Realtime Database:",
        error.message
      ); // Specific error log for Realtime Database
      throw error;
    }
  }

  try {
    const data = req.body;
    console.log("Request body:", data); // Log the entire request body

    if (!data || !data.email || !data.location) {
      const error = new Error(
        "Invalid or missing location data in the request body."
      ); // More descriptive error message
      error.status = 400;
      console.error("Error: Invalid request data:", error.message); // Log the error
      return next(error);
    }

    const { latitude, longitude } = data.location;

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      const error = new Error(
        "Latitude and longitude must be valid numbers in the location data."
      ); // More descriptive error message
      error.status = 400;
      console.error("Error: Invalid latitude or longitude:", error.message); // Log the error
      return next(error);
    }

    try {
      const { location, email } = data;

      await uploadLocation(location, email);

      console.log(`Attempting to update Firestore document for user: ${email}`); // Log before Firestore update

      await authenticate();
      await updateDoc(doc(db, "users", email), {
        lastActiveTime: serverTimestamp(),
        permissions: true,
      });

      console.log(`Firestore document updated successfully for user: ${email}`); // Log on successful Firestore update
    } catch (err) {
      console.error(
        "Failed to upload location or update Firestore:",
        err.message
      ); // Combined error log
      return next(new Error("Failed to update location in the database."));
    }

    const responseData = {
      message: "Location updated successfully.",
      location: { latitude, longitude },
      ok: true,
    };

    console.log("Response sent:", responseData); // Log the successful response
    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Unexpected error processing request:", error.message); // General error log
    return next(error);
  }
};

export const deleteCurrentLocation = async (req, res, next) => {
  console.log("Received request to delete location by email");

  try {
    const { id } = req.params;

    if (!id) {
      const error = new Error("ID parameter is missing.");
      error.status = 400;
      return next(error);
    }

    const sanitizedEmail = email.replace(/[.#$[\]]/g, "_");

    const currentLocationRef = dbRef(
      realtimeDbOFL,
      `driversLocations/${sanitizedEmail}`
    );

    try {
      await remove(currentLocationRef);

      console.log(`Location deleted for ID: ${sanitizedEmail}`);

      return res.status(200).json({
        message: "Location deleted successfully.",
        ok: true,
      });
    } catch (error) {
      console.error("Failed to delete location from Firebase:", error.message);
      return next(new Error("Failed to delete location from the database."));
    }
  } catch (error) {
    console.error("Unexpected error processing request:", error.message);
    return next(error);
  }
};
