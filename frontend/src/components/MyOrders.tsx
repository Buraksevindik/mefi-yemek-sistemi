import { useState, useEffect } from "react";
import type { User } from "firebase/auth";
import type { MenuData, AlternatifMenu } from "../types/menu";
import type { Siparis, Misafir } from "../types/order";
import {
  getTodayOrder,
  updateOrder,
  addGuest,
  updateGuestName,
  updateGuestOrder,
  deleteGuest,
  deleteTodayOrder,
} from "../services/orderService";
import OrderWithGuests from "./OrderWithGuests";
import GuestOrderEditor from "./GuestOrderEditor";
import MenuSelection from "./MenuSelection";
import AlternativeMenu from "./AlternativeMenu";
import { GUNLER, GUN_ISIMLERI_TURKCE } from "../types/menu";
import { appStyles } from "../utils/styles";

type MyOrdersProps = {
  user: User;
  menu: MenuData | null;
  alternatifMenu: AlternatifMenu | null;
  siparisKapali: boolean;
  adminMi: boolean;
  onGeri: () => void;
  onAdminPanel: () => void;
  onSiparisSilindi: () => void;
};

type EditMode =
  | { type: "none" }
  | { type: "self"; secimTipi: "gunluk" | "alternatif" | null; secimler: { [k: string]: string } }
  | { type: "addGuest" }
  | { type: "editGuest"; guest: Misafir };

export default function MyOrders({
  user,
  menu,
  alternatifMenu,
  siparisKapali,
  adminMi,
  onGeri,
  onAdminPanel,
  onSiparisSilindi,
}: MyOrdersProps) {
  const [siparis, setSiparis] = useState<Siparis | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState<EditMode>({ type: "none" });

  const bugunIndex = new Date().getDay();
  const bugunKey = GUNLER[bugunIndex];
  const bugununMenusu = menu?.[bugunKey];

const siparisiYukle = async () => {
  try {
    const data = await getTodayOrder(user.uid);
    setSiparis(data);
  } catch (error) {
    console.error("Sipariş yükleme hatası:", error);
  }
};

useEffect(() => {
  let aktif = true;

  const yukle = async () => {
    try {
      const data = await getTodayOrder(user.uid);

      if (aktif) {
        setSiparis(data);
        setLoading(false);
      }
    } catch (error) {
      console.error("Sipariş yükleme hatası:", error);

      if (aktif) {
        setLoading(false);
      }
    }
  };

  yukle();

  return () => {
    aktif = false;
  };
}, [user.uid]);

  if (loading && !siparis) {
    return (
      <div style={appStyles.page}>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  if (!siparis) {
    return (
      <div style={appStyles.page}>
        <button onClick={onGeri} style={{ ...appStyles.primaryButton, background: "#6b7280" }}>
          ⬅ Geri
        </button>
        <p>Bugün için siparişiniz bulunmuyor.</p>
      </div>
    );
  }

  const misafirler = siparis.misafirler ?? [];

  const kendiSiparisiDuzenleBaslat = () => {
    if (siparisKapali) {
      alert("Sipariş süresi sona ermiştir.");
      return;
    }
    setEditMode({ type: "self", secimTipi: null, secimler: {} });
  };

  const kendiSiparisiKaydet = async (secimler: string[]) => {
    try {
      await updateOrder(user.uid, secimler);
      await siparisiYukle();
      setEditMode({ type: "none" });
      alert("Siparişiniz güncellendi.");
    } catch (error) {
      console.error(error);
      alert("Güncelleme başarısız.");
    }
  };

  const misafirEkleKaydet = async (
    isim: string,
    secimler: string[]
  ) => {
    try {
      await addGuest(user.uid, isim, secimler);
      await siparisiYukle();
      setEditMode({ type: "none" });
      alert("Misafir eklendi.");
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Misafir eklenemedi.");
    }
  };

  const misafirDuzenleKaydet = async (
    guestId: string,
    isim: string,
    secimler: string[]
  ) => {
    try {
      await updateGuestName(user.uid, guestId, isim);
      await updateGuestOrder(user.uid, guestId, secimler);
      await siparisiYukle();
      setEditMode({ type: "none" });
      alert("Misafir siparişi güncellendi.");
    } catch (error) {
      console.error(error);
      alert("Güncelleme başarısız.");
    }
  };

  const misafirSil = async (guestId: string, guestName: string) => {
    if (siparisKapali) {
      alert("Sipariş süresi sona ermiştir.");
      return;
    }
    const onay = window.confirm(`${guestName} misafirini kaldırmak istediğinize emin misiniz?`);
    if (!onay) return;

    try {
      await deleteGuest(user.uid, guestId);
      await siparisiYukle();
      alert("Misafir kaldırıldı.");
    } catch (error) {
      console.error(error);
      alert("Silme başarısız.");
    }
  };

  const siparisiSil = async () => {
    if (siparisKapali) {
      alert("Sipariş süresi sona ermiştir.");
      return;
    }
    const onay = window.confirm(
      "Siparişinizi ve tüm misafir siparişlerinizi silmek istediğinize emin misiniz?"
    );
    if (!onay) return;

    try {
      await deleteTodayOrder(user.uid);
      onSiparisSilindi();
      alert("Sipariş iptal edildi.");
    } catch (error) {
      console.error(error);
      alert("Silme başarısız.");
    }
  };

  if (editMode.type === "addGuest") {
    return (
      <GuestOrderEditor
        menu={menu}
        alternatifMenu={alternatifMenu}
        baslik="Misafir Ekle"
        onKaydet={(isim, secimler) => misafirEkleKaydet(isim, secimler)}
        onIptal={() => setEditMode({ type: "none" })}
      />
    );
  }

  if (editMode.type === "editGuest") {
    const guest = editMode.guest;

    return (
      <GuestOrderEditor
        menu={menu}
        alternatifMenu={alternatifMenu}
        initialIsim={guest.isim}
        initialSecimler={{}}
        baslik={`${guest.isim} - Sipariş Düzenle`}
        onKaydet={(isim, secimler) => misafirDuzenleKaydet(guest.id, isim, secimler)}
        onIptal={() => setEditMode({ type: "none" })}
      />
    );
  }

  if (editMode.type === "self") {
    const yemekSec = (kategori: string, yemek: string) => {
      setEditMode((prev) => {
        if (prev.type !== "self") return prev;
        return {
          ...prev,
          secimler: {
            ...prev.secimler,
            [kategori]: prev.secimler[kategori] === yemek ? "" : yemek,
          },
        };
      });
    };

    const secimTipiSec = (tip: "gunluk" | "alternatif") => {
      setEditMode((prev) => {
        if (prev.type !== "self") return prev;
        return { ...prev, secimTipi: tip, secimler: {} };
      });
    };

    if (editMode.type === "self" && !editMode.secimTipi) {
      return (
        <div style={appStyles.page}>
          <h2>Kendi Siparişinizi Düzenle</h2>
          <div style={appStyles.card}>
            <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
              <button onClick={() => secimTipiSec("gunluk")} style={appStyles.primaryButton}>
                📅 Bugünün Menüsü ({GUN_ISIMLERI_TURKCE[bugunKey]})
              </button>
              <button
                onClick={() => secimTipiSec("alternatif")}
                style={{ ...appStyles.primaryButton, background: "#f59e0b" }}
              >
                🍔 Alternatif / Alakart
              </button>
            </div>
          </div>
          <button
            onClick={() => setEditMode({ type: "none" })}
            style={{ ...appStyles.primaryButton, background: "#6b7280", marginTop: "15px" }}
          >
            İptal
          </button>
        </div>
      );
    }

    if (editMode.type === "self") {
      const secimler = editMode.secimler;
      return (
        <div style={appStyles.page}>
          <h2>Kendi Siparişinizi Düzenle</h2>
          <button
            onClick={() => setEditMode({ type: "self", secimTipi: null, secimler: {} })}
            style={{ ...appStyles.primaryButton, background: "#6b7280", marginBottom: "15px" }}
          >
            ⬅ Menü Seçimine Geri Dön
          </button>

          {editMode.secimTipi === "gunluk" && (
            <MenuSelection
              menu={menu}
              bugununMenusu={bugununMenusu}
              bugunKey={bugunKey}
              secimler={secimler}
              onYemekSec={yemekSec}
            />
          )}

          {editMode.secimTipi === "alternatif" && alternatifMenu && (
            <AlternativeMenu
              alternatifMenu={alternatifMenu}
              secimler={secimler}
              onYemekSec={yemekSec}
            />
          )}

          <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
            <button
              onClick={() => {
                const gecerli = Object.values(secimler).filter(Boolean);
                if (gecerli.length === 0) {
                  alert("Lütfen en az bir yemek seçin!");
                  return;
                }
                kendiSiparisiKaydet(gecerli);
              }}
              style={appStyles.primaryButton}
            >
              Kaydet
            </button>
            <button
              onClick={() => setEditMode({ type: "none" })}
              style={{ ...appStyles.primaryButton, background: "#6b7280" }}
            >
              İptal
            </button>
          </div>
        </div>
      );
    }
  }

  return (
    <div style={appStyles.page}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <button onClick={onGeri} style={{ ...appStyles.primaryButton, background: "#6b7280" }}>
          ⬅ Geri
        </button>
        {adminMi && (
          <button onClick={onAdminPanel} style={appStyles.successButton}>
            Admin Paneli
          </button>
        )}
      </div>

      <h1>📋 Siparişlerim </h1>

<OrderWithGuests
  sira={siparis.sira}
  secimler={siparis.secimler}
  misafirler={misafirler}
  siparisKapali={siparisKapali}
  onKendiSiparisiDuzenle={kendiSiparisiDuzenleBaslat}
  onKendiSiparisiSil={siparisiSil}
  onMisafirDuzenle={(misafir) => {
    if (siparisKapali) {
      alert("Sipariş süresi sona ermiştir.");
      return;
    }

    setEditMode({
      type: "editGuest",
      guest: misafir,
    });
  }}
  onMisafirSil={(misafir) => {
    misafirSil(misafir.id, misafir.isim);
  }}
/>

      <div style={{ marginTop: "20px", display: "flex", flexWrap: "wrap", gap: "10px" }}>
        <button
          onClick={kendiSiparisiDuzenleBaslat}
          style={{
            ...appStyles.primaryButton,
            background: siparisKapali ? "#9ca3af" : "#2563eb",
          }}
        >
          {siparisKapali ? "Sipariş Süresi Doldu" : "Kendi Siparişimi Düzenle"}
        </button>

        <button
          onClick={() => {
            if (siparisKapali) {
              alert("Sipariş süresi sona ermiştir.");
              return;
            }
            setEditMode({ type: "addGuest" });
          }}
          style={{
            ...appStyles.primaryButton,
            background: siparisKapali ? "#9ca3af" : "#16a34a",
          }}
        >
          {siparisKapali ? "Sipariş Süresi Doldu" : "+ Misafir Ekle"}
        </button>

        <button
          onClick={siparisiSil}
          style={{
            ...appStyles.dangerButton,
            background: siparisKapali ? "#9ca3af" : "#dc2626",
          }}
        >
          {siparisKapali ? "Sipariş Süresi Doldu" : "Tüm Siparişi İptal Et"}
        </button>
      </div>
    </div>
  );
}
