export type MenuData = Record<string, Record<string, string[]>>;

export type AlternatifMenu = {
  yemekler?: string[];
  icecekler?: string[];
  ekmek?: string[];
};

export type HaftalikMenu = {
  [gun: string]: {
    Corbalar: string[];
    AnaYemekler: string[];
    YanUrunler: string[];
    Ekstralar: string[];
    Icecekler: string[];
    Ekmek: string[];
  };
};

export const GUNLER = [
  "Pazar",
  "Pazartesi",
  "Sali",
  "Carsamba",
  "Persembe",
  "Cuma",
  "Cumartesi",
];

export const GUN_ISIMLERI_TURKCE: { [key: string]: string } = {
  pazar: "Pazar",
  pazartesi: "Pazartesi",
  sali: "Salı",
  carsamba: "Çarşamba",
  persembe: "Perşembe",
  cuma: "Cuma",
  cumartesi: "Cumartesi",
};

export const KATEGORI_SIRASI = [
  "Corbalar",
  "AnaYemekler",
  "YanUrunler",
  "Ekstralar",
  "Icecekler",
  "Ekmek",
];

export const BUGUN_MAP: Record<number, string> = {
  1: "Pazartesi",
  2: "Sali",
  3: "Carsamba",
  4: "Persembe",
  5: "Cuma",
  6: "Cumartesi",
};
