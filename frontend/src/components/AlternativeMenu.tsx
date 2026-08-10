import type { AlternatifMenu } from "../types/menu";
import { appStyles } from "../utils/styles";

type AlternativeMenuProps = {
  alternatifMenu: AlternatifMenu;
  secimler: { [kategori: string]: string };
  onYemekSec: (kategori: string, yemek: string) => void;
};

export default function AlternativeMenu({
  alternatifMenu,
  secimler,
  onYemekSec,
}: AlternativeMenuProps) {
  return (
    <div>
      <div style={appStyles.card}>
        <h3>🍔 Alternatif Ana Yemek</h3>
        <ul style={{ listStyleType: "none", padding: 0 }}>
          {alternatifMenu?.yemekler?.map((yemek: string, index: number) => {
            const seciliMi = secimler["Alternatif Yemek"] === yemek;
            return (
              <li
                key={index}
                style={{ margin: "10px 0", display: "flex", alignItems: "center", gap: "10px" }}
              >
                <button
                  onClick={() => onYemekSec("Alternatif Yemek", yemek)}
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

      <div style={appStyles.card}>
        <h3>🥤 İçecek Seçimi</h3>
        <ul style={{ listStyleType: "none", padding: 0 }}>
          {alternatifMenu?.icecekler?.map((icecek: string, index: number) => {
            const seciliMi = secimler["İçecek"] === icecek;
            return (
              <li
                key={index}
                style={{ margin: "10px 0", display: "flex", alignItems: "center", gap: "10px" }}
              >
                <button
                  onClick={() => onYemekSec("İçecek", icecek)}
                  style={{
                    ...appStyles.primaryButton,
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

      <div style={appStyles.card}>
        <h3>🍞 Ekmek Seçimi</h3>
        <ul style={{ listStyleType: "none", padding: 0 }}>
          {alternatifMenu?.ekmek?.map((ekmek: string, index: number) => {
            const seciliMi = secimler["Ekmek"] === ekmek;
            return (
              <li
                key={index}
                style={{ margin: "10px 0", display: "flex", alignItems: "center", gap: "10px" }}
              >
                <button
                  onClick={() => onYemekSec("Ekmek", ekmek)}
                  style={{
                    ...appStyles.primaryButton,
                    background: seciliMi ? "#16a34a" : "#2563eb",
                    minWidth: "100px",
                  }}
                >
                  {seciliMi ? "✓ Seçildi" : "+ Seç"}
                </button>
                <span>{ekmek}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
