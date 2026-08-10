import type { MenuData } from "../types/menu";
import { GUN_ISIMLERI_TURKCE, KATEGORI_SIRASI } from "../types/menu";
import { appStyles } from "../utils/styles";

type MenuSelectionProps = {
  menu: MenuData | null;
  bugununMenusu: Record<string, string[]> | undefined;
  bugunKey: string;
  secimler: { [kategori: string]: string };
  onYemekSec: (kategori: string, yemek: string) => void;
};

export default function MenuSelection({
  menu,
  bugununMenusu,
  bugunKey,
  secimler,
  onYemekSec,
}: MenuSelectionProps) {
  if (!menu) {
    return <p>Menü yükleniyor...</p>;
  }

  if (!bugununMenusu) {
    return <p>Bugüne ait menü bulunamadı.</p>;
  }

  return (
    <div>
      <h3>
        {GUN_ISIMLERI_TURKCE[bugunKey]} Menüsü (Her kategoriden en fazla 1 tane):
      </h3>
      {KATEGORI_SIRASI.filter((kategori) =>
        Array.isArray(bugununMenusu[kategori])
      ).map((kategori) => (
        <div key={kategori} style={appStyles.card}>
          <h4 style={{ textTransform: "capitalize", color: "#333", marginTop: 0 }}>
            {kategori}
          </h4>
          <ul style={{ listStyleType: "none", padding: 0 }}>
            {bugununMenusu[kategori].map((yemek: string, index: number) => {
              const seciliMi = secimler[kategori] === yemek;
              return (
                <li
                  key={index}
                  style={{ margin: "10px 0", display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <button
                    onClick={() => onYemekSec(kategori, yemek)}
                    style={{
                      ...appStyles.primaryButton,
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
  );
}
