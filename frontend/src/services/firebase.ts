import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDFQVcfT8KEYuDz5OcducTqFf09JFcoKJE",
  authDomain: "mefi-yemek-sistemi.firebaseapp.com",

  projectId: "mefi-yemek-sistemi",
  storageBucket: "mefi-yemek-sistemi.firebasestorage.app",
  //Firebase Project Number:54186115680
  messagingSenderId: "54186115680",
  appId: "1:54186115680:web:f2a24852f91269d4c7b905",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);