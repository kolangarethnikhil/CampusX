import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBvQE6ZypCKa_N0xo2i130yLTm5hLM47pw",
  authDomain: "kju1-a25b4.firebaseapp.com",
  projectId: "kju1-a25b4",
  storageBucket: "kju1-a25b4.firebasestorage.app",
  messagingSenderId: "109020994202",
  appId: "1:109020994202:web:e1f04daf7799578a575d23",
  measurementId: "G-7EBMGFHQ5M",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);