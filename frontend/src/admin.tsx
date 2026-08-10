import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
  updateDoc,
  doc,
  setDoc,
  orderBy,
  getDoc,
} from "firebase/firestore";

import { db } from "./services/firebase";


// ============================================================
// TYPES
// ============================================================

type AdminProps = {
  geriDon: () => void;
};

type Stajyer = {
  id: string;
  email: string;
};

type Siparis = {
  id: string;
  isim: string;
  email: string;
  secimler: string[];
  tarih: string;
  sira?: number;
};

type HaftalikMenu = {
  [gun: string]: {
    Corbalar: string[];
    AnaYemekler: string[];
    YanUrunler: string[];
    Ekstralar: string[];
    Icecekler: string[];
    Ekmek: string[];
  };
};

type SchedulerJob = {
  id: string;
  baslik: string;
  hour: number;
  minute: number;
};

type AlternatifMenu = {
  ekmek: string[];
  yemekler: string[];
  icecekler: string[];
};


// ============================================================
// SABITLER
// ============================================================

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
  "Icecekler",
  "Ekmek",
];


// ============================================================
// ADMIN COMPONENT
// ============================================================

function Admin({ geriDon }: AdminProps) {

  // ============================================================
  // STATE
  // ============================================================

  const [yeniYemek, setYeniYemek] = useState("");
  const [yeniIcecek, setYeniIcecek] = useState("");
  const [yeniEkmek, setYeniEkmek] = useState("");

  const [alternatifMenu, setAlternatifMenu] =
    useState<AlternatifMenu>({
      yemekler: [],
      icecekler: [],
      ekmek: [],
    });

  const [gorevler, setGorevler] =
    useState<SchedulerJob[]>([]);

  const [kapaliGunler, setKapaliGunler] =
    useState<string[]>([]);

  const [yeniKapaliGun, setYeniKapaliGun] =
    useState("");

  const [seciliJob, setSeciliJob] =
    useState("gunlukSiparisOzeti");

  const [schedulerSaat, setSchedulerSaat] =
    useState(15);

  const [schedulerDakika, setSchedulerDakika] =
    useState(52);

  const [haftalikMenu, setHaftalikMenu] =
    useState<HaftalikMenu | null>(null);

  const [siparisler, setSiparisler] =
    useState<Siparis[]>([]);

  const [mesaj, setMesaj] =
    useState("");

  const [sayfa, setSayfa] = useState<
    | "menu"
    | "alternatif"
    | "siparisler"
    | "haftalikmenu"
    | "stajyerler"
    | "scheduler"
  >("menu");

  const [stajyerler, setStajyerler] =
    useState<Stajyer[]>([]);

  const [yeniEmail, setYeniEmail] =
    useState("");

  const [aktifGun, setAktifGun] =
    useState(bugunMap[bugunIndex]);


  // ============================================================
  // STYLES
  // ============================================================

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


  // ============================================================
  // SCHEDULERLARI GETIR
  // ============================================================

  const loadSchedulers = async () => {

    try {

      const response = await fetch(
        "https://us-central1-mefi-yemek-sistemi.cloudfunctions.net/getSchedulers"
      );

      const data = await response.json();

      console.log("Scheduler Response:", data);

      setGorevler(data);

    } catch (err) {

      console.error(
        "Schedulerlar alınamadı:",
        err
      );

    }

  };


  // ============================================================
  // ILK VERILERI FIREBASE'DEN CEK
  // ============================================================

  useEffect(() => {

    // ------------------------------------------------------------
    // KAPALI GUNLER
    // ------------------------------------------------------------

    const fetchKapaliGunler = async () => {

      try {

        const snapshot =
          await getDocs(
            collection(
              db,
              "kapaliGunler"
            )
          );

        setKapaliGunler(
          snapshot.docs
            .map((item) => item.id)
            .sort()
        );

      } catch (error) {

        console.error(
          "Kapalı günler alınamadı:",
          error
        );

      }

    };


    // ------------------------------------------------------------
    // HAFTALIK MENU
    // ------------------------------------------------------------

    const fetchHaftalikMenu = async () => {

      try {

        const menuRef =
          doc(
            db,
            "menuler",
            "aktif_menu"
          );

        const snap =
          await getDoc(menuRef);

        if (snap.exists()) {

          setHaftalikMenu(
            snap.data() as HaftalikMenu
          );

        }

      } catch (error) {

        console.error(
          "Haftalık menü alınamadı:",
          error
        );

      }

    };


    // ------------------------------------------------------------
    // ALTERNATIF MENU
    // ------------------------------------------------------------

    const fetchAlternatifMenu = async () => {

      try {

        const alternatifRef =
          doc(
            db,
            "menuler",
            "alternatif_menu"
          );

        const snap =
          await getDoc(
            alternatifRef
          );

        if (snap.exists()) {

          setAlternatifMenu(
            snap.data() as AlternatifMenu
          );

        }

      } catch (error) {

        console.error(
          "Alternatif menü alınamadı:",
          error
        );

      }

    };


    // ------------------------------------------------------------
    // SIPARISLER
    // ------------------------------------------------------------

    const fetchSiparisler = async () => {

      try {

        const bugununTarihi =
          new Date().toLocaleDateString(
            "sv-SE",
            {
              timeZone:
                "Europe/Istanbul",
            }
          );

        const q =
          query(
            collection(
              db,
              "siparisler"
            ),
            where(
              "tarih",
              "==",
              bugununTarihi
            ),
            orderBy(
              "createdAt",
              "asc"
            )
          );

        const snapshot =
          await getDocs(q);

        const veriler: Siparis[] =
          snapshot.docs.map(
            (item) => ({
              id: item.id,
              ...(item.data() as Omit<
                Siparis,
                "id"
              >),
            })
          );

        setSiparisler(veriler);

      } catch (error) {

        console.error(
          "Siparişler alınamadı:",
          error
        );

      }

    };


    // ------------------------------------------------------------
    // STAJYERLER
    // ------------------------------------------------------------

    const fetchStajyerler = async () => {

      try {

        const snapshot =
          await getDocs(
            collection(
              db,
              "stajyerler"
            )
          );

        const liste: Stajyer[] =
          snapshot.docs.map(
            (item) => ({
              id: item.id,
              ...(item.data() as {
                email: string;
              }),
            })
          );

        setStajyerler(liste);

      } catch (error) {

        console.error(
          "Stajyerler alınamadı:",
          error
        );

      }

    };


    // ------------------------------------------------------------
    // HEPSINI YUKLE
    // ------------------------------------------------------------

    const loadData = async () => {

      await Promise.all([
        fetchHaftalikMenu(),
        fetchAlternatifMenu(),
        fetchSiparisler(),
        fetchStajyerler(),
        loadSchedulers(),
        fetchKapaliGunler(),
      ]);

    };

    loadData();

  }, []);


  // ============================================================
  // KAPALI GUN EKLE
  // ============================================================

  const kapaliGunEkle = async () => {

    if (!yeniKapaliGun) {

      alert(
        "Lütfen bir tarih seçin."
      );

      return;

    }

    try {

      await setDoc(
        doc(
          db,
          "kapaliGunler",
          yeniKapaliGun
        ),
        {
          tarih: yeniKapaliGun,
        }
      );

      setKapaliGunler(
        (prev) =>
          [...prev, yeniKapaliGun]
            .sort()
      );

      setYeniKapaliGun("");

      alert(
        "Kapalı gün eklendi."
      );

    } catch (error) {

      console.error(
        "Kapalı gün ekleme hatası:",
        error
      );

      alert(
        "Kapalı gün eklenemedi."
      );

    }

  };


  // ============================================================
  // KAPALI GUN SIL
  // ============================================================

  const kapaliGunSil = async (
    tarih: string
  ) => {

    try {

      await deleteDoc(
        doc(
          db,
          "kapaliGunler",
          tarih
        )
      );

      setKapaliGunler(
        (prev) =>
          prev.filter(
            (gun) =>
              gun !== tarih
          )
      );

      alert(
        "Kapalı gün kaldırıldı."
      );

    } catch (error) {

      console.error(
        "Kapalı gün silme hatası:",
        error
      );

      alert(
        "Kapalı gün kaldırılamadı."
      );

    }

  };


  // ============================================================
  // YEMEK SAYILARI
  // ============================================================

  const yemekSayilari: {
    [key: string]: number;
  } = {};

  siparisler.forEach(
    (siparis) => {

      siparis.secimler?.forEach(
        (yemek: string) => {

          yemekSayilari[yemek] =
            (yemekSayilari[yemek] || 0) + 1;

        }
      );

    }
  );

  const toplamKisi =
    siparisler.length;


  // ============================================================
  // SIPARIS SIL
  // ============================================================

  const siparisSil = async (
    id: string
  ) => {

    const onay =
      window.confirm(
        "Bu siparişi silmek istediğinize emin misiniz?"
      );

    if (!onay) return;

    try {

      await deleteDoc(
        doc(
          db,
          "siparisler",
          id
        )
      );

      setSiparisler(
        (prev) =>
          prev.filter(
            (siparis) =>
              siparis.id !== id
          )
      );

      alert(
        "Sipariş silindi."
      );

    } catch (error) {

      console.error(error);

      alert(
        "Silme sırasında hata oluştu."
      );

    }

  };


  // ============================================================
  // MESAJ OLUSTUR
  // ============================================================

  const mesajOlustur = () => {

    let metin = "";

    siparisler.forEach(
      (siparis) => {

        metin +=
          `${siparis.sira ?? "-"}. \n`;

        metin +=
          siparis.secimler.join(
            "\n"
          );

        metin +=
          "\n\n";

      }
    );

    setMesaj(metin);

  };


  // ============================================================
  // ALTERNATIF MENU KAYDET
  // ============================================================

  const alternatifMenuyuKaydet =
    async () => {

      try {

        await updateDoc(
          doc(
            db,
            "menuler",
            "alternatif_menu"
          ),
          alternatifMenu
        );

        alert(
          "Alternatif menü güncellendi."
        );

      } catch (err) {

        console.error(err);

        alert(
          "Kaydedilemedi."
        );

      }

    };


  // ============================================================
  // HAFTALIK MENU KAYDET
  // ============================================================

  const haftalikMenuKaydet =
    async () => {

      if (!haftalikMenu) {

        alert(
          "Haftalık menü bulunamadı."
        );

        return;

      }

      try {

        await updateDoc(
          doc(
            db,
            "menuler",
            "aktif_menu"
          ),
          haftalikMenu
        );

        alert(
          "Haftalık menü güncellendi."
        );

      } catch (err) {

        console.error(err);

        alert(
          "Kaydedilemedi."
        );

      }

    };


  // ============================================================
  // ALTERNATIF YEMEK SIL
  // ============================================================

  const yemekSil = (
    index: number
  ) => {

    const yeniListe =
      [...alternatifMenu.yemekler];

    yeniListe.splice(
      index,
      1
    );

    setAlternatifMenu({
      ...alternatifMenu,
      yemekler:
        yeniListe,
    });

  };


  // ============================================================
  // ALTERNATIF EKMEK SIL
  // ============================================================

  const ekmekSil = (
    index: number
  ) => {

    const yeniListe =
      [...alternatifMenu.ekmek];

    yeniListe.splice(
      index,
      1
    );

    setAlternatifMenu({
      ...alternatifMenu,
      ekmek:
        yeniListe,
    });

  };


  // ============================================================
  // ALTERNATIF ICECEK SIL
  // ============================================================

  const icecekSil = (
    index: number
  ) => {

    const yeniListe =
      [...alternatifMenu.icecekler];

    yeniListe.splice(
      index,
      1
    );

    setAlternatifMenu({
      ...alternatifMenu,
      icecekler:
        yeniListe,
    });

  };


  // ============================================================
  // SCHEDULER GUNCELLE
  // ============================================================

  const scheduleGuncelle =
    async (
      jobName: string,
      hour: number,
      minute: number
    ) => {

      try {

        const response =
          await fetch(
            "https://us-central1-mefi-yemek-sistemi.cloudfunctions.net/updateScheduler",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  jobName,
                  hour,
                  minute,
                }),
            }
          );

        const sonuc =
          await response.json();

        if (sonuc.success) {

          await loadSchedulers();

          alert(
            "Zamanlama başarıyla güncellendi!"
          );

        } else {

          alert(
            "Hata: " +
            sonuc.error
          );

        }

      } catch (err) {

        console.error(
          "Güncelleme hatası:",
          err
        );

        alert(
          "Bağlantı hatası oluştu."
        );

      }

    };


  // ============================================================
  // ANA MENU
  // ============================================================

  if (sayfa === "menu") {

    return (

      <div style={styles.page}>

        <button
          onClick={geriDon}
          style={{
            padding:
              "10px 16px",

            fontSize:
              "15px",

            borderRadius:
              "8px",

            border:
              "none",

            cursor:
              "pointer",

            background:
              "#2563eb",

            color:
              "white",

            marginBottom:
              "15px",
          }}
        >
          ← Sipariş Ekranına Geri Dön
        </button>


        <h1>
          Admin Paneli
        </h1>


        <div
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "repeat(auto-fit,minmax(280px,1fr))",

            gap:
              "24px",

            marginTop:
              "30px",
          }}
        >

          <button
            onClick={() =>
              setSayfa(
                "haftalikmenu"
              )
            }
            style={{
              ...styles.successButton,
              width:
                "100%",
              padding:
                "30px",
              fontSize:
                "20px",
            }}
          >
            🗓️ Haftalık Menü Yönetimi
          </button>


          <button
            onClick={() =>
              setSayfa(
                "alternatif"
              )
            }
            style={{
              ...styles.warningButton,
              width:
                "100%",
              padding:
                "30px",
              fontSize:
                "20px",
            }}
          >
            🍔 Alternatif Menü Yönetimi
          </button>


          <button
            onClick={() =>
              setSayfa(
                "siparisler"
              )
            }
            style={{
              ...styles.primaryButton,
              width:
                "100%",
              padding:
                "30px",
              fontSize:
                "20px",
            }}
          >
            📋 Siparişleri Görüntüle
          </button>


          <button
            onClick={() =>
              setSayfa(
                "scheduler"
              )
            }
            style={{
              background:
                "#7c3aed",

              color:
                "#fff",

              border:
                "none",

              borderRadius:
                "8px",

              cursor:
                "pointer",

              width:
                "100%",

              padding:
                "30px",

              fontSize:
                "20px",
            }}
          >
            ⏰ Zamanlayıcı Yönetimi
          </button>


          <button
            onClick={() =>
              setSayfa(
                "stajyerler"
              )
            }
            style={{
              background:
                "#dc2626",

              color:
                "#fff",

              border:
                "none",

              borderRadius:
                "8px",

              cursor:
                "pointer",

              width:
                "100%",

              padding:
                "30px",

              fontSize:
                "20px",
            }}
          >
            👨‍💼 Stajyer Yönetimi
          </button>

        </div>

      </div>

    );

  }


  // ============================================================
  // ALTERNATIF MENU
  // ============================================================

  if (sayfa === "alternatif") {

    return (

      <div style={styles.page}>

        <button
          onClick={() =>
            setSayfa("menu")
          }
          style={
            styles.secondaryButton
          }
        >
          ← Geri
        </button>


        <h1>
          Alternatif Menü Yönetimi
        </h1>


        {/* YEMEKLER */}

        <h2>
          🍔 Yemekler
        </h2>


        {alternatifMenu.yemekler?.map(
          (
            yemek,
            index
          ) => (

            <div
              key={index}
              style={{
                ...styles.card,

                display:
                  "flex",

                justifyContent:
                  "space-between",

                alignItems:
                  "center",
              }}
            >

              <span>
                {yemek}
              </span>


              <button
                style={
                  styles.dangerButton
                }
                onClick={() =>
                  yemekSil(index)
                }
              >
                Sil
              </button>

            </div>

          )
        )}


        <div
          style={{
            display:
              "flex",

            gap:
              "10px",

            marginTop:
              "15px",
          }}
        >

          <input
            value={yeniYemek}
            onChange={(e) =>
              setYeniYemek(
                e.target.value
              )
            }
            placeholder="Yemek adı"
          />


          <button
            style={
              styles.successButton
            }
            onClick={() => {

              if (
                !yeniYemek.trim()
              )
                return;

              setAlternatifMenu({
                ...alternatifMenu,

                yemekler: [
                  ...alternatifMenu.yemekler,
                  yeniYemek.trim(),
                ],
              });

              setYeniYemek("");

            }}
          >
            + Ekle
          </button>

        </div>


        {/* ICECEKLER */}

        <h2
          style={{
            marginTop:
              "40px",
          }}
        >
          🥤 İçecekler
        </h2>


        {alternatifMenu.icecekler?.map(
          (
            icecek,
            index
          ) => (

            <div
              key={index}
              style={{
                ...styles.card,

                display:
                  "flex",

                justifyContent:
                  "space-between",

                alignItems:
                  "center",
              }}
            >

              <span>
                {icecek}
              </span>


              <button
                style={
                  styles.dangerButton
                }
                onClick={() =>
                  icecekSil(index)
                }
              >
                Sil
              </button>

            </div>

          )
        )}


        <div
          style={{
            display:
              "flex",

            gap:
              "10px",

            marginTop:
              "15px",
          }}
        >

          <input
            value={yeniIcecek}
            onChange={(e) =>
              setYeniIcecek(
                e.target.value
              )
            }
            placeholder="İçecek adı"
          />


          <button
            style={
              styles.successButton
            }
            onClick={() => {

              if (
                !yeniIcecek.trim()
              )
                return;

              setAlternatifMenu({
                ...alternatifMenu,

                icecekler: [
                  ...alternatifMenu.icecekler,
                  yeniIcecek.trim(),
                ],
              });

              setYeniIcecek("");

            }}
          >
            + Ekle
          </button>

        </div>


        {/* EKMEKLER */}

        <h2
          style={{
            marginTop:
              "40px",
          }}
        >
          🍞 Ekmekler
        </h2>


        {alternatifMenu.ekmek?.map(
          (
            ekmek,
            index
          ) => (

            <div
              key={index}
              style={{
                ...styles.card,

                display:
                  "flex",

                justifyContent:
                  "space-between",

                alignItems:
                  "center",
              }}
            >

              <span>
                {ekmek}
              </span>


              <button
                style={
                  styles.dangerButton
                }
                onClick={() =>
                  ekmekSil(index)
                }
              >
                Sil
              </button>

            </div>

          )
        )}


        <div
          style={{
            display:
              "flex",

            gap:
              "10px",

            marginTop:
              "15px",
          }}
        >

          <input
            value={yeniEkmek}
            onChange={(e) =>
              setYeniEkmek(
                e.target.value
              )
            }
            placeholder="Ekmek adı"
          />


          <button
            style={
              styles.successButton
            }
            onClick={() => {

              if (
                !yeniEkmek.trim()
              )
                return;

              setAlternatifMenu({
                ...alternatifMenu,

                ekmek: [
                  ...alternatifMenu.ekmek,
                  yeniEkmek.trim(),
                ],
              });

              setYeniEkmek("");

            }}
          >
            + Ekle
          </button>

        </div>


        <button
          style={{
            ...styles.successButton,

            width:
              "100%",

            marginTop:
              "30px",

            fontSize:
              "18px",

            padding:
              "14px",
          }}
          onClick={
            alternatifMenuyuKaydet
          }
        >
          Kaydet
        </button>

      </div>

    );

  }


  // ============================================================
  // HAFTALIK MENU
  // ============================================================

  if (
    sayfa === "haftalikmenu" &&
    haftalikMenu
  ) {

    const menu =
      haftalikMenu[
        aktifGun
      ];

    return (

      <div
        style={styles.page}
      >

        <button
          onClick={() =>
            setSayfa("menu")
          }
          style={{
            ...styles.secondaryButton,
            marginBottom:
              "20px",
          }}
        >
          ← Geri
        </button>


        <h1>
          Haftalık Menü Yönetimi
        </h1>


        <div
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "220px 1fr",

            gap:
              "25px",

            marginTop:
              "20px",
          }}
        >

          {/* SOL MENU */}

          <div
            style={{
              background:
                "#fff",

              borderRadius:
                "12px",

              padding:
                "10px",

              border:
                "1px solid #ddd",
            }}
          >

            {Object.values(
              bugunMap
            ).map(
              (gun) => (

                <button
                  key={gun}
                  onClick={() =>
                    setAktifGun(gun)
                  }
                  style={{
                    width:
                      "100%",

                    padding:
                      "12px",

                    marginBottom:
                      "8px",

                    border:
                      "none",

                    borderRadius:
                      "8px",

                    cursor:
                      "pointer",

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

              )
            )}

          </div>


          {/* SAG TARAF */}

          <div
            style={{
              background:
                "#fff",

              borderRadius:
                "12px",

              padding:
                "20px",

              border:
                "1px solid #ddd",
            }}
          >

            <h2
              style={{
                color:
                  "#2563eb",

                marginBottom:
                  "20px",
              }}
            >
              📅 {aktifGun}
            </h2>


            {kategoriSirasi.map(
              (kategori) => {

                const yemekler =
                  menu[
                    kategori as keyof typeof menu
                  ];

                if (!yemekler)
                  return null;


                return (

                  <div
                    key={kategori}
                    style={{
                      marginBottom:
                        "25px",
                    }}
                  >

                    <h3
                      style={{
                        background:
                          "#eff6ff",

                        padding:
                          "10px",

                        borderRadius:
                          "8px",
                      }}
                    >
                      {kategori}
                    </h3>


                    {yemekler.map(
                      (
                        yemek,
                        index
                      ) => (

                        <div
                          key={index}
                          style={{
                            display:
                              "flex",

                            gap:
                              "10px",

                            marginTop:
                              "8px",
                          }}
                        >

                          <input
                            value={yemek}
                            onChange={(e) => {

                              const yeniMenu =
                                JSON.parse(
                                  JSON.stringify(
                                    haftalikMenu
                                  )
                                );

                              yeniMenu[
                                aktifGun
                              ][
                                kategori as keyof typeof yeniMenu[typeof aktifGun]
                              ][index] =
                                e.target.value;

                              setHaftalikMenu(
                                yeniMenu
                              );

                            }}
                            style={{
                              flex:
                                1,

                              padding:
                                "10px",
                            }}
                          />


                          <button
                            style={
                              styles.dangerButton
                            }
                            onClick={() => {

                              const yeniMenu =
                                JSON.parse(
                                  JSON.stringify(
                                    haftalikMenu
                                  )
                                );

                              yeniMenu[
                                aktifGun
                              ][
                                kategori as keyof typeof yeniMenu[typeof aktifGun]
                              ].splice(
                                index,
                                1
                              );

                              setHaftalikMenu(
                                yeniMenu
                              );

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
                        marginTop:
                          "10px",
                      }}
                      onClick={() => {

                        const yeniMenu =
                          JSON.parse(
                            JSON.stringify(
                              haftalikMenu
                            )
                          );

                        yeniMenu[
                          aktifGun
                        ][
                          kategori as keyof typeof yeniMenu[typeof aktifGun]
                        ].push("");

                        setHaftalikMenu(
                          yeniMenu
                        );

                      }}
                    >
                      + Yeni Ekle
                    </button>

                  </div>

                );

              }
            )}

          </div>

        </div>


        <button
          onClick={
            haftalikMenuKaydet
          }
          style={{
            ...styles.successButton,

            width:
              "100%",

            marginTop:
              "25px",

            fontSize:
              "18px",
          }}
        >
          Kaydet
        </button>

      </div>

    );

  }


  // ============================================================
  // STAJYERLER
  // ============================================================

  if (
    sayfa === "stajyerler"
  ) {

    return (

      <div
        style={styles.page}
      >

        <button
          onClick={() =>
            setSayfa("menu")
          }
          style={
            styles.secondaryButton
          }
        >
          ← Geri
        </button>


        <h1>
          👨‍💼 Stajyer Yönetimi
        </h1>


        <div
          style={{
            display:
              "flex",

            gap:
              "10px",

            marginBottom:
              "20px",
          }}
        >

          <input
            type="email"
            placeholder="Google Mail Adresi"
            value={yeniEmail}
            onChange={(e) =>
              setYeniEmail(
                e.target.value
              )
            }
            style={{
              flex:
                1,

              padding:
                "10px",
            }}
          />


          <button
            style={
              styles.successButton
            }
            onClick={async () => {

              if (
                !yeniEmail.trim()
              )
                return;

              try {

                const temizEmail =
                  yeniEmail
                    .trim()
                    .toLowerCase();


                await setDoc(
                  doc(
                    db,
                    "stajyerler",
                    temizEmail
                  ),
                  {
                    email:
                      temizEmail,
                  }
                );


                setStajyerler(
                  (prev) => [
                    ...prev,
                    {
                      id:
                        temizEmail,

                      email:
                        temizEmail,
                    },
                  ]
                );


                setYeniEmail("");

                alert(
                  "Stajyer eklendi."
                );

              } catch (error) {

                console.error(
                  error
                );

                alert(
                  "Stajyer eklenirken hata oluştu."
                );

              }

            }}
          >
            Ekle
          </button>

        </div>


        {stajyerler.map(
          (stajyer) => (

            <div
              key={stajyer.id}
              style={{
                ...styles.card,

                display:
                  "flex",

                justifyContent:
                  "space-between",

                alignItems:
                  "center",
              }}
            >

              <span>
                {stajyer.email}
              </span>


              <button
                style={
                  styles.dangerButton
                }
                onClick={async () => {

                  try {

                    await deleteDoc(
                      doc(
                        db,
                        "stajyerler",
                        stajyer.id
                      )
                    );

                    setStajyerler(
                      (prev) =>
                        prev.filter(
                          (s) =>
                            s.id !==
                            stajyer.id
                        )
                    );

                  } catch (error) {

                    console.error(
                      error
                    );

                    alert(
                      "Stajyer silinemedi."
                    );

                  }

                }}
              >
                Sil
              </button>

            </div>

          )
        )}

      </div>

    );

  }


  // ============================================================
  // SCHEDULER
  // ============================================================

  if (
    sayfa === "scheduler"
  ) {

    return (

      <div
        style={styles.page}
      >

        <button
          onClick={() =>
            setSayfa("menu")
          }
          style={
            styles.secondaryButton
          }
        >
          ← Geri
        </button>


        <h1>
          ⏰ Zamanlayıcı (Scheduler) Yönetimi
        </h1>


        <div
          style={{
            display:
              "flex",

            gap:
              "20px",

            marginTop:
              "20px",

            flexWrap:
              "wrap",
          }}
        >

          {/* GOREVLER */}

          <div
            style={{
              ...styles.card,

              flex:
                1,

              minWidth:
                "280px",
            }}
          >

            <h3
              style={{
                marginBottom:
                  "15px",

                color:
                  "#2563eb",
              }}
            >
              Görevler
            </h3>


            <div
              style={{
                display:
                  "flex",

                flexDirection:
                  "column",

                gap:
                  "10px",
              }}
            >

              <p>
                Görev Sayısı:{" "}
                {gorevler.length}
              </p>


              {gorevler.map(
                (gorev) => (

                  <button
                    key={
                      gorev.id
                    }
                    onClick={() => {

                      setSeciliJob(
                        gorev.id
                      );

                      setSchedulerSaat(
                        gorev.hour
                      );

                      setSchedulerDakika(
                        gorev.minute
                      );

                    }}
                    style={{
                      padding:
                        "12px 16px",

                      borderRadius:
                        "8px",

                      border:
                        "none",

                      cursor:
                        "pointer",

                      textAlign:
                        "left",

                      background:
                        seciliJob ===
                        gorev.id
                          ? "#2563eb"
                          : "#f3f4f6",

                      color:
                        seciliJob ===
                        gorev.id
                          ? "#fff"
                          : "#111",

                      fontWeight:
                        "bold",

                      transition:
                        "0.2s",
                    }}
                  >

                    {gorev.baslik}


                    <div
                      style={{
                        fontSize:
                          "12px",

                        opacity:
                          0.8,

                        marginTop:
                          "4px",
                      }}
                    >

                      Mevcut:{" "}

                      {gorev.hour
                        .toString()
                        .padStart(
                          2,
                          "0"
                        )}

                      :

                      {gorev.minute
                        .toString()
                        .padStart(
                          2,
                          "0"
                        )}

                    </div>

                  </button>

                )
              )}

            </div>

          </div>


          {/* GOREV DUZENLE */}

          <div
            style={{
              ...styles.card,

              flex:
                1.5,

              minWidth:
                "300px",
            }}
          >

            <h3
              style={{
                marginBottom:
                  "15px",

                color:
                  "#16a34a",
              }}
            >
              Görev Saatini Düzenle
            </h3>


            <form
              onSubmit={(e) => {

                e.preventDefault();

                scheduleGuncelle(
                  seciliJob,
                  Number(
                    schedulerSaat
                  ),
                  Number(
                    schedulerDakika
                  )
                );

              }}
              style={{
                display:
                  "flex",

                flexDirection:
                  "column",

                gap:
                  "15px",
              }}
            >

              <div>

                <label
                  style={{
                    display:
                      "block",

                    marginBottom:
                      "5px",

                    fontWeight:
                      "bold",
                  }}
                >
                  Seçilen Görev (Job ID):
                </label>


                <input
                  type="text"
                  value={
                    seciliJob
                  }
                  readOnly
                  style={{
                    width:
                      "100%",

                    padding:
                      "10px",

                    borderRadius:
                      "6px",

                    border:
                      "1px solid #ccc",

                    background:
                      "#f9fafb",

                    color:
                      "#555",
                  }}
                />

              </div>


              <div
                style={{
                  display:
                    "flex",

                  gap:
                    "10px",
                }}
              >

                <div
                  style={{
                    flex:
                      1,
                  }}
                >

                  <label
                    style={{
                      display:
                        "block",

                      marginBottom:
                        "5px",

                      fontWeight:
                        "bold",
                    }}
                  >
                    Saat:
                  </label>


                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={
                      schedulerSaat
                    }
                    onChange={(e) =>
                      setSchedulerSaat(
                        Number(
                          e.target.value
                        )
                      )
                    }
                    style={{
                      width:
                        "100%",

                      padding:
                        "10px",

                      borderRadius:
                        "6px",

                      border:
                        "1px solid #ccc",
                    }}
                  />

                </div>


                <div
                  style={{
                    flex:
                      1,
                  }}
                >

                  <label
                    style={{
                      display:
                        "block",

                      marginBottom:
                        "5px",

                      fontWeight:
                        "bold",
                    }}
                  >
                    Dakika:
                  </label>


                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={
                      schedulerDakika
                    }
                    onChange={(e) =>
                      setSchedulerDakika(
                        Number(
                          e.target.value
                        )
                      )
                    }
                    style={{
                      width:
                        "100%",

                      padding:
                        "10px",

                      borderRadius:
                        "6px",

                      border:
                        "1px solid #ccc",
                    }}
                  />

                </div>

              </div>


              <button
                type="submit"
                style={{
                  ...styles.successButton,

                  padding:
                    "12px",

                  marginTop:
                    "10px",

                  fontSize:
                    "16px",
                }}
              >
                Saati Güncelle
              </button>

            </form>

          </div>

        </div>


        {/* ======================================================
            KAPALI GUNLER
        ====================================================== */}

        <div
          style={{
            ...styles.card,

            marginTop:
              "25px",
          }}
        >

          <h3
            style={{
              color:
                "#dc2626",

              marginBottom:
                "15px",
            }}
          >
            📅 Kapalı Günler
          </h3>


          <p>
            Seçilen tarihlerde
            programdaki zamanlanmış
            görevler çalışmaz.
          </p>


          <div
            style={{
              display:
                "flex",

              gap:
                "10px",

              marginTop:
                "15px",
            }}
          >

            <input
              type="date"
              value={
                yeniKapaliGun
              }
              onChange={(e) =>
                setYeniKapaliGun(
                  e.target.value
                )
              }
              style={{
                padding:
                  "10px",

                borderRadius:
                  "6px",

                border:
                  "1px solid #ccc",
              }}
            />


            <button
              type="button"
              style={
                styles.dangerButton
              }
              onClick={
                kapaliGunEkle
              }
            >
              Kapalı Gün Ekle
            </button>

          </div>


          <h4
            style={{
              marginTop:
                "25px",
            }}
          >
            Tanımlı Kapalı Günler
          </h4>


          {kapaliGunler.length ===
          0 ? (

            <p>
              Henüz kapalı gün
              bulunmuyor.
            </p>

          ) : (

            kapaliGunler.map(
              (tarih) => (

                <div
                  key={tarih}
                  style={{
                    ...styles.card,

                    display:
                      "flex",

                    justifyContent:
                      "space-between",

                    alignItems:
                      "center",
                  }}
                >

                  <span>
                    🔴 {tarih}
                  </span>


                  <button
                    type="button"
                    style={
                      styles.dangerButton
                    }
                    onClick={() =>
                      kapaliGunSil(
                        tarih
                      )
                    }
                  >
                    Kaldır
                  </button>

                </div>

              )
            )

          )}

        </div>

      </div>

    );

  }


  // ============================================================
  // SIPARISLER
  // ============================================================

  if (
    sayfa === "siparisler"
  ) {

    return (

      <div
        style={styles.page}
      >

        <button
          onClick={() =>
            setSayfa("menu")
          }
          style={
            styles.secondaryButton
          }
        >
          ← Geri
        </button>


        <h1>
          Admin Paneli
        </h1>


        <h2>
          Toplam Sipariş Özeti
        </h2>


        <button
          onClick={
            mesajOlustur
          }
          style={
            styles.warningButton
          }
        >
          Mesaj Oluştur
        </button>


        {mesaj && (

          <div
            style={{
              ...styles.card,

              marginTop:
                "20px",
            }}
          >

            <h3>
              Oluşturulan Mesaj
            </h3>


            <pre
              style={{
                background:
                  "#f4f4f4",

                padding:
                  "15px",

                borderRadius:
                  "8px",
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


        <div
          style={styles.card}
        >

          <ul>

            {Object.entries(
              yemekSayilari
            ).map(
              ([yemek, adet]) => (

                <li
                  key={yemek}
                >
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


        {siparisler.map(
          (siparis) => (

            <div
              key={
                siparis.id
              }
              style={
                styles.card
              }
            >

              <h3>

                #{siparis.sira ?? "-"}{" "}
                -{" "}
                {siparis.isim}

              </h3>


              <button
                onClick={() =>
                  siparisSil(
                    siparis.id
                  )
                }
                style={
                  styles.dangerButton
                }
              >
                Siparişi Sil
              </button>


              <p>
                {siparis.email}
              </p>


              <ul>

                {siparis.secimler?.map(
                  (
                    yemek,
                    index
                  ) => (

                    <li
                      key={index}
                    >
                      {yemek}
                    </li>

                  )
                )}

              </ul>

            </div>

          )
        )}

      </div>

    );

  }


  // ============================================================
  // FALLBACK
  // ============================================================

  return null;
}


// ============================================================
// EXPORT
// ============================================================

export default Admin;