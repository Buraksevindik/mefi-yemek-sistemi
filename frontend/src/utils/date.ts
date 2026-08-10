export function getTodayDate(): string {
  return new Date().toLocaleDateString("sv-SE", {
    timeZone: "Europe/Istanbul",
  });
}

export const SIPARIS_BITIS_SAATI = 20;
export const SIPARIS_BITIS_DAKIKA = 30;

export function isSiparisKapali(): boolean {
  const simdi = new Date();
  const bitisSaati = new Date();
  bitisSaati.setHours(SIPARIS_BITIS_SAATI, SIPARIS_BITIS_DAKIKA, 0, 0);
  return simdi > bitisSaati;
}
