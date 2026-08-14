export type Misafir = {
  id: string;
  isim: string;
  secimler: string[];
  sira?: number;
};

export type Siparis = {
  id: string;
  isim: string;
  email: string;
  uid?: string;
  tarih: string;
  secimler: string[];
  sira?: number;
  misafirler?: Misafir[];
  secimTipi?: "gunluk" | "alternatif";
};

export type PendingGuest = {
  id: string;
  isim: string;
  secimler: { [kategori: string]: string };
  secimTipi: "gunluk" | "alternatif";
};

export type CateringEntry = {
  sira: number;
  secimler: string[];
};
