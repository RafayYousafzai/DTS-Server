import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth, signInWithCustomToken } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDIoJ_fA0lBp9Is8iSXvOLrP4u2EoE5ciM",
  authDomain: "direct-transport-solution.firebaseapp.com",
  projectId: "direct-transport-solution",
  storageBucket: "direct-transport-solution.firebasestorage.app",
  messagingSenderId: "429275883758",
  appId: "1:429275883758:web:87e69cce5363ef58f4ebff",
  measurementId: "G-4EGW64DS7Q",
};

const firebaseConfigOFL = {
  apiKey: "AIzaSyD77nzoV_f6OnA2ebI6Ln-vj6V-0kNZWa8",
  authDomain: "location-tracking-9122b.firebaseapp.com",
  projectId: "location-tracking-9122b",
  storageBucket: "location-tracking-9122b.appspot.com",
  messagingSenderId: "476599892713",
  appId: "1:476599892713:web:5a647dc2a720e89c9e8e78",
};

const appOFL = initializeApp(firebaseConfigOFL, "locationTrackingApp");
const realtimeDbOFL = getDatabase(appOFL);

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// 🔹 Authentication Function
export async function authenticate() {
  try {
    const url = `https://getaccesstoken-eakospcjhq-uc.a.run.app/?apiKey=${firebaseConfig.apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.token) {
      const res = await signInWithCustomToken(auth, data.token);
      console.log(res);

      console.log("✅ Authenticated successfully!");
    } else {
      console.error("❌ Failed authentication:", data.error);
    }
  } catch (error) {
    console.error("❌ Error authenticating:", error);
  }
}

authenticate();

export { realtimeDbOFL, db };
export default app;
