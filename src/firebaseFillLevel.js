import { initializeApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyB0JmBMXQSx1v9iqw6KtYfitOo05Cvuka4",
  authDomain: "smart-waste-management-54cee.firebaseapp.com",
  databaseURL: "https://smart-waste-management-54cee-default-rtdb.firebaseio.com",
  projectId: "smart-waste-management-54cee",
  storageBucket: "smart-waste-management-54cee.firebasestorage.app",
  messagingSenderId: "961776816348",
  appId: "1:961776816348:web:2251b74a310a60fa112419",
  measurementId: "G-JM7ETGFKL1"
};

const fillLevelApp =
  getApps().find((app) => app.name === "fillLevel") ||
  initializeApp(firebaseConfig, "fillLevel");

export const fillLevelDatabase = getDatabase(fillLevelApp);