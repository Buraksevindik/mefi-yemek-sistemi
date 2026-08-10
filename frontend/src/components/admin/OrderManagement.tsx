import { useState } from "react";
import type { Siparis } from "../../types/order";
import { deleteOrder, getAllSecimler } from "../../services/orderService";
import { adminStyles } from "../../utils/styles";

type OrderManagementProps = {
  siparisler: Siparis[];
  onSiparislerChange: (siparisler: Siparis[]) => void;
  onGeri: () => void;
};

export default function OrderManagement({
  siparisler,
  onSiparislerChange,
  onGeri,
}: OrderManagementProps) {
  const styles = adminStyles;
  const [mesaj, setMesaj] = useState("");

  const yemekSayilari: { [key: string]: number } = {};
  siparisler.forEach((siparis) => {
    getAllSecimler(siparis).forEach((yemek: string) => {
      yemekSayilari[yemek] = (yemekSayilari[yemek] || 0) + 1;
    });
  });

  const toplamKisi = siparisler.length;

  const siparisSil = async (id: string) => {
    const onay = window.confirm("Bu siparişi silmek istediğinize emin misiniz?");
    if (!onay) return;

    try {
      await deleteOrder(id);
      onSiparislerChange(siparisler.filter((siparis) => siparis.id !== id));
      alert("Sipariş silindi.");
    } catch (error) {
      console.error(error);
      alert("Silme sırasında hata oluştu.");
    }
  };

const mesajOlustur = () => {
  const entries = siparisler.flatMap((siparis) => {
    const sonuc = [];

    // Ana kullanıcının siparişi
    if (typeof siparis.sira === "number") {
      sonuc.push({
        sira: siparis.sira,
        secimler: siparis.secimler ?? [],
      });
    }

    // Misafirlerin siparişleri
    for (const misafir of siparis.misafirler ?? []) {
      if (typeof misafir.sira === "number") {
        sonuc.push({
          sira: misafir.sira,
          secimler: misafir.secimler ?? [],
        });
      }
    }

    return sonuc;
  });

  // HERKESİ kendi sıra numarasına göre sırala
  entries.sort((a, b) => a.sira - b.sira);

  let metin = "";

  entries.forEach((entry) => {
    metin += `${entry.sira}. `;
    metin += entry.secimler.join("\n");
    metin += "\n\n";
  });

  setMesaj(metin);
};

  return (
    <div style={styles.page}>
      <button onClick={onGeri} style={styles.secondaryButton}>
        ← Geri
      </button>

      <h1>Admin Paneli</h1>
      <h2>Toplam Sipariş Özeti</h2>

      <button onClick={mesajOlustur} style={styles.warningButton}>
        Mesaj Oluştur
      </button>

      {mesaj && (
        <div style={{ ...styles.card, marginTop: "20px" }}>
          <h3>Oluşturulan Mesaj</h3>
          <pre
            style={{
              background: "#f4f4f4",
              padding: "15px",
              borderRadius: "8px",
            }}
          >
            {mesaj}
          </pre>
          <button
            onClick={() => {
              navigator.clipboard.writeText(mesaj);
              alert("Mesaj panoya kopyalandı!");
            }}
          >
            Mesajı Kopyala
          </button>
        </div>
      )}

      <div style={styles.card}>
        <ul>
          {Object.entries(yemekSayilari).map(([yemek, adet]) => (
            <li key={yemek}>
              {yemek} : {adet}
            </li>
          ))}
        </ul>
      </div>

      <p>
        <strong>Toplam Sipariş Veren Kişi:</strong> {toplamKisi}
      </p>

      {siparisler.map((siparis) => (
        <div key={siparis.id} style={styles.card}>
          <h3>
            #{siparis.sira ?? "-"} - {siparis.isim}
          </h3>
          <button
            onClick={() => siparisSil(siparis.id)}
            style={styles.dangerButton}
          >
            Siparişi Sil
          </button>
          <p>{siparis.email}</p>
          <h4>Kendi Siparişi</h4>
          <ul>
            {siparis.secimler?.map((yemek, index) => (
              <li key={index}>{yemek}</li>
            ))}
          </ul>
          {(siparis.misafirler ?? []).length > 0 && (
            <>
              <h4>Misafirler</h4>
              {(siparis.misafirler ?? []).map((misafir) => (
                <div key={misafir.id} style={{ marginBottom: "8px" }}>
                  <strong>{misafir.isim}</strong>
                  <ul>
                    {misafir.secimler.map((yemek, index) => (
                      <li key={index}>{yemek}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
