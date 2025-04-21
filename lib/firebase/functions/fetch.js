import app, { authenticate } from "../firebaseConfig.js";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  getFirestore,
} from "firebase/firestore";

const db = getFirestore(app);

export async function fetchDrivers() {
  try {
    await authenticate();

    const usersCollectionReference = collection(db, "users");
    const driversQuery = query(
      usersCollectionReference,
      where("role", "==", "driver")
    );
    const querySnapshot = await getDocs(driversQuery);

    const driversList = querySnapshot.docs.map((doc) => doc.data());
    return driversList;
  } catch (error) {
    console.error("Error while fetching drivers from database:", error);
    return [];
  }
}

export async function fetchDoc(collectionName, docId) {
  const docRef = doc(db, collectionName, docId);
  try {
    await authenticate();

    const docSnapshot = await getDoc(docRef);
    if (!docSnapshot.exists()) {
      console.log("Doc not found.");
      return null;
    }
    return docSnapshot.data();
  } catch (error) {
    console.log("Error fetching Doc:", error);
  }
}
