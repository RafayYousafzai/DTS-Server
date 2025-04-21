export const newAssignedBooking = async (req, res, next) => {
  console.log("Received request to update newAssignedBooking");

  try {
    const { expoPushToken } = req.params;

    if (!expoPushToken) {
      console.log("No Expo push token provided.");
      return res.status(400).json({ message: "No Expo push token provided." });
    }

    const NewAssignedBooking = {
      to: expoPushToken,
      title: "Direct Transport Solution",
      body: "New booking assigned to you.",
      channelId: "new-assigned-booking",
    };

    console.log({ NewAssignedBooking });

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(NewAssignedBooking),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Error sending push notification:", data);
      return res
        .status(response.status)
        .json({ message: "Failed to send push notification", error: data });
    }

    console.log("Push notification sent successfully:", data);

    return res
      .status(200)
      .json({ message: "Push notification sent successfully", data });
  } catch (error) {
    console.error("Unexpected error processing request:", error.message);
    return next(error);
  }
};

export const customNotification = async (req, res, next) => {
  console.log("Received request to send custom notification");

  try {
    const { expoPushToken, title, description, channelId } = req.body;

    if (!expoPushToken) {
      console.log("Expo push token is missing.");
      return res.status(400).json({ message: "Expo push token is required." });
    }

    if (!title) {
      console.log("Title is missing.");
      return res.status(400).json({ message: "Title is required." });
    }

    const customNotification = {
      to: expoPushToken,
      title: title,
      body: description || "",
      channelId: channelId || "default",
    };

    console.log("Sending push notification to:", expoPushToken);

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(customNotification),
    });

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error("Failed to parse response JSON:", jsonError);
      return res
        .status(500)
        .json({ message: "Invalid response from push notification service." });
    }

    if (!response.ok) {
      console.error("Error sending push notification:", data);
      return res
        .status(response.status)
        .json({ message: "Failed to send push notification", error: data });
    }

    console.log("Push notification sent successfully:", data);

    return res
      .status(200)
      .json({ message: "Push notification sent successfully", data });
  } catch (error) {
    console.error("Unexpected error processing request:", error.message);
    return next(error);
  }
};
