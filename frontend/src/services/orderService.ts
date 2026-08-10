import {
  serverTimestamp,
  runTransaction,
  doc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "./firebase";
import type { Misafir, Siparis, CateringEntry } from "../types/order";
import { getTodayDate } from "../utils/date";

function mapSiparisDoc(data: QueryDocumentSnapshot<DocumentData>): Siparis {
  const siparisData = data.data()!;
  return {
    id: data.id,
    isim: siparisData.isim,
    email: siparisData.email,
    uid: siparisData.uid,
    tarih: siparisData.tarih,
    secimler: siparisData.secimler ?? [],
    sira: siparisData.sira,
    misafirler: siparisData.misafirler ?? [],
  };
}

export function expandToCateringEntries(siparis: Siparis): CateringEntry[] {
  const entries: CateringEntry[] = [];

  if (typeof siparis.sira === "number") {
    entries.push({ sira: siparis.sira, secimler: siparis.secimler ?? [] });
  }

  for (const misafir of siparis.misafirler ?? []) {
    if (typeof misafir.sira === "number") {
      entries.push({ sira: misafir.sira, secimler: misafir.secimler ?? [] });
    }
  }

  return entries;
}

export function getAllSecimler(siparis: Siparis): string[] {
  const tumSecimler = [...(siparis.secimler ?? [])];
  for (const misafir of siparis.misafirler ?? []) {
    tumSecimler.push(...(misafir.secimler ?? []));
  }
  return tumSecimler;
}

export function generateGuestId(): string {
  return `guest_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function ensureSayacInitialized(bugununTarihi: string): Promise<void> {
  const sayacRef = doc(db, "sayaclar", bugununTarihi);
  const sayacDoc = await getDoc(sayacRef);

  if (sayacDoc.exists() && Array.isArray(sayacDoc.data().kullanilanNumaralar)) {
    return;
  }

  const ordersSnap = await getDocs(
    query(collection(db, "siparisler"), where("tarih", "==", bugununTarihi))
  );

  const usedNumbers: number[] = [];

  ordersSnap.docs.forEach((d) => {
    const data = d.data();
    if (typeof data.sira === "number" && !isNaN(data.sira)) {
      usedNumbers.push(data.sira);
    }
    if (Array.isArray(data.misafirler)) {
      data.misafirler.forEach((misafir: Misafir) => {
        if (typeof misafir.sira === "number" && !isNaN(misafir.sira)) {
          usedNumbers.push(misafir.sira);
        }
      });
    }
  });

  const unique = [...new Set(usedNumbers)].sort((a, b) => a - b);

  await setDoc(
    sayacRef,
    {
      kullanilanNumaralar: unique,
      sonSira: unique.length > 0 ? Math.max(...unique) : 0,
    },
    { merge: true }
  );
}

export async function getNextOrderNumber(bugununTarihi: string): Promise<number> {
  await ensureSayacInitialized(bugununTarihi);

  const sayacRef = doc(db, "sayaclar", bugununTarihi);

  return runTransaction(db, async (transaction) => {
    const sayacDoc = await transaction.get(sayacRef);

    let usedNumbers: number[] = [];
    if (sayacDoc.exists()) {
      const data = sayacDoc.data();
      if (Array.isArray(data.kullanilanNumaralar)) {
        usedNumbers = [...data.kullanilanNumaralar];
      }
    }

    const usedSet = new Set(usedNumbers);
    let sira = 1;
    while (usedSet.has(sira)) {
      sira++;
    }

    usedSet.add(sira);
    const sorted = Array.from(usedSet).sort((a, b) => a - b);

    transaction.set(
      sayacRef,
      {
        kullanilanNumaralar: sorted,
        sonSira: sorted.length > 0 ? Math.max(...sorted) : 0,
      },
      { merge: true }
    );

    return sira;
  });
}

async function releaseOrderNumber(bugununTarihi: string, sira: number): Promise<void> {
  const sayacRef = doc(db, "sayaclar", bugununTarihi);

  await runTransaction(db, async (transaction) => {
    const sayacDoc = await transaction.get(sayacRef);
    if (!sayacDoc.exists()) return;

    let usedNumbers: number[] = sayacDoc.data().kullanilanNumaralar ?? [];
    usedNumbers = usedNumbers.filter((n) => n !== sira);

    transaction.set(
      sayacRef,
      {
        kullanilanNumaralar: usedNumbers,
        sonSira: usedNumbers.length > 0 ? Math.max(...usedNumbers) : 0,
      },
      { merge: true }
    );
  });
}

async function ensureGuestSiraNumbers(
  bugununTarihi: string,
  misafirler: Misafir[]
): Promise<Misafir[]> {
  const result: Misafir[] = [];

  for (const misafir of misafirler) {
    if (typeof misafir.sira === "number") {
      result.push(misafir);
    } else {
      const sira = await getNextOrderNumber(bugununTarihi);
      result.push({ ...misafir, sira });
    }
  }

  return result;
}

async function releaseGuestSiraNumbers(
  bugununTarihi: string,
  misafirler: Misafir[]
): Promise<void> {
  for (const misafir of misafirler) {
    if (typeof misafir.sira === "number") {
      await releaseOrderNumber(bugununTarihi, misafir.sira);
    }
  }
}

async function getTodayOrderDoc(uid: string) {
  const bugununTarihi = getTodayDate();

  const q = query(
    collection(db, "siparisler"),
    where("uid", "==", uid),
    where("tarih", "==", bugununTarihi)
  );

  const snapshot = await getDocs(q);
  return snapshot.empty ? null : snapshot.docs[0];
}

export async function getTodayOrder(uid: string): Promise<Siparis | null> {
  const orderDoc = await getTodayOrderDoc(uid);
  if (!orderDoc) return null;
  return mapSiparisDoc(orderDoc);
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
  secimler: string[],
  misafirler?: Misafir[]
): Promise<{ sira?: number } | null> {
  const orderDoc = await getTodayOrderDoc(uid);

  if (!orderDoc) {
    return null;
  }

  const mevcutVeri = orderDoc.data();

  const updateData: Record<string, unknown> = {
    secimler,
  };

  if (misafirler !== undefined) {
    const eskiMisafirler: Misafir[] =
      Array.isArray(mevcutVeri.misafirler)
        ? mevcutVeri.misafirler
        : [];

    const yeniMisafirler =
      await ensureGuestSiraNumbers(
        getTodayDate(),
        misafirler
      );

    // Yeni listede olmayan eski misafirlerin
    // sıra numaralarını serbest bırak
    const yeniGuestIds = new Set(
      yeniMisafirler.map((m) => m.id)
    );

    for (const eskiMisafir of eskiMisafirler) {
      if (
        !yeniGuestIds.has(eskiMisafir.id) &&
        typeof eskiMisafir.sira === "number"
      ) {
        await releaseOrderNumber(
          getTodayDate(),
          eskiMisafir.sira
        );
      }
    }

    updateData.misafirler = yeniMisafirler;
  }

  await updateDoc(
    orderDoc.ref,
    updateData
  );

  return {
    sira: mevcutVeri.sira,
  };
}

export async function createOrder(
  user: User,
  secimler: string[],
  misafirler: Misafir[] = []
): Promise<number> {
  const bugununTarihi = getTodayDate();
  const yeniSira = await getNextOrderNumber(bugununTarihi);
  const misafirlerWithSira = await ensureGuestSiraNumbers(bugununTarihi, misafirler);

  await addDoc(collection(db, "siparisler"), {
    isim: user.displayName,
    email: user.email,
    uid: user.uid,
    secimler,
    misafirler: misafirlerWithSira,
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
  secimler: string[],
  misafirler?: Misafir[]
): Promise<SubmitOrderResult> {
  const bugununTarihi = getTodayDate();

  await cleanupOldOrders(bugununTarihi);

  const updateResult = await updateOrder(user.uid, secimler, misafirler);

  if (updateResult !== null) {
    return { type: "updated", sira: updateResult.sira ?? null };
  }

  const yeniSira = await createOrder(user, secimler, misafirler ?? []);
  return { type: "created", sira: yeniSira };
}

export async function deleteTodayOrder(uid: string): Promise<boolean> {
  const bugununTarihi = getTodayDate();
  const orderDoc = await getTodayOrderDoc(uid);

  if (!orderDoc) {
    return false;
  }

  const sira = orderDoc.data().sira;
  const misafirler: Misafir[] = orderDoc.data().misafirler ?? [];

  await deleteDoc(orderDoc.ref);

  if (typeof sira === "number") {
    await releaseOrderNumber(bugununTarihi, sira);
  }

  await releaseGuestSiraNumbers(bugununTarihi, misafirler);

  return true;
}

export async function addGuest(
  uid: string,
  isim: string,
  secimler: string[]
): Promise<Misafir> {
  const orderDoc = await getTodayOrderDoc(uid);
  if (!orderDoc) {
    throw new Error("Önce kendi siparişinizi oluşturmalısınız.");
  }

  const mevcutMisafirler: Misafir[] = orderDoc.data().misafirler ?? [];
  const bugununTarihi = getTodayDate();
  const guestSira = await getNextOrderNumber(bugununTarihi);

  const yeniMisafir: Misafir = {
    id: generateGuestId(),
    isim,
    secimler,
    sira: guestSira,
  };

  await updateDoc(orderDoc.ref, {
    misafirler: [...mevcutMisafirler, yeniMisafir],
  });

  return yeniMisafir;
}

export async function updateGuestName(
  uid: string,
  guestId: string,
  isim: string
): Promise<void> {
  const orderDoc = await getTodayOrderDoc(uid);
  if (!orderDoc) throw new Error("Sipariş bulunamadı.");

  const misafirler: Misafir[] = orderDoc.data().misafirler ?? [];
  const guncellenmis = misafirler.map((m) =>
    m.id === guestId ? { ...m, isim } : m
  );

  await updateDoc(orderDoc.ref, { misafirler: guncellenmis });
}

export async function updateGuestOrder(
  uid: string,
  guestId: string,
  secimler: string[]
): Promise<void> {
  const orderDoc = await getTodayOrderDoc(uid);
  if (!orderDoc) throw new Error("Sipariş bulunamadı.");

  const misafirler: Misafir[] = orderDoc.data().misafirler ?? [];
  const guncellenmis = misafirler.map((m) =>
    m.id === guestId ? { ...m, secimler } : m
  );

  await updateDoc(orderDoc.ref, { misafirler: guncellenmis });
}

export async function deleteGuest(uid: string, guestId: string): Promise<void> {
  const orderDoc = await getTodayOrderDoc(uid);
  if (!orderDoc) throw new Error("Sipariş bulunamadı.");

  const misafirler: Misafir[] = orderDoc.data().misafirler ?? [];
  const silinen = misafirler.find((m) => m.id === guestId);
  const guncellenmis = misafirler.filter((m) => m.id !== guestId);

  await updateDoc(orderDoc.ref, { misafirler: guncellenmis });

  if (silinen && typeof silinen.sira === "number") {
    await releaseOrderNumber(getTodayDate(), silinen.sira);
  }
}

export async function getTodayOrders(): Promise<Siparis[]> {
  const bugununTarihi = getTodayDate();

  const q = query(
    collection(db, "siparisler"),
    where("tarih", "==", bugununTarihi),
    orderBy("createdAt", "asc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) => mapSiparisDoc(item));
}

export async function deleteOrder(id: string): Promise<void> {
  const orderRef = doc(db, "siparisler", id);
  const orderSnap = await getDoc(orderRef);

  if (!orderSnap.exists()) {
    await deleteDoc(orderRef);
    return;
  }

  const data = orderSnap.data();

  const sira = data.sira;
  const tarih = data.tarih;

  const misafirler: Misafir[] = Array.isArray(data.misafirler)
    ? data.misafirler
    : [];

  await deleteDoc(orderRef);

  // Ana kullanıcının sıra numarasını serbest bırak
  if (typeof sira === "number" && tarih) {
    await releaseOrderNumber(tarih, sira);
  }

  // Misafirlerin sıra numaralarını da serbest bırak
  if (tarih) {
    await releaseGuestSiraNumbers(
      tarih,
      misafirler
    );
  }
}
