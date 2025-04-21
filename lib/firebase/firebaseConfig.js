import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth, signInWithCustomToken } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBjqSDb2PvnvIj6Sr4s6JitF3SXeBNdjdY",
  authDomain: "couriers-946ec.firebaseapp.com",
  projectId: "couriers-946ec",
  storageBucket: "couriers-946ec.appspot.com",
  messagingSenderId: "828818568390",
  appId: "1:828818568390:web:432896e276b7b88a8093c7",
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
    const url = `https://getaccesstoken-luo7djln7q-uc.a.run.app/?apiKey=${firebaseConfig.apiKey}`;

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
