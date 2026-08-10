import { useState } from "react";
import type { AlternatifMenu } from "../../types/menu";
import { saveAlternatifMenu } from "../../services/menuService";
import { adminStyles } from "../../utils/styles";

type AlternativeMenuManagementProps = {
  alternatifMenu: AlternatifMenu;
  onAlternatifMenuChange: (menu: AlternatifMenu) => void;
  onGeri: () => void;
};

export default function AlternativeMenuManagement({
  alternatifMenu,
  onAlternatifMenuChange,
  onGeri,
}: AlternativeMenuManagementProps) {
  const styles = adminStyles;
  const [yeniYemek, setYeniYemek] = useState("");
  const [yeniIcecek, setYeniIcecek] = useState("");
  const [yeniEkmek, setYeniEkmek] = useState("");

  const yemekSil = (index: number) => {
    const yeniListe = [...(alternatifMenu.yemekler ?? [])];
    yeniListe.splice(index, 1);
    onAlternatifMenuChange({ ...alternatifMenu, yemekler: yeniListe });
  };

  const icecekSil = (index: number) => {
    const yeniListe = [...(alternatifMenu.icecekler ?? [])];
    yeniListe.splice(index, 1);
    onAlternatifMenuChange({ ...alternatifMenu, icecekler: yeniListe });
  };

  const ekmekSil = (index: number) => {
    const yeniListe = [...(alternatifMenu.ekmek ?? [])];
    yeniListe.splice(index, 1);
    onAlternatifMenuChange({ ...alternatifMenu, ekmek: yeniListe });
  };

  const alternatifMenuyuKaydet = async () => {
    try {
      await saveAlternatifMenu(alternatifMenu);
      alert("Alternatif menü güncellendi.");
    } catch (err) {
      console.error(err);
      alert("Kaydedilemedi.");
    }
  };

  return (
    <div style={styles.page}>
      <button onClick={onGeri} style={styles.secondaryButton}>
        ← Geri
      </button>

      <h1>Alternatif Menü Yönetimi</h1>

      <h2>🍔 Yemekler</h2>
      {alternatifMenu.yemekler?.map((yemek, index) => (
        <div
          key={index}
          style={{
            ...styles.card,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{yemek}</span>
          <button style={styles.dangerButton} onClick={() => yemekSil(index)}>
            Sil
          </button>
        </div>
      ))}
      <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
        <input
          value={yeniYemek}
          onChange={(e) => setYeniYemek(e.target.value)}
          placeholder="Yemek adı"
        />
        <button
          style={styles.successButton}
          onClick={() => {
            if (!yeniYemek.trim()) return;
            onAlternatifMenuChange({
              ...alternatifMenu,
              yemekler: [...(alternatifMenu.yemekler ?? []), yeniYemek.trim()],
            });
            setYeniYemek("");
          }}
        >
          + Ekle
        </button>
      </div>

      <h2 style={{ marginTop: "40px" }}>🥤 İçecekler</h2>
      {alternatifMenu.icecekler?.map((icecek, index) => (
        <div
          key={index}
          style={{
            ...styles.card,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{icecek}</span>
          <button style={styles.dangerButton} onClick={() => icecekSil(index)}>
            Sil
          </button>
        </div>
      ))}
      <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
        <input
          value={yeniIcecek}
          onChange={(e) => setYeniIcecek(e.target.value)}
          placeholder="İçecek adı"
        />
        <button
          style={styles.successButton}
          onClick={() => {
            if (!yeniIcecek.trim()) return;
            onAlternatifMenuChange({
              ...alternatifMenu,
              icecekler: [...(alternatifMenu.icecekler ?? []), yeniIcecek.trim()],
            });
            setYeniIcecek("");
          }}
        >
          + Ekle
        </button>
      </div>

      <h2 style={{ marginTop: "40px" }}>🍞 Ekmekler</h2>
      {alternatifMenu.ekmek?.map((ekmek, index) => (
        <div
          key={index}
          style={{
            ...styles.card,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{ekmek}</span>
          <button style={styles.dangerButton} onClick={() => ekmekSil(index)}>
            Sil
          </button>
        </div>
      ))}
      <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
        <input
          value={yeniEkmek}
          onChange={(e) => setYeniEkmek(e.target.value)}
          placeholder="Ekmek adı"
        />
        <button
          style={styles.successButton}
          onClick={() => {
            if (!yeniEkmek.trim()) return;
            onAlternatifMenuChange({
              ...alternatifMenu,
              ekmek: [...(alternatifMenu.ekmek ?? []), yeniEkmek.trim()],
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
          width: "100%",
          marginTop: "30px",
          fontSize: "18px",
          padding: "14px",
        }}
        onClick={alternatifMenuyuKaydet}
      >
        Kaydet
      </button>
    </div>
  );
}
