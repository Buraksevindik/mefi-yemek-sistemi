  import type { Misafir } from "../types/order";
  import OrderDetails from "./OrderDetails";
  import { appStyles } from "../utils/styles";

  type SubmittedOrderProps = {
    secimler: string[];
    misafirler?: Misafir[];
    sonSira: number | null;
    siparisKapali: boolean;
    adminMi: boolean;
    onIptal: () => void;
    onAdminPanel: () => void;
    onSiparislerim: () => void;
  };

  export default function SubmittedOrder({
    secimler,
    misafirler = [],
    sonSira,
    siparisKapali,
    adminMi,
    onIptal,
    onAdminPanel,
    onSiparislerim,
  }: SubmittedOrderProps) {
    return (
      <div style={appStyles.page}>
        <h2>✅ Siparişiniz oluşturuldu.</h2>

        <OrderDetails
          sira={sonSira ?? undefined}
          secimler={secimler}
          misafirler={misafirler}
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
            <button
              onClick={onAdminPanel}
              style={{
                marginLeft: "0",
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
      </div>
    );
  }
