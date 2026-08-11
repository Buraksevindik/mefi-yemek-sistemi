  import type { Misafir } from "../types/order";
  import OrderWithGuests from "./OrderDetails";
  import { appStyles } from "../utils/styles";

  type ExistingOrderProps = {
    siparis: {
      sira?: number;
      secimler: string[];
      misafirler?: Misafir[]; 
    };
    siparisKapali: boolean;
    adminMi: boolean;
    onIptal: () => void;
    onAdminPanel: () => void;
    onSiparislerim: () => void;
  };

  export default function ExistingOrder({
    siparis,
    siparisKapali,
    adminMi,
    onIptal,
    onAdminPanel,
    onSiparislerim,
  }: ExistingOrderProps) {
    return (
      <div style={appStyles.page}>
        <h2>📋 Bugünkü Siparişiniz</h2>

        <OrderWithGuests
          sira={siparis.sira}
          secimler={siparis.secimler}
          misafirler={siparis.misafirler}
        />

        <div style={{ marginTop: "20px", display: "flex", flexWrap: "wrap", gap: "10px" }}>

          <button
            onClick={onSiparislerim}
            style={{
              ...appStyles.primaryButton,
              background: "#16a34a",
            }}
          >
            Siparişleri Düzenle
          </button>

          <button
            onClick={onIptal}
            style={{
              ...appStyles.dangerButton,
              background: siparisKapali ? "#9ca3af" : "#dc2626",
              cursor: "pointer",
            }}
          >
            {siparisKapali ? "Sipariş Süresi Doldu" : "Siparişi İptal Et"}
          </button>

          {adminMi && (
            <button style={appStyles.successButton} onClick={onAdminPanel}>
              Admin Paneli
            </button>
          )}
        </div>
      </div>
    );
  }
