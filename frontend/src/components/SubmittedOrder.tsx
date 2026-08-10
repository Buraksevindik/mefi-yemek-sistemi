import { appStyles } from "../utils/styles";

type SubmittedOrderProps = {
  secimler: { [kategori: string]: string };
  sonSira: number | null;
  siparisKapali: boolean;
  adminMi: boolean;
  onDuzenle: () => void;
  onIptal: () => void;
  onAdminPanel: () => void;
};

export default function SubmittedOrder({
  secimler,
  sonSira,
  siparisKapali,
  adminMi,
  onDuzenle,
  onIptal,
  onAdminPanel,
}: SubmittedOrderProps) {
  return (
    <div style={appStyles.page}>
      <h2>✅ Siparişiniz oluşturuldu.</h2>

      {sonSira !== null && (
        <h3 style={{ color: "#2563eb", marginBottom: "15px" }}>
          Sıra Numaranız: #{sonSira}
        </h3>
      )}

      <h3>Siparişiniz:</h3>
      <ul>
        {Object.entries(secimler)
          .filter(([, value]) => value)
          .map(([key, value]) => (
            <li key={key}>
              <strong>{key}:</strong> {value}
            </li>
          ))}
      </ul>

      <button
        onClick={onDuzenle}
        style={{
          padding: "10px 16px",
          fontSize: "15px",
          borderRadius: "8px",
          border: "none",
          cursor: "pointer",
          background: siparisKapali ? "#9ca3af" : "#2563eb",
          color: "white",
        }}
      >
        {siparisKapali ? "Sipariş Süresi Doldu" : "Siparişi Düzenle"}
      </button>

      <button
        onClick={onIptal}
        style={{
          ...appStyles.dangerButton,
          marginLeft: "10px",
          background: siparisKapali ? "#9ca3af" : "#dc2626",
          cursor: "pointer",
        }}
      >
        {siparisKapali ? "Sipariş Süresi Doldu" : "Siparişi İptal Et"}
      </button>

      {adminMi && (
        <button
          onClick={onAdminPanel}
          style={{
            marginLeft: "10px",
            background: "#28a745",
            color: "white",
            border: "none",
            padding: "8px 12px",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Admin Paneline Git
        </button>
      )}
    </div>
  );
}
