// lib/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDuEse5WZJDtY3ZZdEZn79rvcX2fCF-nHk",
  authDomain: "download-contents-db75a.firebaseapp.com",
  projectId: "download-contents-db75a",
  storageBucket: "download-contents-db75a.firebasestorage.app",
  messagingSenderId: "902841327859",
  appId: "1:902841327859:web:7fd61d204a306769331786",
  measurementId: "G-6CTREQVMK6"
};

// Firebase 初期化
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
