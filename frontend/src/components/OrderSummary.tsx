import { appStyles } from "../utils/styles";

type OrderSummaryProps = {
  secimler: { [kategori: string]: string };
  siparisKapali: boolean;
  onOnayla: () => void;
};

export default function OrderSummary({
  secimler,
  siparisKapali,
  onOnayla,
}: OrderSummaryProps) {
  return (
    <div
      style={{
        ...appStyles.card,
        marginTop: "20px",
      }}
    >
      <h4>Seçimleriniz:</h4>
      <ul>
        {Object.values(secimler)
          .filter(Boolean)
          .map((item, i) => (
            <li key={i}>{item}</li>
          ))}
      </ul>

      <button
        onClick={onOnayla}
        disabled={siparisKapali}
        style={{
          ...appStyles.primaryButton,
          width: "100%",
          marginTop: "10px",
          background: siparisKapali ? "#9ca3af" : "#2563eb",
        }}
      >
        {siparisKapali ? "Sipariş Süresi Doldu" : "Siparişi Onayla ve Gönder"}
      </button>
    </div>
  );
}
