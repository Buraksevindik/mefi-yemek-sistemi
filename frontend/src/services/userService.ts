import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Stajyer } from "../types/user";

export async function getKapaliGunler(): Promise<string[]> {
  try {
    const snapshot = await getDocs(collection(db, "kapaliGunler"));
    return snapshot.docs.map((item) => item.id).sort();
  } catch (error) {
    console.error("Kapalı günler alınamadı:", error);
    return [];
  }
}

export async function kapaliGunEkle(tarih: string): Promise<void> {
  await setDoc(doc(db, "kapaliGunler", tarih), {
    tarih,
  });
}

export async function kapaliGunSil(tarih: string): Promise<void> {
  await deleteDoc(doc(db, "kapaliGunler", tarih));
}

export async function getStajyerler(): Promise<Stajyer[]> {
  try {
    const snapshot = await getDocs(collection(db, "stajyerler"));
    return snapshot.docs.map((item) => ({
      id: item.id,
      ...(item.data() as { email: string }),
    }));
  } catch (error) {
    console.error("Stajyerler alınamadı:", error);
    return [];
  }
}

export async function stajyerEkle(email: string): Promise<Stajyer> {
  const temizEmail = email.trim().toLowerCase();
  await setDoc(doc(db, "stajyerler", temizEmail), {
    email: temizEmail,
  });
  return { id: temizEmail, email: temizEmail };
}

export async function stajyerSil(id: string): Promise<void> {
  await deleteDoc(doc(db, "stajyerler", id));
}
