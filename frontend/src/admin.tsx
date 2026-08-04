import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
  updateDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "./services/firebase";

type AdminProps = {
  geriDon: () => void;
};
function Admin({ geriDon }: AdminProps) {
  const styles = {
  page: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "30px",
    fontFamily: "Segoe UI, sans-serif",
  },

  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },

  primaryButton: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "10px 16px",
    borderRadius: "8px",
    cursor: "pointer",
  },

  successButton: {
    background: "#16a34a",
    color: "#fff",
    border: "none",
    padding: "10px 16px",
    borderRadius: "8px",
    cursor: "pointer",
  },

 dangerButton: {
  background: "#dc2626",
  color: "#fff",
  border: "none",
  padding: "10px 16px",
  borderRadius: "8px",
  cursor: "pointer",
},
secondaryButton: {
  background: "#6b7280",
  color: "#fff",
  border: "none",
  padding: "10px 16px",
  borderRadius: "8px",
  cursor: "pointer",
},

  warningButton: {
    background: "#f59e0b",
    color: "#fff",
    border: "none",
    padding: "10px 16px",
    borderRadius: "8px",
    cursor: "pointer",
  },
};
type Siparis = {
  id: string;
  isim: string;
  email: string;
  secimler: string[];
  tarih: string;
};
type HaftalikMenu = {
  [gun: string]: {
    Corbalar: string[];
    AnaYemekler: string[];
    YanUrunler: string[];
    Ekstralar: string[];
  };
};

const [haftalikMenu, setHaftalikMenu] =
  useState<HaftalikMenu | null>(null);
const [siparisler, setSiparisler] =
  useState<Siparis[]>([]);
  const [mesaj, setMesaj] = useState("");
  const [sayfa, setSayfa] = useState<
  "menu" |
  "alternatif" |
  "siparisler" |
  "haftalikmenu"
>("menu");
type AlternatifMenu = {
  yemekler: string[];
  icecekler: string[];
};
const [alternatifMenu, setAlternatifMenu] =
  useState<AlternatifMenu>({
    yemekler: [],
    icecekler: [],
  });

const bugunIndex = new Date().getDay();

const bugunMap: Record<number, string> = {
  1: "Pazartesi",
  2: "Sali",
  3: "Carsamba",
  4: "Persembe",
  5: "Cuma",
  6: "Cumartesi",
};
const kategoriSirasi = [
  "Corbalar",
  "AnaYemekler",
  "YanUrunler",
  "Ekstralar",
];
const [yeniYemek, setYeniYemek] = useState("");
const [yeniIcecek, setYeniIcecek] = useState("");

const [aktifGun, setAktifGun] =
  useState(
    bugunMap[bugunIndex]);

  useEffect(() => {
    const fetchHaftalikMenu = async () => {
  const menuRef = doc(
    db,
    "menuler",
    "aktif_menu"
  );

  const snap = await getDoc(menuRef);
console.log(snap.data());
  if (snap.exists()) {
    setHaftalikMenu(
      snap.data() as HaftalikMenu
    );
  }
};
fetchHaftalikMenu();
    const fetchAlternatifMenu = async () => {
  const alternatifRef = doc(
    db,
    "menuler",
    "alternatif_menu"
  );

  const alternatifSnap = await getDoc(
    alternatifRef
  );

  if (alternatifSnap.exists()) {
  setAlternatifMenu(
    alternatifSnap.data() as AlternatifMenu
  );
}
};
    const fetchSiparisler = async () => {
      const bugununTarihi = new Date()
        .toISOString()
        .split("T")[0];

      const q = query(
        collection(db, "siparisler"),
        where("tarih", "==", bugununTarihi)
      );

      const snapshot = await getDocs(q);

const veriler: Siparis[] = snapshot.docs.map((doc) => ({
  id: doc.id,
  ...(doc.data() as Omit<Siparis, "id">),
}));

      setSiparisler(veriler);
    };

    fetchSiparisler();
    fetchAlternatifMenu();
  }, []);

  const yemekSayilari: { [key: string]: number } = {};

  siparisler.forEach((siparis) => {
    siparis.secimler?.forEach((yemek: string) => {
      yemekSayilari[yemek] =
        (yemekSayilari[yemek] || 0) + 1;
    });
  });

  const toplamKisi = siparisler.length;

  const siparisSil = async (id: string) => {
    const onay = window.confirm(
      "Bu siparişi silmek istediğinize emin misiniz?"
    );

    if (!onay) return;

    try {
      await deleteDoc(doc(db, "siparisler", id));

      setSiparisler((prev) =>
        prev.filter(
          (siparis) => siparis.id !== id
        )
      );

      alert("Sipariş silindi.");
    } catch (error) {
      console.error(error);
      alert("Silme sırasında hata oluştu.");
    }
  };

  const mesajOlustur = () => {
    let metin = "MEFİ YEMEK SİPARİŞLERİ\n\n";

    Object.entries(yemekSayilari).forEach(
      ([yemek, adet]) => {
        metin += `${yemek} : ${adet}\n`;
      }
    );

    metin += `\nToplam Kişi: ${toplamKisi}`;

    setMesaj(metin);
  };

  const alternatifMenuyuKaydet = async () => {
  try {
    await updateDoc(
      doc(db, "menuler", "alternatif_menu"),
      alternatifMenu
    );

    alert("Alternatif menü güncellendi.");
  } catch (err) {
    console.error(err);
    alert("Kaydedilemedi.");
  }
};
const haftalikMenuKaydet = async () => {
  try {
    await updateDoc(
      doc(db, "menuler", "aktif_menu"),
      haftalikMenu!
    );

    alert("Haftalık menü güncellendi.");
  } catch (err) {
    console.error(err);
    alert("Kaydedilemedi.");
  }
};

const yemekSil = (index: number) => {
  const yeniListe = [...alternatifMenu.yemekler];

  yeniListe.splice(index, 1);

  setAlternatifMenu({
    ...alternatifMenu,
    yemekler: yeniListe,
  });
};

const icecekSil = (index: number) => {
  const yeniListe = [...alternatifMenu.icecekler];

  yeniListe.splice(index, 1);

  setAlternatifMenu({
    ...alternatifMenu,
    icecekler: yeniListe,
  });
};


if (sayfa === "menu") {
  return (
    <div style={styles.page}>
<button
  onClick={geriDon}
  style={{
    padding: "10px 16px",
    fontSize: "15px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    background: "#2563eb",
    color: "white",
    marginBottom: "15px",
  }}
>
  ← Sipariş Ekranına Geri Dön
</button>

      <h1>Admin Paneli</h1>

<div

  style={{
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(280px,1fr))",
    gap: "24px",
    marginTop: "30px",
  }}
>
  <button
  onClick={() => setSayfa("haftalikmenu")}
  style={{
    ...styles.successButton,
    width: "100%",
    padding: "30px",
    fontSize: "20px",
  }}
>
  🗓️ Haftalık Menü Yönetimi
</button>
<button
  onClick={() => setSayfa("alternatif")}
  style={{
    ...styles.warningButton,
    width: "100%",
    padding: "30px",
    fontSize: "20px",
  }}
>
  🍔 Alternatif Menü Yönetimi
</button>

<button
  onClick={() => setSayfa("siparisler")}
  style={{
    ...styles.primaryButton,
    width: "100%",
    padding: "30px",
    fontSize: "20px",
  }}
>
  📋 Siparişleri Görüntüle
</button>
      </div>
    </div>
  );
}

if (sayfa === "alternatif") {
  return (
    <div style={styles.page}>
      <button
        onClick={() =>
          setSayfa("menu")
        }
      >
        ← Geri
      </button>

      <h1>Alternatif Menü Yönetimi</h1>

      <h2>🍔 Yemekler</h2>

      {alternatifMenu.yemekler?.map(
        (yemek: string, index: number) => (
<div
  key={index}
  style={{
    ...styles.card,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  }}
>
            <span>{yemek}</span>

            <div
  style={{
    display: "flex",
    gap: "8px",
  }}
>
 

  <button
    style={styles.dangerButton}
    onClick={() => yemekSil(index)}
  >
    Sil
  </button>
</div>
          </div>
        )
      )}

<div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
  <input
    value={yeniYemek}
    onChange={(e) => setYeniYemek(e.target.value)}
    placeholder="Yemek adı"
  />

  <button
    style={styles.successButton}
    onClick={() => {
      if (!yeniYemek.trim()) return;

      setAlternatifMenu({
        ...alternatifMenu,
        yemekler: [
          ...alternatifMenu.yemekler,
          yeniYemek,
        ],
      });

      setYeniYemek("");
    }}
  >
    + Ekle
  </button>
</div>

      <h2 style={{ marginTop: "40px" }}>
        🥤 İçecekler
      </h2>

      {alternatifMenu.icecekler?.map(
        (
          icecek: string,
          index: number
        ) => (
<div
  key={index}
  style={{
    ...styles.card,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  }}
>
            <span>{icecek}</span>

            <div
  style={{
    display: "flex",
    gap: "8px",
  }}
>


<button
  style={styles.dangerButton}
  onClick={() => icecekSil(index)}
>
                Sil
              </button>
            </div>
          </div>
        )
      )}

      <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
  <input
    value={yeniIcecek}
    onChange={(e) => setYeniIcecek(e.target.value)}
    placeholder="İçecek adı"
  />

  <button
    style={styles.successButton}
    onClick={() => {
      if (!yeniIcecek.trim()) return;

      setAlternatifMenu({
        ...alternatifMenu,
        icecekler: [
          ...alternatifMenu.icecekler,
          yeniIcecek,
        ],
      });

      setYeniIcecek("");
    }}
  >
    + Ekle
  </button>
</div>

      <br />
      <br />

<button
  style={{
    ...styles.successButton,
    width: "100%",
    marginTop: "30px",
    fontSize: "18px",
    padding: "14px",
  }}
  onClick={alternatifMenuyuKaydet}
>
         Kaydet
      </button>
    </div>
  );
}
if (
  sayfa === "haftalikmenu" &&
  haftalikMenu
) {
  const menu = haftalikMenu[aktifGun];

  return (
    <div style={styles.page}>
      <button
        onClick={() => setSayfa("menu")}
        style={{
          ...styles.secondaryButton,
          marginBottom: "20px",
        }}
      >
        ← Geri
      </button>

      <h1>Haftalık Menü Yönetimi</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "220px 1fr",
          gap: "25px",
          marginTop: "20px",
        }}
      >
        {/* SOL MENÜ */}

        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            padding: "10px",
            border: "1px solid #ddd",
          }}
        >
          {Object.values(bugunMap).map((gun) => (
            <button
              key={gun}
              onClick={() => setAktifGun(gun)}
              style={{
                width: "100%",
                padding: "12px",
                marginBottom: "8px",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",

                background:
                  aktifGun === gun
                    ? "#2563eb"
                    : "#f3f4f6",

                color:
                  aktifGun === gun
                    ? "white"
                    : "#111",
              }}
            >
              {gun}
            </button>
          ))}
        </div>

        {/* SAĞ TARAF */}

        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            padding: "20px",
            border: "1px solid #ddd",
          }}
        >
          <h2
            style={{
              color: "#2563eb",
              marginBottom: "20px",
            }}
          >
            📅 {aktifGun}
          </h2>

          {kategoriSirasi.map((kategori) => {
  const yemekler =
    menu[
      kategori as keyof typeof menu
    ];

  if (!yemekler) return null;

  return (
              <div
                key={kategori}
                style={{
                  marginBottom: "25px",
                }}
              >
                <h3
                  style={{
                    background: "#eff6ff",
                    padding: "10px",
                    borderRadius: "8px",
                  }}
                >
                  {kategori}
                </h3>

                {yemekler.map(
                  (yemek, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        gap: "10px",
                        marginTop: "8px",
                      }}
                    >
                      <input
                        value={yemek}
                        onChange={(e) => {
                          const yeniMenu = JSON.parse(
  JSON.stringify(haftalikMenu)
);

                          (
                            yeniMenu[
                              aktifGun
                            ][
                              kategori as keyof typeof yeniMenu[typeof aktifGun]
                            ]
                          )[index] =
                            e.target.value;

                          setHaftalikMenu(
                            yeniMenu
                          );
                        }}
                        style={{
                          flex: 1,
                          padding: "10px",
                        }}
                      />

                      <button
                        style={
                          styles.dangerButton
                        }
                        onClick={() => {
                          const yeniMenu =
                            {
                              ...haftalikMenu,
                            };

                          (
                            yeniMenu[
                              aktifGun
                            ][
                              kategori as keyof typeof yeniMenu[typeof aktifGun]
                            ]
                          ).splice(index, 1);

                          setHaftalikMenu({
                            ...yeniMenu,
                          });
                        }}
                      >
                        Sil
                      </button>
                    </div>
                  )
                )}

                <button
                  style={{
                    ...styles.successButton,
                    marginTop: "10px",
                  }}
                  onClick={() => {
                    const yeniMenu = {
                      ...haftalikMenu,
                    };

                    (
                      yeniMenu[
                        aktifGun
                      ][
                        kategori as keyof typeof yeniMenu[typeof aktifGun]
                      ]
                    ).push("");

                    setHaftalikMenu({
                      ...yeniMenu,
                    });
                  }}
                >
                  + Yeni Ekle
                </button>
              </div>
);
})}
        </div>
      </div>

      <button
        onClick={haftalikMenuKaydet}
        style={{
          ...styles.successButton,
          width: "100%",
          marginTop: "25px",
          fontSize: "18px",
        }}
      >
        Kaydet
      </button>
    </div>
  );
}

 if (sayfa === "siparisler") { return (
    <div style={styles.page}>
<button
  onClick={() => setSayfa("menu")}
>
  ← Geri
</button>

      <h1>Admin Paneli</h1>

      <h2>Toplam Sipariş Özeti</h2>

      <button
        onClick={mesajOlustur}
style={styles.warningButton}
      >
        Mesaj Oluştur
      </button>

      {mesaj && (
        <div
  style={{
    ...styles.card,
    marginTop: "20px",
  }}
>
          <h3>Oluşturulan Mesaj</h3>

          <pre
            style={{
              background: "#f4f4f4",
              padding: "15px",
              borderRadius: "8px",
            }}
          >
            {mesaj}
          </pre>

          <button
            onClick={() => {
              navigator.clipboard.writeText(
                mesaj
              );
              alert(
                "Mesaj panoya kopyalandı!"
              );
            }}
          >
            Mesajı Kopyala
          </button>
        </div>
      )}
<div style={styles.card}>
      <ul>
        {Object.entries(yemekSayilari).map(
          ([yemek, adet]) => (
            <li key={yemek}>
              {yemek} : {adet}
            </li>
          )
        )}
      </ul>
</div>
      <p>
        <strong>
          Toplam Sipariş Veren Kişi:
        </strong>{" "}
        {toplamKisi}
      </p>

      {siparisler.map((siparis) => (
<div
  key={siparis.id}
  style={styles.card}
>
          <h3>{siparis.isim}</h3>

          <button
            onClick={() =>
              siparisSil(siparis.id)
            }
style={styles.dangerButton}
          >
            Siparişi Sil
          </button>

          <p>{siparis.email}</p>

          <ul>
            {siparis.secimler?.map(
              (
                yemek: string,
                index: number
              ) => (
                <li key={index}>
                  {yemek}
                </li>
              )
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}
}

export default Admin;