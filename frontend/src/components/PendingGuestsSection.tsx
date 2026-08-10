import type { PendingGuest } from "../types/order";
import { appStyles } from "../utils/styles";

type PendingGuestsSectionProps = {
  misafirler: PendingGuest[];
  onMisafirEkle: () => void;
  onMisafirDuzenle: (id: string) => void;
  onMisafirSil: (id: string) => void;
  siparisKapali: boolean;
};

export default function PendingGuestsSection({
  misafirler,
  onMisafirEkle,
  onMisafirDuzenle,
  onMisafirSil,
  siparisKapali,
}: PendingGuestsSectionProps) {
  return (
    <div style={{ ...appStyles.card, marginTop: "20px" }}>
      <h4 style={{ marginTop: 0 }}>Misafirler</h4>

      {misafirler.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          {misafirler.map((misafir) => (
            <div
              key={misafir.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "12px",
                marginBottom: "8px",
              }}
            >
              <strong>{misafir.isim}</strong>
              <ul style={{ margin: "8px 0", paddingLeft: "20px" }}>
                {Object.values(misafir.secimler)
                  .filter(Boolean)
                  .map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
              </ul>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => onMisafirDuzenle(misafir.id)}
                  disabled={siparisKapali}
                  style={{
                    ...appStyles.primaryButton,
                    fontSize: "14px",
                    padding: "6px 12px",
                    background: siparisKapali ? "#9ca3af" : "#2563eb",
                  }}
                >
                  Düzenle
                </button>
                <button
                  onClick={() => onMisafirSil(misafir.id)}
                  disabled={siparisKapali}
                  style={{
                    ...appStyles.dangerButton,
                    fontSize: "14px",
                    padding: "6px 12px",
                    background: siparisKapali ? "#9ca3af" : "#dc2626",
                  }}
                >
                  Kaldır
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onMisafirEkle}
        disabled={siparisKapali}
        style={{
          ...appStyles.primaryButton,
          background: siparisKapali ? "#9ca3af" : "#16a34a",
        }}
      >
        + Misafir Ekle
      </button>
    </div>
  );
}
