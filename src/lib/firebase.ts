import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBFW135lw0P3gTmtritqlWfStjDkDxjvPM",
  authDomain: "vista-trainer-icon.firebaseapp.com",
  databaseURL:
    "https://vista-trainer-icon-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "vista-trainer-icon",
  storageBucket: "vista-trainer-icon.firebasestorage.app",
  messagingSenderId: "152180803730",
  appId: "1:152180803730:web:ba861aa0f348092ce1be4b",
  measurementId: "G-E189YKXRPB",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
