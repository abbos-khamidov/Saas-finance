// Firebase Configuration
// DO NOT commit this file to Git - use .env.example instead

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDipjsR-D4xVAaNdtJWXBBGZsFPkVj5HTI",
    authDomain: "finance-mentor-c437b.firebaseapp.com",
    projectId: "finance-mentor-c437b",
    storageBucket: "finance-mentor-c437b.firebasestorage.app",
    messagingSenderId: "816177366762",
    appId: "1:816177366762:web:98cec94dbabd4ab9777993",
    measurementId: "G-8D9RC33XM5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

console.log("Firebase initialized successfully");
