import type { HaftalikMenu } from "../../types/menu";
import { BUGUN_MAP, KATEGORI_SIRASI } from "../../types/menu";
import { saveHaftalikMenu } from "../../services/menuService";
import { adminStyles } from "../../utils/styles";

type MenuManagementProps = {
  haftalikMenu: HaftalikMenu;
  aktifGun: string;
  onAktifGunChange: (gun: string) => void;
  onHaftalikMenuChange: (menu: HaftalikMenu) => void;
  onGeri: () => void;
};

export default function MenuManagement({
  haftalikMenu,
  aktifGun,
  onAktifGunChange,
  onHaftalikMenuChange,
  onGeri,
}: MenuManagementProps) {
  const styles = adminStyles;
  const menu = haftalikMenu[aktifGun];

  const haftalikMenuKaydet = async () => {
    try {
      await saveHaftalikMenu(haftalikMenu);
      alert("Haftalık menü güncellendi.");
    } catch (err) {
      console.error(err);
      alert("Kaydedilemedi.");
    }
  };

  return (
    <div style={styles.page}>
      <button
        onClick={onGeri}
        style={{
          ...styles.secondaryButton,
          marginBottom: "20px",
        }}
      >
        ← Geri
      </button>

      <h1>Haftalık Menü Yönetimi</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "220px 1fr",
          gap: "25px",
          marginTop: "20px",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            padding: "10px",
            border: "1px solid #ddd",
          }}
        >
          {Object.values(BUGUN_MAP).map((gun) => (
            <button
              key={gun}
              onClick={() => onAktifGunChange(gun)}
              style={{
                width: "100%",
                padding: "12px",
                marginBottom: "8px",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                background: aktifGun === gun ? "#2563eb" : "#f3f4f6",
                color: aktifGun === gun ? "white" : "#111",
              }}
            >
              {gun}
            </button>
          ))}
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            padding: "20px",
            border: "1px solid #ddd",
          }}
        >
          <h2 style={{ color: "#2563eb", marginBottom: "20px" }}>📅 {aktifGun}</h2>

          {KATEGORI_SIRASI.map((kategori) => {
            const yemekler = menu[kategori as keyof typeof menu];
            if (!yemekler) return null;

            return (
              <div key={kategori} style={{ marginBottom: "25px" }}>
                <h3
                  style={{
                    background: "#eff6ff",
                    padding: "10px",
                    borderRadius: "8px",
                  }}
                >
                  {kategori}
                </h3>

                {yemekler.map((yemek, index) => (
                  <div
                    key={index}
                    style={{ display: "flex", gap: "10px", marginTop: "8px" }}
                  >
                    <input
                      value={yemek}
                      onChange={(e) => {
                        const yeniMenu = JSON.parse(JSON.stringify(haftalikMenu));
                        yeniMenu[aktifGun][
                          kategori as keyof typeof yeniMenu[typeof aktifGun]
                        ][index] = e.target.value;
                        onHaftalikMenuChange(yeniMenu);
                      }}
                      style={{ flex: 1, padding: "10px" }}
                    />
                    <button
                      style={styles.dangerButton}
                      onClick={() => {
                        const yeniMenu = JSON.parse(JSON.stringify(haftalikMenu));
                        yeniMenu[aktifGun][
                          kategori as keyof typeof yeniMenu[typeof aktifGun]
                        ].splice(index, 1);
                        onHaftalikMenuChange(yeniMenu);
                      }}
                    >
                      Sil
                    </button>
                  </div>
                ))}

                <button
                  style={{ ...styles.successButton, marginTop: "10px" }}
                  onClick={() => {
                    const yeniMenu = JSON.parse(JSON.stringify(haftalikMenu));
                    yeniMenu[aktifGun][
                      kategori as keyof typeof yeniMenu[typeof aktifGun]
                    ].push("");
                    onHaftalikMenuChange(yeniMenu);
                  }}
                >
                  + Yeni Ekle
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={haftalikMenuKaydet}
        style={{
          ...styles.successButton,
          width: "100%",
          marginTop: "25px",
          fontSize: "18px",
        }}
      >
        Kaydet
      </button>
    </div>
  );
}
