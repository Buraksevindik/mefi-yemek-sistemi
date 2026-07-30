import Admin from "./Admin";
import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./services/firebase";
import { auth } from "./services/firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";

function App() {
  const [menu, setMenu] = useState<any>(null);
  const [secimler, setSecimler] = useState<{ [kategori: string]: string }>({});
  const [secimTipi, setSecimTipi] = useState<"gunluk" | "alternatif" | null>(null);
  const [gonderildi, setGonderildi] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [adminSayfasi, setAdminSayfasi] = useState(false);

  // Alternatif ve İçecek Listesi
  const alternatifYemekler = [
    "Hamburger",
    "Izgara Köfte",
    "Tavuk Izgara",
    "Kayseri Mantısı",
    "Patatesli Mantı",
    "Kahvaltı Tabağı",
    "Menemen",
    "Tost Çeşitleri",
  ];

  const icecekler = ["Ayran", "Kola", "Fanta", "Şalgam", "Su", "İstemiyorum"];

  const siparisiIptalEt = async () => {
    const onay = window.confirm(
      "Siparişinizi iptal etmek istediğinize emin misiniz?"
    );

    if (!onay) return;

    try {
      const bugununTarihi = new Date()
        .toISOString()
        .split("T")[0];

      const q = query(
        collection(db, "siparisler"),
        where("uid", "==", user.uid),
        where("tarih", "==", bugununTarihi)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        alert("Silinecek sipariş bulunamadı.");
        return;
      }

      await deleteDoc(snapshot.docs[0].ref);

      setGonderildi(false);
      setSecimler({});
      setSecimTipi(null);

      alert("Sipariş iptal edildi.");
    } catch (error) {
      console.error(error);
      alert("Sipariş silinemedi.");
    }
  };

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const docRef = doc(db, "menuler", "aktif_menu");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setMenu(docSnap.data());
        } else {
          console.log("Aktif menü bulunamadı!");
        }
      } catch (error) {
        console.error("Menü çekilirken hata oluştu:", error);
      }
    };

    fetchMenu();
  }, []);

  const girisYap = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account",
      });

      const result = await signInWithPopup(auth, provider);
      const kullanici = result.user;

      if (
        !kullanici.email?.endsWith("@akdogan.tech") &&
        kullanici.email !== "sevindikburak2004@gmail.com"
      ) {
        alert("Sadece Akdoğan çalışanları giriş yapabilir.");
        await signOut(auth);
        return;
      }

      setUser(kullanici);
    } catch (error) {
      console.error(error);
    }
  };

  const gunlerIngilizce = [
    "Pazar",
    "Pazartesi",
    "Sali",
    "Carsamba",
    "Persembe",
    "Cuma",
    "Cumartesi",
  ];

  const gunIsimleriTurkce: { [key: string]: string } = {
    pazar: "Pazar",
    pazartesi: "Pazartesi",
    sali: "Salı",
    carsamba: "Çarşamba",
    persembe: "Perşembe",
    cuma: "Cuma",
    cumartesi: "Cumartesi",
  };

  const bugunIndex = new Date().getDay();
  const bugunKey = gunlerIngilizce[bugunIndex];

  const bugununMenusu = menu?.[bugunKey];
  const adminMi = user?.email === "sevindikburak2004@gmail.com";
  
  const SIPARIS_BITIS_SAATI = 20;
  const SIPARIS_BITIS_DAKIKA = 30;

  const simdi = new Date();
  const bitisSaati = new Date();
  bitisSaati.setHours(SIPARIS_BITIS_SAATI, SIPARIS_BITIS_DAKIKA, 0, 0);

  const siparisKapali = simdi > bitisSaati;

  const yemekSec = (kategori: string, yemek: string) => {
    setSecimler((prev) => ({
      ...prev,
      [kategori]: prev[kategori] === yemek ? "" : yemek,
    }));
  };

  const siparisiOnayla = async () => {
    if (siparisKapali) {
      alert("Bugünkü sipariş süresi sona ermiştir.");
      return;
    }

    const gecerliSecimler = Object.values(secimler).filter(
      (yemek) => yemek !== ""
    );

    if (gecerliSecimler.length === 0) {
      alert("Lütfen en az bir yemek seçin!");
      return;
    }

    try {
      const siparislerRef = collection(db, "siparisler");
      const bugununTarihi = new Date().toISOString().split("T")[0];

      const q = query(
        siparislerRef,
        where("uid", "==", user.uid),
        where("tarih", "==", bugununTarihi)
      );

      const mevcutSiparis = await getDocs(q);

      if (!mevcutSiparis.empty) {
        const siparisDoc = mevcutSiparis.docs[0];
        await updateDoc(siparisDoc.ref, {
          secimler: gecerliSecimler,
        });

        alert("Siparişiniz güncellendi.");
        setGonderildi(true);
        return;
      }

      await addDoc(collection(db, "siparisler"), {
        isim: user.displayName,
        email: user.email,
        uid: user.uid,
        secimler: gecerliSecimler,
        tarih: bugununTarihi,
      });

      setGonderildi(true);
    } catch (error) {
      console.error("Sipariş gönderilemedi:", error);
      alert("Bir hata oluştu.");
    }
  };

  if (adminSayfasi) {
    return <Admin geriDon={() => setAdminSayfasi(false)} />;
  }

  if (!user) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h1>MEFİ Menü Sistemi</h1>
        <button onClick={girisYap} style={{ padding: "10px 20px", fontSize: "16px", cursor: "pointer" }}>
          Google ile Giriş Yap
        </button>
      </div>
    );
  }

  if (gonderildi) {
    return (
      <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto", fontFamily: "sans-serif" }}>
        <h2>✅ Siparişiniz oluşturuldu.</h2>
        <h3>Siparişiniz:</h3>
        <ul>
          {Object.values(secimler)
            .filter(Boolean)
            .map((yemek, i) => (
              <li key={i}>{yemek}</li>
            ))}
        </ul>

        <button onClick={() => setGonderildi(false)}>Siparişi Düzenle</button>
        <button
          onClick={siparisiIptalEt}
          style={{ marginLeft: "10px", background: "#dc3545", color: "white", border: "none", padding: "8px 12px", borderRadius: "4px", cursor: "pointer" }}
        >
          Siparişi İptal Et
        </button>
        {adminMi && (
          <button
            onClick={() => setAdminSayfasi(true)}
            style={{ marginLeft: "10px", background: "#28a745", color: "white", border: "none", padding: "8px 12px", borderRadius: "4px", cursor: "pointer" }}
          >
            Admin Paneline Git
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "20px",
        maxWidth: "600px",
        margin: "0 auto",
        fontFamily: "sans-serif",
      }}
    >
      <h1>MEFİ Menü & Sipariş</h1>

      <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
        {adminMi && (
          <button onClick={() => setAdminSayfasi(true)}>Admin Paneli</button>
        )}
        <button
          onClick={async () => {
            await signOut(auth);
            setUser(null);
          }}
          style={{ background: "#6c757d", color: "white", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer" }}
        >
          Çıkış Yap
        </button>
      </div>

      {/* SEÇİM TİPİ SEÇME EKRANI (Günün Menüsü vs Alternatif Menü) */}
      {!secimTipi ? (
        <div style={{ background: "#f8f9fa", padding: "20px", borderRadius: "8px", border: "1px solid #ddd", textAlign: "center" }}>
          <h3>Nasıl devam etmek istersiniz?</h3>
          <div style={{ display: "flex", gap: "15px", justifyContent: "center", marginTop: "20px" }}>
            <button
              onClick={() => {
                setSecimTipi("gunluk");
                setSecimler({}); // Alternatif seçimleri sıfırla
              }}
              style={{ padding: "12px 20px", background: "#007BFF", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "15px" }}
            >
              📅 Bugünün Menüsü ({gunIsimleriTurkce[bugunKey]})
            </button>
            <button
              onClick={() => {
                setSecimTipi("alternatif");
                setSecimler({}); // Günlük menü seçimlerini sıfırla
              }}
              style={{ padding: "12px 20px", background: "#ffc107", color: "#000", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "15px", fontWeight: "bold" }}
            >
              🍔 Alternatif / Alakart Seçenekler
            </button>
          </div>
        </div>
      ) : (
        <div>
          <button
            onClick={() => {
              setSecimTipi(null);
              setSecimler({});
            }}
            style={{ marginBottom: "15px", padding: "6px 10px", cursor: "pointer" }}
          >
            ⬅ Menü Seçimine Geri Dön
          </button>

          {/* 1. GÜNLÜK MENÜ GÖRÜNÜMÜ */}
          {secimTipi === "gunluk" && (
            <div>
              {!menu ? (
                <p>Menü yükleniyor...</p>
              ) : !bugununMenusu ? (
                <p>Bugüne ait menü bulunamadı.</p>
              ) : (
                <div>
                  <h3>{gunIsimleriTurkce[bugunKey]} Menüsü (Her kategoriden en fazla 1 tane):</h3>
                  {Object.keys(bugununMenusu)
                    .filter((kategori) => Array.isArray(bugununMenusu[kategori]))
                    .map((kategori) => (
                      <div
                        key={kategori}
                        style={{
                          marginBottom: "20px",
                          padding: "15px",
                          border: "1px solid #ddd",
                          borderRadius: "8px",
                          background: "#fff",
                        }}
                      >
                        <h4 style={{ textTransform: "capitalize", color: "#333", marginTop: 0 }}>
                          {kategori}
                        </h4>
                        <ul style={{ listStyleType: "none", padding: 0 }}>
                          {bugununMenusu[kategori].map((yemek: string, index: number) => {
                            const seciliMi = secimler[kategori] === yemek;
                            return (
                              <li key={index} style={{ margin: "10px 0", display: "flex", alignItems: "center", gap: "10px" }}>
                                <button
                                  onClick={() => yemekSec(kategori, yemek)}
                                  style={{
                                    background: seciliMi ? "#4CAF50" : "#f0f0f0",
                                    color: seciliMi ? "#fff" : "#000",
                                    padding: "6px 12px",
                                    border: "1px solid #ccc",
                                    cursor: "pointer",
                                    borderRadius: "4px",
                                    minWidth: "90px",
                                  }}
                                >
                                  {seciliMi ? "✓ Seçildi" : "+ Seç"}
                                </button>
                                <span>{yemek}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* 2. ALTERNATİF / ALAKART MENÜ GÖRÜNÜMÜ */}
          {secimTipi === "alternatif" && (
            <div>
              <h3>Alternatif Ana Yemek Seçimi (1 Adet Seçiniz):</h3>
              <div style={{ marginBottom: "20px", padding: "15px", border: "1px solid #ddd", borderRadius: "8px", background: "#fff" }}>
                <ul style={{ listStyleType: "none", padding: 0 }}>
                  {alternatifYemekler.map((yemek, index) => {
                    const seciliMi = secimler["Alternatif Yemek"] === yemek;
                    return (
                      <li key={index} style={{ margin: "10px 0", display: "flex", alignItems: "center", gap: "10px" }}>
                        <button
                          onClick={() => yemekSec("Alternatif Yemek", yemek)}
                          style={{
                            background: seciliMi ? "#4CAF50" : "#f0f0f0",
                            color: seciliMi ? "#fff" : "#000",
                            padding: "6px 12px",
                            border: "1px solid #ccc",
                            cursor: "pointer",
                            borderRadius: "4px",
                            minWidth: "90px",
                          }}
                        >
                          {seciliMi ? "✓ Seçildi" : "+ Seç"}
                        </button>
                        <span>{yemek}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <h3>İçecek Seçimi (1 Adet Seçiniz):</h3>
              <div style={{ marginBottom: "20px", padding: "15px", border: "1px solid #ddd", borderRadius: "8px", background: "#fff" }}>
                <ul style={{ listStyleType: "none", padding: 0 }}>
                  {icecekler.map((icecek, index) => {
                    const seciliMi = secimler["İçecek"] === icecek;
                    return (
                      <li key={index} style={{ margin: "10px 0", display: "flex", alignItems: "center", gap: "10px" }}>
                        <button
                          onClick={() => yemekSec("İçecek", icecek)}
                          style={{
                            background: seciliMi ? "#4CAF50" : "#f0f0f0",
                            color: seciliMi ? "#fff" : "#000",
                            padding: "6px 12px",
                            border: "1px solid #ccc",
                            cursor: "pointer",
                            borderRadius: "4px",
                            minWidth: "90px",
                          }}
                        >
                          {seciliMi ? "✓ Seçildi" : "+ Seç"}
                        </button>
                        <span>{icecek}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}

          {/* SEÇİMLER VE ONAY KISMI */}
          <div style={{ marginTop: "20px", padding: "15px", background: "#f9f9f9", borderRadius: "8px", border: "1px solid #eee" }}>
            <h4>Seçimleriniz:</h4>
            <pre style={{ background: "#fff", padding: "10px", borderRadius: "4px" }}>
              {JSON.stringify(secimler, null, 2)}
            </pre>

            <button
              onClick={siparisiOnayla}
              disabled={siparisKapali}
              style={{
                marginTop: "10px",
                background: siparisKapali ? "#999" : "#007BFF",
                color: "#fff",
                padding: "12px 20px",
                border: "none",
                cursor: siparisKapali ? "not-allowed" : "pointer",
                borderRadius: "4px",
                fontSize: "16px",
                width: "100%",
                fontWeight: "bold",
              }}
            >
              {siparisKapali ? "Sipariş Süresi Doldu" : "Siparişi Onayla ve Gönder"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;