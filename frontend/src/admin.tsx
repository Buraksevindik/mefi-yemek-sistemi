import { useEffect, useState } from "react";
import type { AlternatifMenu, HaftalikMenu } from "./types/menu";
import { BUGUN_MAP } from "./types/menu";
import type { Siparis } from "./types/order";
import type { Stajyer } from "./types/user";
import type { SchedulerJob } from "./types/scheduler";
import { getActiveMenu, getAlternativeMenu } from "./services/menuService";
import { getTodayOrders } from "./services/orderService";
import { loadSchedulers } from "./services/schedulerService";
import { getKapaliGunler, getStajyerler } from "./services/userService";
import AdminDashboard from "./components/admin/AdminDashboard";
import MenuManagement from "./components/admin/MenuManagement";
import AlternativeMenuManagement from "./components/admin/AlternativeMenuManagement";
import OrderManagement from "./components/admin/OrderManagement";
import InternManagement from "./components/admin/InternManagement";
import SchedulerSettings from "./components/admin/SchedulerSettings";

type AdminProps = {
  geriDon: () => void;
};

const bugunIndex = new Date().getDay();

function Admin({ geriDon }: AdminProps) {
  const [alternatifMenu, setAlternatifMenu] = useState<AlternatifMenu>({
    yemekler: [],
    icecekler: [],
    ekmek: [],
  });
  const [gorevler, setGorevler] = useState<SchedulerJob[]>([]);
  const [kapaliGunler, setKapaliGunler] = useState<string[]>([]);
  const [haftalikMenu, setHaftalikMenu] = useState<HaftalikMenu | null>(null);
  const [siparisler, setSiparisler] = useState<Siparis[]>([]);
  const [stajyerler, setStajyerler] = useState<Stajyer[]>([]);
  const [aktifGun, setAktifGun] = useState(BUGUN_MAP[bugunIndex]);
  const [sayfa, setSayfa] = useState<
    "menu" | "alternatif" | "siparisler" | "haftalikmenu" | "stajyerler" | "scheduler"
  >("menu");

  useEffect(() => {
    const loadData = async () => {
      const [aktif, alternatif, siparisListesi, stajyerListesi, schedulerList, kapali] =
        await Promise.all([
          getActiveMenu(),
          getAlternativeMenu(),
          getTodayOrders(),
          getStajyerler(),
          loadSchedulers(),
          getKapaliGunler(),
        ]);

      if (aktif) setHaftalikMenu(aktif as HaftalikMenu);
      if (alternatif) setAlternatifMenu(alternatif as AlternatifMenu);
      setSiparisler(siparisListesi);
      setStajyerler(stajyerListesi);
      setGorevler(schedulerList);
      setKapaliGunler(kapali);
    };

    loadData();
  }, []);

  if (sayfa === "menu") {
    return (
      <AdminDashboard
        onGeriDon={geriDon}
        onSayfaSec={(yeniSayfa) => setSayfa(yeniSayfa)}
      />
    );
  }

  if (sayfa === "alternatif") {
    return (
      <AlternativeMenuManagement
        alternatifMenu={alternatifMenu}
        onAlternatifMenuChange={setAlternatifMenu}
        onGeri={() => setSayfa("menu")}
      />
    );
  }

  if (sayfa === "haftalikmenu" && haftalikMenu) {
    return (
      <MenuManagement
        haftalikMenu={haftalikMenu}
        aktifGun={aktifGun}
        onAktifGunChange={setAktifGun}
        onHaftalikMenuChange={setHaftalikMenu}
        onGeri={() => setSayfa("menu")}
      />
    );
  }

  if (sayfa === "stajyerler") {
    return (
      <InternManagement
        stajyerler={stajyerler}
        onStajyerlerChange={setStajyerler}
        onGeri={() => setSayfa("menu")}
      />
    );
  }

  if (sayfa === "scheduler") {
    return (
      <SchedulerSettings
        gorevler={gorevler}
        kapaliGunler={kapaliGunler}
        onGorevlerChange={setGorevler}
        onKapaliGunlerChange={setKapaliGunler}
        onGeri={() => setSayfa("menu")}
      />
    );
  }

  if (sayfa === "siparisler") {
    return (
      <OrderManagement
        siparisler={siparisler}
        onSiparislerChange={setSiparisler}
        onGeri={() => setSayfa("menu")}
      />
    );
  }

  return null;
}

export default Admin;
