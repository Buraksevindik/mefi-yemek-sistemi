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

function Admin({ geriDon }: any) {
  const [siparisler, setSiparisler] = useState<any[]>([]);
  const [mesaj, setMesaj] = useState("");
  const [sayfa, setSayfa] = useState<
    "menu" | "alternatif" | "siparisler"
  >("menu");
  
  const [alternatifMenu, setAlternatifMenu] = useState<any>({
    yemekler: [],
    icecekler: [],
  });

  const [yeniYemekInput, setYeniYemekInput] = useState("");
  const [yeniIcecekInput, setYeniIcecekInput] = useState("");
  
  const [duzenlenenYemekIndex, setDuzenlenenYemekIndex] = useState<number | null>(null);
  const [duzenlenenYemekMetin, setDuzenlenenYemekMetin] = useState("");

  const [duzenlenenIcecekIndex, setDuzenlenenIcecekIndex] = useState<number | null>(null);
  const [duzenlenenIcecekMetin, setDuzenlenenIcecekMetin] = useState("");

  useEffect(() => {
    const fetchAlternatifMenu = async () => {
      const alternatifRef = doc(db, "menuler", "alternatif_menu");
      const alternatifSnap = await getDoc(alternatifRef);

      if (alternatifSnap.exists()) {
        setAlternatifMenu(alternatifSnap.data());
      }
    };

    const fetchSiparisler = async () => {
      const bugununTarihi = new Date().toISOString().split("T")[0];
      const q = query(
        collection(db, "siparisler"),
        where("tarih", "==", bugununTarihi)
      );

      const snapshot = await getDocs(q);
      const veriler = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setSiparisler(veriler);
    };

    fetchSiparisler();
    fetchAlternatifMenu();
  }, []);

  const yemekSayilari: { [key: string]: number } = {};
  siparisler.forEach((siparis) => {
    siparis.secimler?.forEach((yemek: string) => {
      yemekSayilari[yemek] = (yemekSayilari[yemek] || 0) + 1;
    });
  });

  const toplamKisi = siparisler.length;

  const siparisSil = async (id: string) => {
    const onay = window.confirm("Bu siparişi silmek istediğinize emin misiniz?");
    if (!onay) return;

    try {
      await deleteDoc(doc(db, "siparisler", id));
      setSiparisler((prev) => prev.filter((siparis) => siparis.id !== id));
      alert("Sipariş silindi.");
    } catch (error) {
      console.error(error);
      alert("Silme sırasında hata oluştu.");
    }
  };

  const mesajOlustur = () => {
    let metin = "MEFİ YEMEK SİPARİŞLERİ\n\n";
    Object.entries(yemekSayilari).forEach(([yemek, adet]) => {
      metin += `${yemek} : ${adet}\n`;
    });
    metin += `\nToplam Kişi: ${toplamKisi}`;
    setMesaj(metin);
  };

  const alternatifMenuyuKaydet = async () => {
    try {
      await updateDoc(doc(db, "menuler", "alternatif_menu"), alternatifMenu);
      alert("Alternatif menü güncellendi.");
    } catch (err) {
      console.error(err);
      alert("Kaydedilemedi.");
    }
  };

  // Yemek İşlemleri
  const yemekSil = (index: number) => {
    const yeniListe = [...alternatifMenu.yemekler];
    yeniListe.splice(index, 1);
    setAlternatifMenu({ ...alternatifMenu, yemekler: yeniListe });
  };

  const yemekEkle = () => {
    if (!yeniYemekInput.trim()) return;
    setAlternatifMenu({
      ...alternatifMenu,
      yemekler: [...alternatifMenu.yemekler, yeniYemekInput.trim()],
    });
    setYeniYemekInput("");
  };

  const yemekDuzenleKaydet = (index: number) => {
    if (!duzenlenenYemekMetin.trim()) return;
    const yeniListe = [...alternatifMenu.yemekler];
    yeniListe[index] = duzenlenenYemekMetin.trim();
    setAlternatifMenu({ ...alternatifMenu, yemekler: yeniListe });
    setDuzenlenenYemekIndex(null);
    setDuzenlenenYemekMetin("");
  };

  // İçecek İşlemleri
  const icecekSil = (index: number) => {
    const yeniListe = [...alternatifMenu.icecekler];
    yeniListe.splice(index, 1);
    setAlternatifMenu({ ...alternatifMenu, icecekler: yeniListe });
  };

  const icecekEkle = () => {
    if (!yeniIcecekInput.trim()) return;
    setAlternatifMenu({
      ...alternatifMenu,
      icecekler: [...alternatifMenu.icecekler, yeniIcecekInput.trim()],
    });
    setYeniIcecekInput("");
  };

  const icecekDuzenleKaydet = (index: number) => {
    if (!duzenlenenIcecekMetin.trim()) return;
    const yeniListe = [...alternatifMenu.icecekler];
    yeniListe[index] = duzenlenenIcecekMetin.trim();
    setAlternatifMenu({ ...alternatifMenu, icecekler: yeniListe });
    setDuzenlenenIcecekIndex(null);
    setDuzenlenenIcecekMetin("");
  };

  if (sayfa === "menu") {
    return (
      <div style={{ padding: "20px" }}>
        <button onClick={geriDon}>← Sipariş Ekranına Dön</button>
        <h1>Admin Paneli</h1>
        <div style={{ display: "flex", gap: "20px", marginTop: "30px" }}>
          <button
            onClick={() => setSayfa("alternatif")}
            style={{
              padding: "20px",
              width: "250px",
              fontSize: "18px",
              borderRadius: "12px",
              border: "none",
              background: "#ffc107",
              cursor: "pointer",
            }}
          >
            Alternatif Menü Yönetimi
          </button>
          <button
            onClick={() => setSayfa("siparisler")}
            style={{
              padding: "20px",
              width: "250px",
              fontSize: "18px",
              borderRadius: "12px",
              border: "none",
              background: "#007bff",
              color: "white",
              cursor: "pointer",
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
      <div style={{ padding: "20px", maxWidth: "600px" }}>
        <button onClick={() => setSayfa("menu")}>← Geri</button>
        <h1>Alternatif Menü Yönetimi</h1>

        {/* YEMEKLER */}
        <h2>🍔 Yemekler</h2>
        {alternatifMenu.yemekler?.map((yemek: string, index: number) => (
          <div
            key={index}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px",
              border: "1px solid #ddd",
              marginBottom: "10px",
              borderRadius: "6px",
            }}
          >
            {duzenlenenYemekIndex === index ? (
              <div style={{ display: "flex", gap: "10px", flex: 1, marginRight: "10px" }}>
                <input
                  type="text"
                  value={duzenlenenYemekMetin}
                  onChange={(e) => setDuzenlenenYemekMetin(e.target.value)}
                  style={{ flex: 1, padding: "5px" }}
                />
                <button onClick={() => yemekDuzenleKaydet(index)}>Kaydet</button>
                <button onClick={() => setDuzenlenenYemekIndex(null)}>İptal</button>
              </div>
            ) : (
              <>
                <span>{yemek}</span>
                <div>
                  <button
                    onClick={() => {
                      setDuzenlenenYemekIndex(index);
                      setDuzenlenenYemekMetin(yemek);
                    }}
                    style={{ marginRight: "5px" }}
                  >
                    Düzenle
                  </button>
                  <button onClick={() => yemekSil(index)} style={{ background: "#ff4d4d", color: "white", border: "none", padding: "5px 10px", borderRadius: "4px" }}>
                    Sil
                  </button>
                </div>
              </>
            )}
          </div>
        ))}

        {/* Yeni Yemek Ekleme Alanı */}
        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
          <input
            type="text"
            placeholder="Yeni yemek adı"
            value={yeniYemekInput}
            onChange={(e) => setYeniYemekInput(e.target.value)}
            style={{ flex: 1, padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
          />
          <button onClick={yemekEkle} style={{ padding: "8px 15px", background: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
            + Yeni Yemek
          </button>
        </div>

        {/* İÇECEKLER */}
        <h2 style={{ marginTop: "40px" }}>🥤 İçecekler</h2>
        {alternatifMenu.icecekler?.map((icecek: string, index: number) => (
          <div
            key={index}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px",
              border: "1px solid #ddd",
              marginBottom: "10px",
              borderRadius: "6px",
            }}
          >
            {duzenlenenIcecekIndex === index ? (
              <div style={{ display: "flex", gap: "10px", flex: 1, marginRight: "10px" }}>
                <input
                  type="text"
                  value={duzenlenenIcecekMetin}
                  onChange={(e) => setDuzenlenenIcecekMetin(e.target.value)}
                  style={{ flex: 1, padding: "5px" }}
                />
                <button onClick={() => icecekDuzenleKaydet(index)}>Kaydet</button>
                <button onClick={() => setDuzenlenenIcecekIndex(null)}>İptal</button>
              </div>
            ) : (
              <>
                <span>{icecek}</span>
                <div>
                  <button
                    onClick={() => {
                      setDuzenlenenIcecekIndex(index);
                      setDuzenlenenIcecekMetin(icecek);
                    }}
                    style={{ marginRight: "5px" }}
                  >
                    Düzenle
                  </button>
                  <button onClick={() => icecekSil(index)} style={{ background: "#ff4d4d", color: "white", border: "none", padding: "5px 10px", borderRadius: "4px" }}>
                    Sil
                  </button>
                </div>
              </>
            )}
          </div>
        ))}

        {/* Yeni İçecek Ekleme Alanı */}
        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
          <input
            type="text"
            placeholder="Yeni içecek adı"
            value={yeniIcecekInput}
            onChange={(e) => setYeniIcecekInput(e.target.value)}
            style={{ flex: 1, padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
          />
          <button onClick={icecekEkle} style={{ padding: "8px 15px", background: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
            + Yeni İçecek
          </button>
        </div>

        <br /><br />
        <button
          onClick={alternatifMenuyuKaydet}
          style={{ padding: "12px 20px", background: "#007bff", color: "white", border: "none", borderRadius: "6px", fontSize: "16px", cursor: "pointer", width: "100%" }}
        >
          Değişiklikleri Veritabanına Kaydet
        </button>
      </div>
    );
  }

  if (sayfa === "siparisler") {
    return (
      <div style={{ padding: "20px" }}>
        <button onClick={() => setSayfa("menu")}>← Geri</button>
        <h1>Admin Paneli</h1>
        <h2>Toplam Sipariş Özeti</h2>

        <button
          onClick={mesajOlustur}
          style={{ marginTop: "15px", padding: "10px 15px", cursor: "pointer" }}
        >
          Mesaj Oluştur
        </button>

        {mesaj && (
          <div style={{ marginTop: "20px" }}>
            <h3>Oluşturulan Mesaj</h3>
            <pre style={{ background: "#f4f4f4", padding: "15px", borderRadius: "8px" }}>
              {mesaj}
            </pre>
            <button
              onClick={() => {
                navigator.clipboard.writeText(mesaj);
                alert("Mesaj panoya kopyalandı!");
              }}
            >
              Mesajı Kopyala
            </button>
          </div>
        )}

        <ul>
          {Object.entries(yemekSayilari).map(([yemek, adet]) => (
            <li key={yemek}>
              {yemek} : {adet}
            </li>
          ))}
        </ul>

        <p>
          <strong>Toplam Sipariş Veren Kişi:</strong> {toplamKisi}
        </p>

        {siparisler.map((siparis) => (
          <div
            key={siparis.id}
            style={{
              border: "1px solid #ddd",
              padding: "15px",
              marginBottom: "15px",
              borderRadius: "8px",
            }}
          >
            <h3>{siparis.isim}</h3>
            <button
              onClick={() => siparisSil(siparis.id)}
              style={{
                background: "#dc3545",
                color: "white",
                border: "none",
                padding: "8px 12px",
                borderRadius: "4px",
                cursor: "pointer",
                marginBottom: "10px",
              }}
            >
              Siparişi Sil
            </button>
            <p>{siparis.email}</p>
            <ul>
              {siparis.secimler?.map((yemek: string, index: number) => (
                <li key={index}>{yemek}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }
}

export default Admin;