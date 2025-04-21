import axios from "axios";
import {
  doc,
  getFirestore,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import app, { authenticate } from "../lib/firebase/firebaseConfig.js";
import { fetchDoc, fetchDrivers } from "../lib/firebase/functions/fetch.js";
import { isBusinessTime } from "../lib/helper/isBusinessTime.js";

const db = getFirestore(app);
const INACTIVITY_THRESHOLD_SECONDS = 20 * 60;
const MAX_INACTIVITY_THRESHOLD_SECONDS = 60 * 40;

export const verifyUserActivitySignal = async (req, res, next) => {
  try {
    const { user, locationPermissionNotGranted } = req.body;

    if (!user) {
      return res.status(400).json({ message: "User information is required." });
    }

    const { expoPushToken, email: userEmail, firstName } = user;

    if (!expoPushToken && !userEmail) {
      return res
        .status(400)
        .json({ message: "Expo push token or email is required." });
    }

    if (!userEmail || typeof userEmail !== "string") {
      return res.status(400).json({ message: "Valid email is required." });
    }

    if (locationPermissionNotGranted) {
      const adminNotificationMessage = `⚠️ ${firstName} has removed app permissions, preventing the system from tracking them.`;
      const message =
        "⚠️ It seems you've removed the app's permissions. Please re-enable them.";

      await sendInactivityNotification(req, res, next, user, {
        chatMessage: message,
        notificationMessage: message,
        adminNotificationMessage,
      });
    }

    await authenticate();
    await updateDoc(doc(db, "users", userEmail), {
      lastActiveTime: serverTimestamp(),
      permissions: !locationPermissionNotGranted,
    });

    console.log(`✅ User activity updated for: ${userEmail}`);
    return res
      .status(200)
      .json({ message: "User activity signal sent successfully." });
  } catch (error) {
    console.error(
      `❌ Error updating user activity (${
        req.body?.user?.email || "unknown"
      }):`,
      error?.message || error
    );
    return res
      .status(500)
      .json({ message: "Server error while processing activity signal." });
  }
};

export const monitorUserInactivity = async (req, res, next) => {
  if (!isBusinessTime()) {
    const message = `Notifications are paused outside of business hours.`;
    return res.status(200).json({
      message,
      activeDriversEmail: [],
    });
  }

  try {
    const drivers = await fetchDrivers();
    const filteredDrivers = drivers.filter((driver) => driver?.lastActiveTime);

    if (!filteredDrivers || filteredDrivers.length === 0) {
      return res.status(200).json({ message: "No drivers data available." });
    }

    const activeDriversEmail = await checkDriverInactivity(
      req,
      res,
      next,
      filteredDrivers
    );

    return res.status(200).json({
      message: "Inactivity check for all drivers completed.",
      activeDriversEmail,
    });
  } catch (error) {
    console.error("Error monitoring driver inactivity:", error.message);
    return next(error);
  }
};

const checkDriverInactivity = async (req, res, next, drivers) => {
  const activeDriversEmail = [];

  await Promise.all(
    drivers.map(async (driver) => {
      const { lastActiveTime, email, firstName } = driver;

      const currentTimestamp = Date.now();
      const userLastActiveTime = lastActiveTime;

      if (userLastActiveTime) {
        const lastActiveMillis = userLastActiveTime.toMillis
          ? userLastActiveTime.toMillis()
          : new Date(userLastActiveTime).getTime();

        const inactivityDuration = (currentTimestamp - lastActiveMillis) / 1000;

        if (inactivityDuration > INACTIVITY_THRESHOLD_SECONDS) {
          const adminNotificationMessage = `${firstName}'s tracking has been inactive for some time.`;
          const message =
            "⚠️ Tracking is currently disabled. This may be due to app removal or restricted permissions. Please ensure the app is installed and permissions are enabled to continue receiving assignments.";

          await sendInactivityNotification(req, res, next, driver, {
            chatMessage: message,
            notificationMessage: message,
            adminNotificationMessage,
          });

          await authenticate();
          await updateDoc(doc(db, "users", email), {
            permissions: false,
          });

          console.log(`✅ Taking action for user: ${firstName}`);
        } else {
          activeDriversEmail.push(driver.email);
        }
      }
    })
  );

  return activeDriversEmail;
};

export const sendInactivityNotification = async (
  req,
  res,
  next,
  driver,
  messages
) => {
  try {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const { chatMessage, notificationMessage, adminNotificationMessage } =
      messages;
    const { email, expoPushToken } = driver;

    if (email !== "test@dev.com") return;

    if (notificationMessage) {
      await axios.post(`${baseUrl}/api/notifications/custom_notification`, {
        expoPushToken: expoPushToken,
        title: "Driver Activity Management System",
        description: notificationMessage,
        channelId: "default",
      });
    }

    if (chatMessage) {
      await axios.post(`${baseUrl}/api/chat/send_message`, {
        email: email,
        sender: "admin",
        message: chatMessage,
      });
    }

    await authenticate();
    const adminDevicesPushTokens = await fetchDoc("data", "AdminDevices");

    if (
      adminDevicesPushTokens &&
      Object.keys(adminDevicesPushTokens).length > 0
    ) {
      await axios.post(`${baseUrl}/api/notifications/custom_notification`, {
        expoPushToken: Object.values(adminDevicesPushTokens),
        title: "Driver Activity Management System",
        description: adminNotificationMessage,
        channelId: "default",
      });
    }
  } catch (error) {
    const message = `❌ Error sending inactivity notification for driver ${
      email || "unknown"
    }:`;
    console.error(message, error.response?.data || error.message);

    return next(error);
  }
};
