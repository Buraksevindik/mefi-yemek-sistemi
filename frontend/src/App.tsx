import Admin from "./admin";
import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import type { MenuData, AlternatifMenu } from "./types/menu";
import { GUNLER, GUN_ISIMLERI_TURKCE } from "./types/menu";
import type { Siparis } from "./types/order";
import {
  subscribeToAuthState,
  girisYap,
  cikisYap,
  isAdmin,
} from "./services/authService";
import { fetchMenus } from "./services/menuService";
import {
  getTodayOrder,
  deleteTodayOrder,
  submitOrder,
} from "./services/orderService";
import { isSiparisKapali } from "./utils/date";
import { appStyles } from "./utils/styles";
import LoginScreen from "./components/LoginScreen";
import ExistingOrder from "./components/ExistingOrder";
import SubmittedOrder from "./components/SubmittedOrder";
import MenuSelection from "./components/MenuSelection";
import AlternativeMenu from "./components/AlternativeMenu";
import OrderSummary from "./components/OrderSummary";

function App() {
  const [menu, setMenu] = useState<MenuData | null>(null);
  const [alternatifMenu, setAlternatifMenu] = useState<AlternatifMenu | null>(null);
  const [secimler, setSecimler] = useState<{ [kategori: string]: string }>({});
  const [secimTipi, setSecimTipi] = useState<"gunluk" | "alternatif" | null>(null);
  const [gonderildi, setGonderildi] = useState(false);
  const [sonSira, setSonSira] = useState<number | null>(null);
  const [mevcutSiparis, setMevcutSiparis] = useState<Siparis | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [adminSayfasi, setAdminSayfasi] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

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
      if (siparis) setMevcutSiparis(siparis);
    };

    loadData();
  }, [user]);

  const yemekSec = (kategori: string, yemek: string) => {
    setSecimler((prev) => ({
      ...prev,
      [kategori]: prev[kategori] === yemek ? "" : yemek,
    }));
  };

  const siparisiIptalEt = async () => {
    if (siparisKapali) {
      alert("Sipariş süresi sona ermiştir.");
      return;
    }

    const onay = window.confirm("Siparişinizi iptal etmek istediğinize emin misiniz?");
    if (!onay) return;

    try {
      if (!user) return;

      const silindi = await deleteTodayOrder(user.uid);

      if (!silindi) {
        alert("Silinecek sipariş bulunamadı.");
        return;
      }

      setGonderildi(false);
      setSonSira(null);
      setMevcutSiparis(null);
      setSecimler({});
      setSecimTipi(null);
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
      const result = await submitOrder(user, gecerliSecimler);

      if (result.type === "updated") {
        if (result.sira) {
          setSonSira(result.sira);
        }
        alert("Siparişiniz güncellendi.");
      } else {
        setSonSira(result.sira);
      }

      setGonderildi(true);
    } catch (error) {
      console.error("Sipariş gönderilemedi:", error);
      alert("Bir hata oluştu: " + (error instanceof Error ? error.message : error));
    }
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

  if (gonderildi) {
    return (
      <SubmittedOrder
        secimler={secimler}
        sonSira={sonSira}
        siparisKapali={siparisKapali}
        adminMi={!!adminMi}
        onDuzenle={() => {
          if (siparisKapali) {
            alert("Sipariş süresi sona ermiştir.");
            return;
          }
          setGonderildi(false);
        }}
        onIptal={siparisiIptalEt}
        onAdminPanel={() => setAdminSayfasi(true)}
      />
    );
  }

  if (mevcutSiparis) {
    return (
      <ExistingOrder
        siparis={mevcutSiparis}
        siparisKapali={siparisKapali}
        adminMi={!!adminMi}
        onDuzenle={() => {
          if (siparisKapali) {
            alert("Sipariş süresi sona ermiştir.");
            return;
          }
          setMevcutSiparis(null);
          setSecimTipi(null);
        }}
        onIptal={siparisiIptalEt}
        onAdminPanel={() => setAdminSayfasi(true)}
      />
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
