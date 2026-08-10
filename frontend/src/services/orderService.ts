import {
  serverTimestamp,
  runTransaction,
  doc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  deleteDoc,
  orderBy,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "./firebase";
import type { Siparis } from "../types/order";
import { getTodayDate } from "../utils/date";

export async function getTodayOrder(uid: string): Promise<Siparis | null> {
  const bugununTarihi = getTodayDate();

  const q = query(
    collection(db, "siparisler"),
    where("uid", "==", uid),
    where("tarih", "==", bugununTarihi)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const data = snapshot.docs[0];
  const siparisData = data.data();

  return {
    id: data.id,
    isim: siparisData.isim,
    email: siparisData.email,
    uid: siparisData.uid,
    tarih: siparisData.tarih,
    secimler: siparisData.secimler ?? [],
    sira: siparisData.sira,
  };
}

export async function getNextOrderNumber(bugununTarihi: string): Promise<number> {
  const sayacRef = doc(db, "sayaclar", bugununTarihi);

  return runTransaction(db, async (transaction) => {
    const sayacDoc = await transaction.get(sayacRef);

    let sira = 1;
    if (sayacDoc.exists()) {
      const mevcutDeger = sayacDoc.data().sonSira;
      if (typeof mevcutDeger === "number" && !isNaN(mevcutDeger)) {
        sira = mevcutDeger + 1;
      }
    }

    transaction.set(sayacRef, { sonSira: sira }, { merge: true });
    return sira;
  });
}

async function cleanupOldOrders(bugununTarihi: string): Promise<void> {
  const tumSiparisler = await getDocs(collection(db, "siparisler"));

  for (const siparis of tumSiparisler.docs) {
    const veri = siparis.data();
    if (veri.tarih !== bugununTarihi) {
      await deleteDoc(siparis.ref);
    }
  }
}

export async function updateOrder(
  uid: string,
  secimler: string[]
): Promise<{ sira?: number } | null> {
  const bugununTarihi = getTodayDate();

  const q = query(
    collection(db, "siparisler"),
    where("uid", "==", uid),
    where("tarih", "==", bugununTarihi)
  );

  const mevcutSiparisSnap = await getDocs(q);

  if (mevcutSiparisSnap.empty) {
    return null;
  }

  const siparisDoc = mevcutSiparisSnap.docs[0];
  const mevcutVeri = siparisDoc.data();

  await updateDoc(siparisDoc.ref, {
    secimler,
  });

  return { sira: mevcutVeri.sira };
}

export async function createOrder(
  user: User,
  secimler: string[]
): Promise<number> {
  const bugununTarihi = getTodayDate();
  const yeniSira = await getNextOrderNumber(bugununTarihi);

  await addDoc(collection(db, "siparisler"), {
    isim: user.displayName,
    email: user.email,
    uid: user.uid,
    secimler,
    tarih: bugununTarihi,
    sira: yeniSira,
    createdAt: serverTimestamp(),
  });

  return yeniSira;
}

export type SubmitOrderResult =
  | { type: "updated"; sira: number | null }
  | { type: "created"; sira: number };

export async function submitOrder(
  user: User,
  secimler: string[]
): Promise<SubmitOrderResult> {
  const bugununTarihi = getTodayDate();

  await cleanupOldOrders(bugununTarihi);

  const updateResult = await updateOrder(user.uid, secimler);

  if (updateResult !== null) {
    return { type: "updated", sira: updateResult.sira ?? null };
  }

  const yeniSira = await createOrder(user, secimler);
  return { type: "created", sira: yeniSira };
}

export async function deleteTodayOrder(uid: string): Promise<boolean> {
  const bugununTarihi = getTodayDate();

  const q = query(
    collection(db, "siparisler"),
    where("uid", "==", uid),
    where("tarih", "==", bugununTarihi)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return false;
  }

  await deleteDoc(snapshot.docs[0].ref);
  return true;
}

export async function getTodayOrders(): Promise<Siparis[]> {
  const bugununTarihi = getTodayDate();

  const q = query(
    collection(db, "siparisler"),
    where("tarih", "==", bugununTarihi),
    orderBy("createdAt", "asc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...(item.data() as Omit<Siparis, "id">),
  }));
}

export async function deleteOrder(id: string): Promise<void> {
  await deleteDoc(doc(db, "siparisler", id));
}
