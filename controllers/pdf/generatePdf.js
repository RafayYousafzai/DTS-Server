import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import app from "../../lib/firebase/firebaseConfig.js";
import DriverInvoiceDocument from "./utils/DriverInvoiceDocument.js";

import pdf from "html-pdf-node";

const db = getFirestore(app);
const storage = getStorage(app);

const generatePdf = async (req, res, next) => {
  try {
    const { user, datesRange, pdfId } = req.body;

    if (!user || !datesRange || !pdfId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const bookings = await fetchBookingsBetweenDates(datesRange);
    const htmlContent = DriverInvoiceDocument(
      user,
      datesRange,
      pdfId,
      bookings
    );

    const file = { content: htmlContent };

    // Generate PDF buffer
    const pdfBuffer = pdf.generatePdf(file, { format: "A4" });

    // Upload to Firebase Storage
    const storageRef = ref(
      storage,
      `pdfs/monthly_bookings_${user.firstName}.pdf`
    );
    await uploadBytes(storageRef, pdfBuffer);

    const downloadURL = await getDownloadURL(storageRef);

    await addDoc(collection(db, "generatedPdfs"), {
      firstName: user.firstName,
      email: user.email,
      billingEmail: user.billingEmail || null,
      url: downloadURL,
      createdAt: new Date(),
      datesRange,
      pdfId: pdfId || "",
    });

    return res
      .status(200)
      .json({ message: "PDF created successfully", downloadURL });
  } catch (error) {
    console.error("Error generating PDF:", error.message);
    return next(error);
  }
};

export default generatePdf;

const sanitizeDate = (dateStr) => {
  return dateStr.replace(/\s+/g, "");
};

const fetchBookingsBetweenDates = async (datesRange) => {
  const { start, end } = datesRange;

  // Sanitize the date strings to remove spaces
  const sanitizedStart = sanitizeDate(start);
  const sanitizedEnd = sanitizeDate(end);

  const startDate = Timestamp.fromDate(new Date(sanitizedStart));
  const endDate = Timestamp.fromDate(new Date(sanitizedEnd));

  try {
    const bookingsRef = collection(db, "place_bookings");

    const bookingsQuery = query(
      bookingsRef,
      where("dateTimestamp", ">", startDate),
      where("dateTimestamp", "<", endDate)
    );

    const querySnapshot = await getDocs(bookingsQuery);

    const bookings = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log("Fetched bookings:", bookings.length);
    return bookings;
  } catch (error) {
    console.error("Error fetching bookings:", error.message);
    throw new Error("Error fetching bookings");
  }
};
