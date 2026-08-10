import type { User } from "firebase/auth";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { ADMIN_EMAIL } from "../types/user";

export async function checkUserPermission(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;

  if (email.endsWith("@akdogan.tech") || email.endsWith("@comnify.tech")) {
    return true;
  }

  if (email === ADMIN_EMAIL) {
    return true;
  }

  try {
    const userDocRef = doc(db, "stajyerler", email);
    const userDocSnap = await getDoc(userDocRef);
    return userDocSnap.exists();
  } catch (error) {
    console.error("Kullanıcı yetki kontrolü sırasında hata:", error);
    return false;
  }
}

export function isAdmin(user: User | null): boolean {
  return user?.email === ADMIN_EMAIL;
}

export async function girisYap(): Promise<void> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: "select_account",
  });
  await signInWithPopup(auth, provider);
}

export async function cikisYap(): Promise<void> {
  await signOut(auth);
}

export function subscribeToAuthState(
  onAuthorizedUser: (user: User) => void,
  onUnauthorized: () => void,
  onLoadingComplete: () => void
): () => void {
  return onAuthStateChanged(auth, async (currentUser) => {
    if (!currentUser) {
      onUnauthorized();
      onLoadingComplete();
      return;
    }

    const izinliMi = await checkUserPermission(currentUser.email);

    if (!izinliMi) {
      await signOut(auth);
      onUnauthorized();
      onLoadingComplete();
      alert("Bu sisteme erişim yetkiniz bulunmamaktadır.");
      return;
    }

    onAuthorizedUser(currentUser);
    onLoadingComplete();
  });
}
