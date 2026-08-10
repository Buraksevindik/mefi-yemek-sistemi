import type { Misafir } from "../types/order";
import { appStyles } from "../utils/styles";

type OrderWithGuestsProps = {
  sira?: number;
  secimler: string[];
  misafirler?: Misafir[];
  showSira?: boolean;
  siparisKapali?: boolean;

  onKendiSiparisiDuzenle?: () => void;
  onKendiSiparisiSil?: () => void;

  onMisafirDuzenle?: (misafir: Misafir) => void;
  onMisafirSil?: (misafir: Misafir) => void;
};

export default function OrderWithGuests({
  sira,
  secimler,
  misafirler = [],
  showSira = true,
  siparisKapali = false,
  onKendiSiparisiDuzenle,
  onKendiSiparisiSil,
  onMisafirDuzenle,
  onMisafirSil,
}: OrderWithGuestsProps) {
  return (
    <div>
      {showSira && sira !== undefined && (
        <h3 style={{ color: "#2563eb", marginBottom: "15px" }}>
          Siparişiniz #{sira}
        </h3>
      )}

      {/* ================================================= */}
      {/* KENDİ SİPARİŞİ */}
      {/* ================================================= */}

      <div style={appStyles.card}>
        <h4 style={{ marginTop: 0 }}>Kendi Siparişiniz</h4>

        {secimler.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: "20px" }}>
            {secimler.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        ) : (
          <p style={{ color: "#6b7280", margin: 0 }}>
            Henüz seçim yapılmadı.
          </p>
        )}

        {/* Kendi sipariş işlemleri */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginTop: "14px",
            flexWrap: "wrap",
          }}
        >
          {onKendiSiparisiDuzenle && (
            <button
              onClick={onKendiSiparisiDuzenle}
              disabled={siparisKapali}
              style={{
                ...appStyles.primaryButton,
                background: siparisKapali ? "#9ca3af" : "#2563eb",
                fontSize: "13px",
                padding: "7px 11px",
              }}
            >
              Düzenle
            </button>
          )}

          {onKendiSiparisiSil && (
            <button
              onClick={onKendiSiparisiSil}
              disabled={siparisKapali}
              style={{
                ...appStyles.dangerButton,
                background: siparisKapali ? "#9ca3af" : "#dc2626",
                fontSize: "13px",
                padding: "7px 11px",
              }}
            >
              Kaldır
            </button>
          )}
        </div>
      </div>

      {/* ================================================= */}
      {/* MİSAFİRLER */}
      {/* ================================================= */}

      {misafirler.length > 0 && (
        <div style={{ marginTop: "16px" }}>
          <h4>Misafirler</h4>

          {misafirler.map((misafir) => (
            <div
              key={misafir.id}
              style={{
                ...appStyles.card,
                marginBottom: "10px",
              }}
            >
              {/* İsim + sıra numarası */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "8px",
                }}
              >
                <strong>{misafir.isim}</strong>

                {typeof misafir.sira === "number" && (
                  <strong
                    style={{
                      color: "#16a34a",
                    }}
                  >
                    #{misafir.sira}
                  </strong>
                )}
              </div>

              {/* Yemekler */}
              {misafir.secimler.length > 0 ? (
                <ul
                  style={{
                    margin: "8px 0 0",
                    paddingLeft: "20px",
                  }}
                >
                  {misafir.secimler.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p
                  style={{
                    color: "#6b7280",
                    margin: 0,
                  }}
                >
                  Henüz seçim yapılmadı.
                </p>
              )}

              {/* Misafir işlemleri */}
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginTop: "14px",
                  flexWrap: "wrap",
                }}
              >
                {onMisafirDuzenle && (
                  <button
                    onClick={() => onMisafirDuzenle(misafir)}
                    disabled={siparisKapali}
                    style={{
                      ...appStyles.primaryButton,
                      background: siparisKapali
                        ? "#9ca3af"
                        : "#2563eb",
                      fontSize: "13px",
                      padding: "7px 11px",
                    }}
                  >
                    Düzenle
                  </button>
                )}

                {onMisafirSil && (
                  <button
                    onClick={() => onMisafirSil(misafir)}
                    disabled={siparisKapali}
                    style={{
                      ...appStyles.dangerButton,
                      background: siparisKapali
                        ? "#9ca3af"
                        : "#dc2626",
                      fontSize: "13px",
                      padding: "7px 11px",
                    }}
                  >
                    Kaldır
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}