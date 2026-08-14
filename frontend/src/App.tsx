import Admin from "./admin";
import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import type { AlternatifMenu, HaftalikMenu } from "./types/menu";
import { GUNLER, GUN_ISIMLERI_TURKCE } from "./types/menu";
import type { Siparis, PendingGuest, Misafir } from "./types/order";

import {
  subscribeToAuthState,
  girisYap,
  isAdmin,
  cikisYap,
} from "./services/authService";

import { fetchMenus } from "./services/menuService";

import {
  getTodayOrder,
  deleteTodayOrder,
  submitOrder,
  generateGuestId,
} from "./services/orderService";

import { isSiparisKapali } from "./utils/date";
import { appStyles } from "./utils/styles";

import LoginScreen from "./components/LoginScreen";
import ExistingOrder from "./components/ExistingOrder";
import SubmittedOrder from "./components/SubmittedOrder";
import MenuSelection from "./components/MenuSelection";
import AlternativeMenu from "./components/AlternativeMenu";
import OrderSummary from "./components/OrderSummary";
import PendingGuestsSection from "./components/PendingGuestsSection";
import GuestOrderEditor from "./components/GuestOrderEditor";
import MyOrders from "./components/MyOrders";

type AppView =
  | "main"
  | "submitted"
  | "existing"
  | "myOrders"
  | "addGuest"
  | "editGuest";

// Ekstralar birden fazla, diğer kategoriler tek seçim olabilir.
type Secimler = {
  [kategori: string]: string | string[];
};

function App() {
  const [menu, setMenu] = useState<HaftalikMenu | null>(null);

  const [alternatifMenu, setAlternatifMenu] =
    useState<AlternatifMenu | null>(null);

  const [secimler, setSecimler] = useState<Secimler>({});

  const [secimTipi, setSecimTipi] = useState<
    "gunluk" | "alternatif" | null
  >(null);

  const [view, setView] = useState<AppView>("main");

  const [sonSira, setSonSira] = useState<number | null>(null);

  const [mevcutSiparis, setMevcutSiparis] =
    useState<Siparis | null>(null);

  const [user, setUser] = useState<User | null>(null);

  const [adminSayfasi, setAdminSayfasi] = useState(false);

  const [authLoading, setAuthLoading] = useState(true);

  const [bekleyenMisafirler, setBekleyenMisafirler] =
    useState<PendingGuest[]>([]);

  const [duzenlenenMisafirId, setDuzenlenenMisafirId] =
    useState<string | null>(null);

  const [gonderilenSecimler, setGonderilenSecimler] =
    useState<string[]>([]);

  const [gonderilenMisafirler, setGonderilenMisafirler] =
    useState<Misafir[]>([]);

  const bugunIndex = new Date().getDay();
  const bugunKey = GUNLER[bugunIndex];
  const bugununMenusu = menu?.[bugunKey];

  const adminMi = isAdmin(user);
  const siparisKapali = isSiparisKapali();

  // --------------------------------------------------
  // AUTH STATE
  // --------------------------------------------------

  useEffect(() => {
    const unsubscribe = subscribeToAuthState(
      (currentUser) => {
        setUser(currentUser);
      },
      () => {
        setUser(null);
      },
      () => {
        setAuthLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // --------------------------------------------------
  // USER DATA
  // --------------------------------------------------

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        const [menus, siparis] = await Promise.all([
          fetchMenus(),
          getTodayOrder(user.uid),
        ]);

        if (menus.aktif) {
          setMenu(menus.aktif as HaftalikMenu);
        }

        if (menus.alternatif) {
          setAlternatifMenu(menus.alternatif);
        }

        if (siparis) {
          setMevcutSiparis(siparis);
          setView("existing");
        }
      } catch (error) {
        console.error("Veriler yüklenemedi:", error);
      }
    };

    loadData();
  }, [user]);

  // --------------------------------------------------
  // ÇIKIŞ BUTONU
  // --------------------------------------------------

  const cikisButonu = (
    <button
      style={{
        ...appStyles.dangerButton,
        background: "#6b7280",
      }}
      onClick={async () => {
        try {
          await cikisYap();

          setUser(null);
          setAdminSayfasi(false);
          setView("main");
          setMevcutSiparis(null);
          setSecimler({});
          setSecimTipi(null);
          setSonSira(null);
          setBekleyenMisafirler([]);
          setDuzenlenenMisafirId(null);
          setGonderilenSecimler([]);
          setGonderilenMisafirler([]);
        } catch (error) {
          console.error("Çıkış yapılamadı:", error);
          alert("Çıkış yapılırken bir hata oluştu.");
        }
      }}
    >
      Çıkış Yap
    </button>
  );

  // --------------------------------------------------
  // YEMEK SEÇİMİ
  // --------------------------------------------------

const yemekSec = (kategori: string, yemek: string) => {
  console.log("KATEGORİ:", JSON.stringify(kategori));
  console.log("YEMEK:", yemek);

  setSecimler((prev) => {
    console.log("ÖNCEKİ SECİMLER:", prev);

    if (kategori === "Ekstralar") {
      const mevcutSecimler = Array.isArray(prev[kategori])
        ? prev[kategori]
        : [];

      console.log("EKSTRALAR:", mevcutSecimler);

      if (mevcutSecimler.includes(yemek)) {
        return {
          ...prev,
          [kategori]: mevcutSecimler.filter(
            (item) => item !== yemek
          ),
        };
      }

      return {
        ...prev,
        [kategori]: [...mevcutSecimler, yemek],
      };
    }

    return {
      ...prev,
      [kategori]: prev[kategori] === yemek ? "" : yemek,
    };
  });
};

  // --------------------------------------------------
  // MİSAFİR DÖNÜŞÜMÜ
  // --------------------------------------------------

  const pendingToMisafir = (
    pending: PendingGuest[]
  ): Misafir[] =>
    pending.map((m) => ({
      id: m.id,
      isim: m.isim,
      secimler: Object.values(m.secimler).filter(Boolean),
      secimTipi: m.secimTipi,
    }));

  // --------------------------------------------------
  // SİPARİŞ İPTAL
  // --------------------------------------------------

  const siparisiIptalEt = async () => {
    if (siparisKapali) {
      alert("Sipariş süresi sona ermiştir.");
      return;
    }

    const onay = window.confirm(
      "Siparişinizi ve tüm misafir siparişlerinizi iptal etmek istediğinize emin misiniz?"
    );

    if (!onay) return;

    try {
      if (!user) return;

      const silindi = await deleteTodayOrder(user.uid);

      if (!silindi) {
        alert("Silinecek sipariş bulunamadı.");
        return;
      }

      setView("main");
      setSonSira(null);
      setMevcutSiparis(null);
      setSecimler({});
      setSecimTipi(null);
      setBekleyenMisafirler([]);
      setGonderilenSecimler([]);
      setGonderilenMisafirler([]);

      alert("Sipariş iptal edildi.");
    } catch (error) {
      console.error(error);
      alert("Sipariş silinemedi.");
    }
  };

  // --------------------------------------------------
  // SİPARİŞ ONAY
  // --------------------------------------------------

  const siparisiOnayla = async () => {
    if (siparisKapali) {
      alert("Bugünkü sipariş süresi sona ermiştir.");
      return;
    }

    // string ve string[] değerlerini düzleştiriyoruz.
    const gecerliSecimler = Object.values(secimler)
      .flatMap((secim) =>
        Array.isArray(secim) ? secim : [secim]
      )
      .filter((yemek) => yemek !== "");

    if (gecerliSecimler.length === 0) {
      alert("Lütfen en az bir yemek seçin!");
      return;
    }

    if (!user) return;

    try {
      const misafirler =
        bekleyenMisafirler.length > 0
          ? pendingToMisafir(bekleyenMisafirler)
          : undefined;

      const result = await submitOrder(
        user,
        gecerliSecimler,
        misafirler,
        secimTipi ?? "gunluk"
      );

      const guncelSiparis = await getTodayOrder(user.uid);

      if (result.type === "updated") {
        alert("Siparişiniz güncellendi.");
      }

      setSonSira(guncelSiparis?.sira ?? result.sira);

      setGonderilenSecimler(
        guncelSiparis?.secimler ?? gecerliSecimler
      );

      setGonderilenMisafirler(
        guncelSiparis?.misafirler ?? misafirler ?? []
      );

      setView("submitted");
    } catch (error) {
      console.error("Sipariş gönderilemedi:", error);

      alert(
        "Bir hata oluştu: " +
          (error instanceof Error ? error.message : error)
      );
    }
  };

  // --------------------------------------------------
  // MİSAFİR KAYDET
  // --------------------------------------------------

  const misafirKaydet = (
    isim: string,
    guestSecimler: string[],
    guestSecimTipi: "gunluk" | "alternatif"
  ) => {
    const secimlerObj: { [k: string]: string } = {};

    guestSecimler.forEach((s, i) => {
      secimlerObj[`item_${i}`] = s;
    });

    if (duzenlenenMisafirId) {
      setBekleyenMisafirler((prev) =>
        prev.map((m) =>
          m.id === duzenlenenMisafirId
            ? {
                ...m,
                isim,
                secimler: secimlerObj,
                secimTipi: guestSecimTipi,
              }
            : m
        )
      );

      setDuzenlenenMisafirId(null);
    } else {
      setBekleyenMisafirler((prev) => [
        ...prev,
        {
          id: generateGuestId(),
          isim,
          secimler: secimlerObj,
          secimTipi: guestSecimTipi,
        },
      ]);
    }

    setView("main");
  };

  // --------------------------------------------------
  // AUTH LOADING
  // --------------------------------------------------

  if (authLoading) {
    return <div>Yükleniyor...</div>;
  }

  // --------------------------------------------------
  // LOGIN
  // --------------------------------------------------

  if (!user) {
    return <LoginScreen onGiris={girisYap} />;
  }

  // --------------------------------------------------
  // ADMIN
  // --------------------------------------------------

  if (adminSayfasi && adminMi) {
    return (
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            padding: "15px",
          }}
        >
          {cikisButonu}
        </div>

        <Admin
          geriDon={() => setAdminSayfasi(false)}
        />
      </div>
    );
  }

  // --------------------------------------------------
  // SİPARİŞLERİM
  // --------------------------------------------------

  if (view === "myOrders") {
    return (
      <div>
        <div
          style={{
            textAlign: "right",
            padding: "15px",
          }}
        >
          {cikisButonu}
        </div>

        <MyOrders
          user={user}
          menu={menu}
          alternatifMenu={alternatifMenu}
          siparisKapali={siparisKapali}
          adminMi={!!adminMi}
          onGeri={async () => {
            const siparis = await getTodayOrder(user.uid);

            if (siparis) {
              setMevcutSiparis(siparis);
              setView("existing");
            } else {
              setView("main");
            }
          }}
          onAdminPanel={() => setAdminSayfasi(true)}
          onSiparisSilindi={() => {
            setMevcutSiparis(null);
            setView("main");
            setSecimler({});
            setSecimTipi(null);
            setBekleyenMisafirler([]);
          }}
        />
      </div>
    );
  }

  // --------------------------------------------------
  // MİSAFİR EKLE / DÜZENLE
  // --------------------------------------------------

  if (view === "addGuest" || view === "editGuest") {
    const duzenlenen = duzenlenenMisafirId
      ? bekleyenMisafirler.find(
          (m) => m.id === duzenlenenMisafirId
        )
      : null;

    return (
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            padding: "15px",
          }}
        >
          {cikisButonu}
        </div>

        <GuestOrderEditor
          menu={menu}
          alternatifMenu={alternatifMenu}
          initialIsim={duzenlenen?.isim ?? ""}
          initialSecimler={duzenlenen?.secimler ?? {}}
          initialSecimTipi={duzenlenen?.secimTipi ?? null}
          baslik={
            duzenlenen
              ? `${duzenlenen.isim} - Düzenle`
              : "Misafir Ekle"
          }
          onKaydet={misafirKaydet}
          onIptal={() => {
            setDuzenlenenMisafirId(null);
            setView("main");
          }}
        />
      </div>
    );
  }

  // --------------------------------------------------
  // SİPARİŞ GÖNDERİLDİ
  // --------------------------------------------------

  if (view === "submitted") {
    return (
      <div>
        <div
          style={{
            textAlign: "right",
            padding: "15px",
          }}
        >
          {cikisButonu}
        </div>

        <SubmittedOrder
          secimler={gonderilenSecimler}
          misafirler={gonderilenMisafirler}
          sonSira={sonSira}
          siparisKapali={siparisKapali}
          adminMi={!!adminMi}
          onIptal={siparisiIptalEt}
          onAdminPanel={() => setAdminSayfasi(true)}
          onSiparislerim={() => setView("myOrders")}
        />
      </div>
    );
  }

  // --------------------------------------------------
  // MEVCUT SİPARİŞ
  // --------------------------------------------------

  if (view === "existing" && mevcutSiparis) {
    return (
      <div>
        <div
          style={{
            textAlign: "right",
            padding: "15px",
          }}
        >
          {cikisButonu}
        </div>

        <ExistingOrder
          siparis={mevcutSiparis}
          siparisKapali={siparisKapali}
          adminMi={!!adminMi}
          onIptal={siparisiIptalEt}
          onAdminPanel={() => setAdminSayfasi(true)}
          onSiparislerim={() => setView("myOrders")}
        />
      </div>
    );
  }

  // --------------------------------------------------
  // ANA SAYFA
  // --------------------------------------------------

  return (
    <div style={appStyles.page}>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "15px",
        }}
      >
        {cikisButonu}
      </div>

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
            style={appStyles.primaryButton}
            onClick={() => setAdminSayfasi(true)}
          >
            Admin Paneli
          </button>
        )}
      </div>

      {!secimTipi ? (
        <div style={appStyles.card}>
          <h3>Nasıl devam etmek istersiniz?</h3>

          <div
            style={{
              display: "flex",
              gap: "15px",
              justifyContent: "center",
              marginTop: "20px",
            }}
          >
            <button
              onClick={() => {
                setSecimTipi("gunluk");
                setSecimler({});
              }}
              style={appStyles.primaryButton}
            >
              📅 Bugünün Menüsü (
              {GUN_ISIMLERI_TURKCE[bugunKey]}
              )
            </button>

            <button
              onClick={() => {
                setSecimTipi("alternatif");
                setSecimler({});
              }}
              style={{
                ...appStyles.primaryButton,
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
              ...appStyles.primaryButton,
              background: "#6b7280",
              marginBottom: "15px",
            }}
          >
            ⬅ Menü Seçimine Geri Dön
          </button>

          {secimTipi === "gunluk" && (
            <MenuSelection
              menu={menu}
              bugununMenusu={bugununMenusu}
              bugunKey={bugunKey}
              secimler={secimler}
              onYemekSec={yemekSec}
            />
          )}

          {secimTipi === "alternatif" &&
            alternatifMenu && (
              <AlternativeMenu
                alternatifMenu={alternatifMenu}
                secimler={secimler}
                onYemekSec={yemekSec}
              />
            )}

          <PendingGuestsSection
            misafirler={bekleyenMisafirler}
            onMisafirEkle={() => {
              if (siparisKapali) {
                alert("Sipariş süresi sona ermiştir.");
                return;
              }

              setDuzenlenenMisafirId(null);
              setView("addGuest");
            }}
            onMisafirDuzenle={(id) => {
              if (siparisKapali) {
                alert("Sipariş süresi sona ermiştir.");
                return;
              }

              setDuzenlenenMisafirId(id);
              setView("editGuest");
            }}
            onMisafirSil={(id) => {
              if (siparisKapali) {
                alert("Sipariş süresi sona ermiştir.");
                return;
              }

              setBekleyenMisafirler((prev) =>
                prev.filter((m) => m.id !== id)
              );
            }}
            siparisKapali={siparisKapali}
          />

          <OrderSummary
            secimler={secimler}
            siparisKapali={siparisKapali}
            onOnayla={siparisiOnayla}
          />
        </div>
      )}
    </div>
  );
}

export default App;