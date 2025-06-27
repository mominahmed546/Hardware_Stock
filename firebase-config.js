// firebase-config.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// Your Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyBbnsRkO-vDFENo0bvlRhz2mWUx__c_m80",
  authDomain: "hardwarestock-84447.firebaseapp.com",
  projectId: "hardwarestock-84447",
  storageBucket: "hardwarestock-84447.appspot.com",
  messagingSenderId: "240781950352",
  appId: "1:240781950352:web:2c58f6ee22b5828ecf0715",
  measurementId: "G-47W205FW1S"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize and export Firestore database
export const db = getFirestore(app);