import { adminStyles } from "../../utils/styles";

type AdminDashboardProps = {
  onGeriDon: () => void;
  onSayfaSec: (
    sayfa: "haftalikmenu" | "alternatif" | "siparisler" | "stajyerler" | "scheduler"
  ) => void;
};

export default function AdminDashboard({
  onGeriDon,
  onSayfaSec,
}: AdminDashboardProps) {
  const styles = adminStyles;

  return (
    <div style={styles.page}>
      <button
        onClick={onGeriDon}
        style={{
          padding: "10px 16px",
          fontSize: "15px",
          borderRadius: "8px",
          border: "none",
          cursor: "pointer",
          background: "#2563eb",
          color: "white",
          marginBottom: "15px",
        }}
      >
        ← Sipariş Ekranına Geri Dön
      </button>

      <h1>Admin Paneli</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
          gap: "24px",
          marginTop: "30px",
        }}
      >
        <button
          onClick={() => onSayfaSec("haftalikmenu")}
          style={{
            ...styles.successButton,
            width: "100%",
            padding: "30px",
            fontSize: "20px",
          }}
        >
          🗓️ Haftalık Menü Yönetimi
        </button>

        <button
          onClick={() => onSayfaSec("alternatif")}
          style={{
            ...styles.warningButton,
            width: "100%",
            padding: "30px",
            fontSize: "20px",
          }}
        >
          🍔 Alternatif Menü Yönetimi
        </button>

        <button
          onClick={() => onSayfaSec("siparisler")}
          style={{
            ...styles.primaryButton,
            width: "100%",
            padding: "30px",
            fontSize: "20px",
          }}
        >
          📋 Siparişleri Görüntüle
        </button>

        <button
          onClick={() => onSayfaSec("scheduler")}
          style={{
            background: "#7c3aed",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            width: "100%",
            padding: "30px",
            fontSize: "20px",
          }}
        >
          ⏰ Zamanlayıcı Yönetimi
        </button>

        <button
          onClick={() => onSayfaSec("stajyerler")}
          style={{
            background: "#dc2626",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            width: "100%",
            padding: "30px",
            fontSize: "20px",
          }}
        >
          👨‍💼 Stajyer Yönetimi
        </button>
      </div>
    </div>
  );
}
