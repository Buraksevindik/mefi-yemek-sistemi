import type { Siparis } from "../types/order";
import { appStyles } from "../utils/styles";

type ExistingOrderProps = {
  siparis: Siparis;
  siparisKapali: boolean;
  adminMi: boolean;
  onDuzenle: () => void;
  onIptal: () => void;
  onAdminPanel: () => void;
};

export default function ExistingOrder({
  siparis,
  siparisKapali,
  adminMi,
  onDuzenle,
  onIptal,
  onAdminPanel,
}: ExistingOrderProps) {
  return (
    <div style={appStyles.page}>
      <h2>📋 Bugünkü Siparişiniz</h2>
      {siparis.sira !== undefined && (
        <h3 style={{ color: "#2563eb", marginBottom: "15px" }}>
          Sıra Numaranız: #{siparis.sira}
        </h3>
      )}

      <ul>
        {siparis.secimler.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>

      <button
        style={{
          ...appStyles.primaryButton,
          background: siparisKapali ? "#9ca3af" : "#2563eb",
        }}
        onClick={onDuzenle}
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
          style={{
            ...appStyles.successButton,
            marginLeft: "10px",
          }}
          onClick={onAdminPanel}
        >
          Admin Paneli
        </button>
      )}
    </div>
  );
}
