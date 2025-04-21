import { doc, getDoc, getFirestore, updateDoc } from "firebase/firestore";
import Joi from "joi";
import app, { authenticate } from "../lib/firebase/firebaseConfig.js";

const db = getFirestore(app);

export const sendMessage = async (req, res, next) => {
  const { email, sender, message } = req.body;

  const schema = Joi.object({
    email: Joi.string().required(),
    sender: Joi.string().required().max(10),
    message: Joi.string().required().max(500),
  });

  const { error } = schema.validate({ email, sender, message });

  if (error) {
    console.error(error);
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    await authenticate();

    const chatDocRef = doc(db, "chats", email);
    const chatSnapshot = await getDoc(chatDocRef);

    if (!chatSnapshot.exists()) {
      return res.status(404).json({ error: "Chat not found" });
    }

    const chat = chatSnapshot.data();

    const currentMessages = chat?.messages || [];

    const newMessage = {
      message,
      sender,
      timestamp: new Date().toISOString(),
      seen: false,
    };

    const updatedMessages = [...currentMessages, newMessage];
    await updateDoc(chatDocRef, { messages: updatedMessages });

    return res.status(200).json({ message: "Message sent successfully" });
  } catch (error) {
    console.error("Error updating messages:", error.message || error);
    return next(error);
  }
};
