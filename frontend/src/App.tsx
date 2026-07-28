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
  const [gonderildi, setGonderildi] = useState(false);
  const [user, setUser] = useState<any>(null);
  const adminModu = true;


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
  const gunler = [
    "Pazar",
    "Pazartesi",
    "Sali",
    "Carsamba",
    "Persembe",
    "Cuma",
    "Cumartesi",
  ];

  const bugun = gunler[new Date().getDay()];
  const bugununMenusu = menu?.[bugun];

  const yemekSec = (kategori: string, yemek: string) => {
    setSecimler((prev) => ({
      ...prev,
      [kategori]: prev[kategori] === yemek ? "" : yemek,
    }));
  };

  const siparisiOnayla = async () => {
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
  alert("Bugün zaten sipariş verdiniz.");
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
  if (adminModu) {
  return <Admin />;
}
if (!user) {
  return (
    <div style={{ padding: "20px" }}>
      <h1>MEFİ Menü Sistemi</h1>

      <button onClick={girisYap}>
        Google ile Giriş Yap
      </button>
    </div>
  );
}

  if (gonderildi) {
    return (
      <div style={{ padding: "20px" }}>
        <h2>Siparişiniz başarıyla alındı! Afiyet olsun.</h2>
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

<button
  onClick={async () => {
    await signOut(auth);
    setUser(null);
  }}
>
  Çıkış Yap
</button>

      {!menu ? (
        <p>Menü yükleniyor...</p>
      ) : !bugununMenusu ? (
        <p>Bugüne ait menü bulunamadı.</p>
      ) : (
        <div>
          <h3>{bugun} Menüsü (Her kategoriden en fazla 1 tane):</h3>

          {Object.keys(bugununMenusu).map((kategori) => (
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
              <h4
                style={{
                  textTransform: "capitalize",
                  color: "#333",
                  marginTop: 0,
                }}
              >
                {kategori}
              </h4>

              <ul
                style={{
                  listStyleType: "none",
                  padding: 0,
                }}
              >
                {bugununMenusu[kategori].map(
                  (yemek: string, index: number) => {
                    const seciliMi = secimler[kategori] === yemek;

                    return (
                      <li
                        key={index}
                        style={{
                          margin: "10px 0",
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
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
                  }
                )}
              </ul>
            </div>
          ))}

          <div
            style={{
              marginTop: "20px",
              padding: "15px",
              background: "#f9f9f9",
              borderRadius: "8px",
              border: "1px solid #eee",
            }}
          >
            <h4>Seçimleriniz:</h4>

            <pre
              style={{
                background: "#fff",
                padding: "10px",
                borderRadius: "4px",
              }}
            >
              {JSON.stringify(secimler, null, 2)}
            </pre>

            <button
              onClick={siparisiOnayla}
              style={{
                marginTop: "10px",
                background: "#007BFF",
                color: "#fff",
                padding: "12px 20px",
                border: "none",
                cursor: "pointer",
                borderRadius: "4px",
                fontSize: "16px",
                width: "100%",
                fontWeight: "bold",
              }}
            >
              Siparişi Onayla ve Gönder
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;