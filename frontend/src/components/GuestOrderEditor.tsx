import { useState } from "react";
import type { MenuData, AlternatifMenu } from "../types/menu";
import { GUNLER, GUN_ISIMLERI_TURKCE } from "../types/menu";
import MenuSelection from "./MenuSelection";
import AlternativeMenu from "./AlternativeMenu";
import { appStyles } from "../utils/styles";

type GuestOrderEditorProps = {
  menu: MenuData | null;
  alternatifMenu: AlternatifMenu | null;
  initialIsim?: string;
  initialSecimler?: { [kategori: string]: string | string[] };
  initialSecimTipi?: "gunluk" | "alternatif" | null;
  onKaydet: (isim: string, secimler: string[], secimTipi: "gunluk" | "alternatif") => void;
  onIptal: () => void;
  baslik?: string;
};

export default function GuestOrderEditor({
  menu,
  alternatifMenu,
  initialIsim = "",
  initialSecimler = {},
  initialSecimTipi = null,
  onKaydet,
  onIptal,
  baslik = "Misafir Siparişi",
}: GuestOrderEditorProps) {
  const [isim, setIsim] = useState(initialIsim);
  const [secimler, setSecimler] = useState<{
  [kategori: string]: string | string[];
}>(initialSecimler);
  const [secimTipi, setSecimTipi] = useState<"gunluk" | "alternatif" | null>(
    initialSecimTipi || null
  );

  const bugunIndex = new Date().getDay();
  const bugunKey = GUNLER[bugunIndex];
  const bugununMenusu = menu?.[bugunKey];

  const yemekSec = (kategori: string, yemek: string) => {
  setSecimler((prev) => {
    // EKSTRALAR: birden fazla seçim yapılabilir
    if (kategori === "Ekstralar") {
      const mevcutSecimler = Array.isArray(prev[kategori])
        ? prev[kategori]
        : [];

      const zatenSecili = mevcutSecimler.includes(yemek);

      return {
        ...prev,
        [kategori]: zatenSecili
          ? mevcutSecimler.filter((item) => item !== yemek)
          : [...mevcutSecimler, yemek],
      };
    }

    // Diğer kategoriler: sadece 1 seçim
    return {
      ...prev,
      [kategori]: prev[kategori] === yemek ? "" : yemek,
    };
  });
};

  const kaydet = () => {
    const trimmedIsim = isim.trim();
    if (!trimmedIsim) {
      alert("Lütfen misafir adı girin.");
      return;
    }

    const gecerliSecimler = Object.values(secimler)
  .flatMap((secim) => Array.isArray(secim) ? secim : [secim])
  .filter((yemek) => yemek !== "");
    if (gecerliSecimler.length === 0) {
      alert("Lütfen en az bir yemek seçin!");
      return;
    }

    if (!secimTipi) {
      alert("Lütfen menü tipi seçin.");
      return;
    }

    onKaydet(trimmedIsim, gecerliSecimler, secimTipi);
  };

  return (
    <div style={appStyles.page}>
      <h2>{baslik}</h2>

      <div style={appStyles.card}>
        <label htmlFor="misafir-adi" style={{ display: "block", marginBottom: "8px" }}>
          <strong>Misafir Adı</strong>
        </label>
        <input
          id="misafir-adi"
          type="text"
          value={isim}
          onChange={(e) => setIsim(e.target.value)}
          placeholder="Örn: Mehmet, Ayşe, M1"
          style={{
            width: "100%",
            padding: "10px",
            fontSize: "16px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            boxSizing: "border-box",
          }}
        />
      </div>

      {!secimTipi ? (
        <div style={appStyles.card}>
          <h3>Menü Seçimi</h3>
          <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
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
              style={{ ...appStyles.primaryButton, background: "#f59e0b" }}
            >
              🍔 Alternatif / Alakart
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

          <div style={{ ...appStyles.card, marginTop: "20px" }}>
            <h4>Seçimler:</h4>
            <ul>
              {Object.values(secimler)
                .filter(Boolean)
                .map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
            </ul>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
        <button onClick={kaydet} style={appStyles.primaryButton}>
          Kaydet
        </button>
        <button onClick={onIptal} style={{ ...appStyles.primaryButton, background: "#6b7280" }}>
          İptal
        </button>
      </div>
    </div>
  );
}
