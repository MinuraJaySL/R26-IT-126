import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDnBmuDM6c1_kY88DbmIb4dYeuu-vKW5eM",
  authDomain: "smart-bin-2a46c.firebaseapp.com",
  databaseURL: "https://smart-bin-2a46c-default-rtdb.firebaseio.com",
  projectId: "smart-bin-2a46c",
  storageBucket: "smart-bin-2a46c.firebasestorage.app",
  messagingSenderId: "810598151734",
  appId: "1:810598151734:web:e329c8eadc6a01109c4a97",
  measurementId: "G-7GBD08JNQY"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
