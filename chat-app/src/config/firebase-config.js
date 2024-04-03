// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDrsXGs89a4BqQcdN0pbU4KOPW9IsyOg7E",
  authDomain: "chat-app-dc70f.firebaseapp.com",
  projectId: "chat-app-dc70f",
  storageBucket: "chat-app-dc70f.appspot.com",
  messagingSenderId: "763246484769",
  appId: "1:763246484769:web:b7028161ea68da9a75f260"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);