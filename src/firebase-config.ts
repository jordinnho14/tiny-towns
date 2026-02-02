// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDhDhpFMVbXOq04J2jZkGrfjeovdTT6U2o",
  authDomain: "tiny-towns-multiplayer.firebaseapp.com",
  databaseURL: "https://tiny-towns-multiplayer-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "tiny-towns-multiplayer",
  storageBucket: "tiny-towns-multiplayer.firebasestorage.app",
  messagingSenderId: "374830147876",
  appId: "1:374830147876:web:93ffbe5825d8d3af982bb1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);