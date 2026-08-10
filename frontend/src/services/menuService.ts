import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { AlternatifMenu, HaftalikMenu, MenuData } from "../types/menu";

export async function getActiveMenu(): Promise<MenuData | null> {
  try {
    const aktifMenuRef = doc(db, "menuler", "aktif_menu");
    const snap = await getDoc(aktifMenuRef);
    if (snap.exists()) {
      return snap.data() as MenuData;
    }
    return null;
  } catch (error) {
    console.error("Aktif menü çekilirken hata oluştu:", error);
    return null;
  }
}

export async function getAlternativeMenu(): Promise<AlternatifMenu | null> {
  try {
    const alternatifMenuRef = doc(db, "menuler", "alternatif_menu");
    const snap = await getDoc(alternatifMenuRef);
    if (snap.exists()) {
      return snap.data() as AlternatifMenu;
    }
    return null;
  } catch (error) {
    console.error("Alternatif menü çekilirken hata oluştu:", error);
    return null;
  }
}

export async function fetchMenus(): Promise<{
  aktif: MenuData | null;
  alternatif: AlternatifMenu | null;
}> {
  try {
    const aktifMenuRef = doc(db, "menuler", "aktif_menu");
    const alternatifMenuRef = doc(db, "menuler", "alternatif_menu");

    const [aktifSnap, alternatifSnap] = await Promise.all([
      getDoc(aktifMenuRef),
      getDoc(alternatifMenuRef),
    ]);

    return {
      aktif: aktifSnap.exists() ? (aktifSnap.data() as MenuData) : null,
      alternatif: alternatifSnap.exists()
        ? (alternatifSnap.data() as AlternatifMenu)
        : null,
    };
  } catch (error) {
    console.error("Menüler çekilirken hata oluştu:", error);
    return { aktif: null, alternatif: null };
  }
}

export async function saveHaftalikMenu(haftalikMenu: HaftalikMenu): Promise<void> {
  await updateDoc(doc(db, "menuler", "aktif_menu"), haftalikMenu);
}

export async function saveAlternatifMenu(alternatifMenu: AlternatifMenu): Promise<void> {
  await updateDoc(doc(db, "menuler", "alternatif_menu"), alternatifMenu);
}
