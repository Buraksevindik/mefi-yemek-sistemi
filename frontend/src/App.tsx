import Admin from "./admin";
import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import type { MenuData, AlternatifMenu } from "./types/menu";
import { GUNLER, GUN_ISIMLERI_TURKCE } from "./types/menu";
import type { Siparis, PendingGuest, Misafir } from "./types/order";
import {
  subscribeToAuthState,
  girisYap,
  isAdmin,
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
import { cikisYap } from "./services/authService";

type AppView =
  | "main"
  | "submitted"
  | "existing"
  | "myOrders"
  | "addGuest"
  | "editGuest";

function App() {
  const [menu, setMenu] = useState<MenuData | null>(null);
  const [alternatifMenu, setAlternatifMenu] = useState<AlternatifMenu | null>(null);
  const [secimler, setSecimler] = useState<{ [kategori: string]: string }>({});
  const [secimTipi, setSecimTipi] = useState<"gunluk" | "alternatif" | null>(null);
  const [view, setView] = useState<AppView>("main");
  const [sonSira, setSonSira] = useState<number | null>(null);
  const [mevcutSiparis, setMevcutSiparis] = useState<Siparis | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [adminSayfasi, setAdminSayfasi] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [bekleyenMisafirler, setBekleyenMisafirler] = useState<PendingGuest[]>([]);
  const [duzenlenenMisafirId, setDuzenlenenMisafirId] = useState<string | null>(null);
  const [gonderilenSecimler, setGonderilenSecimler] = useState<string[]>([]);
  const [gonderilenMisafirler, setGonderilenMisafirler] = useState<Misafir[]>([]);

  const bugunIndex = new Date().getDay();
  const bugunKey = GUNLER[bugunIndex];
  const bugununMenusu = menu?.[bugunKey];
  const adminMi = isAdmin(user);
  const siparisKapali = isSiparisKapali();

  useEffect(() => {
    const unsubscribe = subscribeToAuthState(
      (currentUser) => setUser(currentUser),
      () => setUser(null),
      () => setAuthLoading(false)
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      const [menus, siparis] = await Promise.all([
        fetchMenus(),
        getTodayOrder(user.uid),
      ]);

      if (menus.aktif) setMenu(menus.aktif);
      if (menus.alternatif) setAlternatifMenu(menus.alternatif);
      if (siparis) {
        setMevcutSiparis(siparis);
        setView("existing");
      }
    };

    loadData();
  }, [user]);

  const yemekSec = (kategori: string, yemek: string) => {
    setSecimler((prev) => ({
      ...prev,
      [kategori]: prev[kategori] === yemek ? "" : yemek,
    }));
  };

  const pendingToMisafir = (pending: PendingGuest[]): Misafir[] =>
    pending.map((m) => ({
      id: m.id,
      isim: m.isim,
      secimler: Object.values(m.secimler).filter(Boolean),
    }));

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

  const siparisiOnayla = async () => {
    if (siparisKapali) {
      alert("Bugünkü sipariş süresi sona ermiştir.");
      return;
    }

    const gecerliSecimler = Object.values(secimler).filter((yemek) => yemek !== "");

    if (gecerliSecimler.length === 0) {
      alert("Lütfen en az bir yemek seçin!");
      return;
    }

    if (!user) return;

    try {
      const misafirler =
        bekleyenMisafirler.length > 0 ? pendingToMisafir(bekleyenMisafirler) : undefined;
      const result = await submitOrder(user, gecerliSecimler, misafirler);

      const guncelSiparis = await getTodayOrder(user.uid);

      if (result.type === "updated") {
        alert("Siparişiniz güncellendi.");
      }

      setSonSira(guncelSiparis?.sira ?? result.sira);
      setGonderilenSecimler(guncelSiparis?.secimler ?? gecerliSecimler);
      setGonderilenMisafirler(guncelSiparis?.misafirler ?? misafirler ?? []);
      setView("submitted");
    } catch (error) {
      console.error("Sipariş gönderilemedi:", error);
      alert("Bir hata oluştu: " + (error instanceof Error ? error.message : error));
    }
  };

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
            ? { ...m, isim, secimler: secimlerObj, secimTipi: guestSecimTipi }
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

  if (adminSayfasi) {
    return <Admin geriDon={() => setAdminSayfasi(false)} />;
  }

  if (authLoading) {
    return <div>Yükleniyor...</div>;
  }

  if (!user) {
    return <LoginScreen onGiris={girisYap} />;
  }
const cikisButonu = (
  <button
    style={{
      ...appStyles.dangerButton,
      background: "#6b7280",
    }}
    onClick={async () => {
      await cikisYap();
      setUser(null);
    }}
  >
    Çıkış Yap
  </button>
);
if (view === "myOrders") {
  return (
    <div>
      <div style={{ textAlign: "right", padding: "15px" }}>
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

  if (view === "addGuest" || view === "editGuest") {
    const duzenlenen = duzenlenenMisafirId
      ? bekleyenMisafirler.find((m) => m.id === duzenlenenMisafirId)
      : null;

    return (
      <GuestOrderEditor
        menu={menu}
        alternatifMenu={alternatifMenu}
        initialIsim={duzenlenen?.isim ?? ""}
        initialSecimler={duzenlenen?.secimler ?? {}}
        initialSecimTipi={duzenlenen?.secimTipi ?? null}
        baslik={duzenlenen ? `${duzenlenen.isim} - Düzenle` : "Misafir Ekle"}
        onKaydet={misafirKaydet}
        onIptal={() => {
          setDuzenlenenMisafirId(null);
          setView("main");
        }}
      />
    );
  }

if (view === "submitted") {
  return (
    <div>
      <div style={{ textAlign: "right", padding: "15px" }}>
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
if (view === "existing" && mevcutSiparis) {
  return (
    <div>
      <div style={{ textAlign: "right", padding: "15px" }}>
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

  return (
    <div style={appStyles.page}>
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
              📅 Bugünün Menüsü ({GUN_ISIMLERI_TURKCE[bugunKey]})
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

          {secimTipi === "alternatif" && alternatifMenu && (
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
              setBekleyenMisafirler((prev) => prev.filter((m) => m.id !== id));
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
