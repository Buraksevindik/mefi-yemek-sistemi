  import Admin from "./admin";
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
    onAuthStateChanged,
  } from "firebase/auth";

  function App() {
    const styles = {
  page: {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "30px",
    fontFamily: "Segoe UI, sans-serif",
  },

  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "16px",
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
};
    const [menu, setMenu] = useState<any>(null);
    const [alternatifMenu, setAlternatifMenu] = useState<any>(null);
    const [secimler, setSecimler] = useState<{ [kategori: string]: string }>({});
    const [secimTipi, setSecimTipi] = useState<"gunluk" | "alternatif" | null>(null);
    const [gonderildi, setGonderildi] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [adminSayfasi, setAdminSayfasi] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    
    
    if (!user) return;

  const fetchMenu = async () => {
    try {
      const aktifMenuRef = doc(db, "menuler", "aktif_menu");
      const alternatifMenuRef = doc(db, "menuler", "alternatif_menu");

      const [aktifSnap, alternatifSnap] = await Promise.all([
        getDoc(aktifMenuRef),
        getDoc(alternatifMenuRef),
      ]);

      if (aktifSnap.exists()) {
        setMenu(aktifSnap.data());
      }

      if (alternatifSnap.exists()) {
        setAlternatifMenu(alternatifSnap.data());
      }

    } catch (error) {
      console.error("Menüler çekilirken hata oluştu:", error);
    }
  };

    fetchMenu();
  }, [user]);


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

    const gunler = [
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
    const bugunKey = gunler[bugunIndex];
    

    const bugununMenusu = menu?.[bugunKey];
    const kategoriSirasi = [
  "Corbalar",
  "AnaYemekler",
  "YanUrunler",
  "Ekstralar",
];
  const adminMi =
    user &&
    user.email === "sevindikburak2004@gmail.com";
    
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

  if (authLoading) {
    return <div>Yükleniyor...</div>;
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
  <div style={styles.page}>
          <h2>✅ Siparişiniz oluşturuldu.</h2>
          <h3>Siparişiniz:</h3>
<ul>
  {Object.entries(secimler)
    .filter(([_, value]) => value)
    .map(([key, value]) => (
      <li key={key}>
        <strong>{key}:</strong> {value}
      </li>
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
  <div style={styles.page}>
        <h1>MEFİ Menü & Sipariş</h1>

        <div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  }}
>
          {adminMi && (
            <button
  style={styles.primaryButton}
  onClick={() => setAdminSayfasi(true)}
>
  Admin Paneli
</button>
          )}
<button
  style={{
    ...styles.dangerButton,
    background: "#6b7280",
  }}
  onClick={async () => {
    await signOut(auth);
    setUser(null);
  }}
>
  Çıkış Yap
</button>
        </div>

        {/* SEÇİM TİPİ SEÇME EKRANI (Günün Menüsü vs Alternatif Menü) */}
        {!secimTipi ? (
        <div style={styles.card}>
            <h3>Nasıl devam etmek istersiniz?</h3>
            <div style={{ display: "flex", gap: "15px", justifyContent: "center", marginTop: "20px" }}>
              <button
                onClick={() => {
                  setSecimTipi("gunluk");
                  setSecimler({}); // Alternatif seçimleri sıfırla
                }}
               style={styles.primaryButton}
              >
                📅 Bugünün Menüsü ({gunIsimleriTurkce[bugunKey]})
              </button>
              <button
                onClick={() => {
                  setSecimTipi("alternatif");
                  setSecimler({}); // Günlük menü seçimlerini sıfırla
                }}
                style={{
  ...styles.primaryButton,
  background: "#f59e0b",
}}
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
             style={{
  ...styles.primaryButton,
  background: "#6b7280",
  marginBottom: "15px",
}}
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
                    {kategoriSirasi
  .filter((kategori) => Array.isArray(bugununMenusu[kategori]))
  .map((kategori) => (
                        <div
                          key={kategori}
     style={styles.card}
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
  ...styles.primaryButton,
  background: seciliMi ? "#16a34a" : "#2563eb",
  minWidth: "100px",
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
            {secimTipi === "alternatif" && alternatifMenu && (
              <div>
                <div style={styles.card}>
  <h3>🍔 Alternatif Ana Yemek</h3>
                  <ul style={{ listStyleType: "none", padding: 0 }}>
                  {alternatifMenu?.yemekler?.map((yemek: string, index: number) => {
                      const seciliMi = secimler["Alternatif Yemek"] === yemek;
                      return (
                        <li key={index} style={{ margin: "10px 0", display: "flex", alignItems: "center", gap: "10px" }}>
                          <button
                            onClick={() => yemekSec("Alternatif Yemek", yemek)}
                            style={{
  ...styles.primaryButton,
  background: seciliMi ? "#16a34a" : "#2563eb",
  minWidth: "100px",
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

<div style={styles.card}>
  <h3>🥤 İçecek Seçimi</h3>
                  <ul style={{ listStyleType: "none", padding: 0 }}>
                  {alternatifMenu?.icecekler?.map((icecek: string, index: number) => {
                      const seciliMi = secimler["İçecek"] === icecek;
                      return (
                        <li key={index} style={{ margin: "10px 0", display: "flex", alignItems: "center", gap: "10px" }}>
                          <button
                            onClick={() => yemekSec("İçecek", icecek)}
style={{
  ...styles.primaryButton,
  background: seciliMi ? "#16a34a" : "#2563eb",
  minWidth: "100px",
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
            <div
  style={{
    ...styles.card,
    marginTop: "20px",
  }}
>
              <h4>Seçimleriniz:</h4>
             <ul>
  {Object.values(secimler)
    .filter(Boolean)
    .map((item, i) => (
      <li key={i}>{item}</li>
    ))}
</ul>

              <button
                onClick={siparisiOnayla}
                disabled={siparisKapali}
                style={{
  ...styles.primaryButton,
  width: "100%",
  marginTop: "10px",
  background: siparisKapali ? "#9ca3af" : "#2563eb",
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