import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "./services/firebase";

function Admin({ geriDon }: any) {
  const [siparisler, setSiparisler] = useState<any[]>([]);
  const [mesaj, setMesaj] = useState("");

  useEffect(() => {
    const fetchSiparisler = async () => {
      const bugununTarihi = new Date()
        .toISOString()
        .split("T")[0];

      const q = query(
        collection(db, "siparisler"),
        where("tarih", "==", bugununTarihi)
      );

      const snapshot = await getDocs(q);

      const veriler = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setSiparisler(veriler);
    };

    fetchSiparisler();
  }, []);

  const yemekSayilari: { [key: string]: number } = {};

  siparisler.forEach((siparis) => {
    siparis.secimler?.forEach((yemek: string) => {
      yemekSayilari[yemek] =
        (yemekSayilari[yemek] || 0) + 1;
    });
  });

  const toplamKisi = siparisler.length;

  const siparisSil = async (id: string) => {
    const onay = window.confirm(
      "Bu siparişi silmek istediğinize emin misiniz?"
    );

    if (!onay) return;

    try {
      await deleteDoc(doc(db, "siparisler", id));

      setSiparisler((prev) =>
        prev.filter(
          (siparis) => siparis.id !== id
        )
      );

      alert("Sipariş silindi.");
    } catch (error) {
      console.error(error);
      alert("Silme sırasında hata oluştu.");
    }
  };

  const mesajOlustur = () => {
    let metin = "MEFİ YEMEK SİPARİŞLERİ\n\n";

    Object.entries(yemekSayilari).forEach(
      ([yemek, adet]) => {
        metin += `${yemek} : ${adet}\n`;
      }
    );

    metin += `\nToplam Kişi: ${toplamKisi}`;

    setMesaj(metin);
  };

  return (
    <div style={{ padding: "20px" }}>
      <button onClick={geriDon}>
        ← Sipariş Ekranına Dön
      </button>

      <h1>Admin Paneli</h1>

      <h2>Toplam Sipariş Özeti</h2>

      <button
        onClick={mesajOlustur}
        style={{
          marginTop: "15px",
          padding: "10px 15px",
          cursor: "pointer",
        }}
      >
        Mesaj Oluştur
      </button>

      {mesaj && (
        <div style={{ marginTop: "20px" }}>
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
              navigator.clipboard.writeText(
                mesaj
              );
              alert(
                "Mesaj panoya kopyalandı!"
              );
            }}
          >
            Mesajı Kopyala
          </button>
        </div>
      )}

      <ul>
        {Object.entries(yemekSayilari).map(
          ([yemek, adet]) => (
            <li key={yemek}>
              {yemek} : {adet}
            </li>
          )
        )}
      </ul>

      <p>
        <strong>
          Toplam Sipariş Veren Kişi:
        </strong>{" "}
        {toplamKisi}
      </p>

      <hr />

      {siparisler.map((siparis) => (
        <div
          key={siparis.id}
          style={{
            border: "1px solid #ddd",
            padding: "15px",
            marginBottom: "15px",
            borderRadius: "8px",
          }}
        >
          <h3>{siparis.isim}</h3>

          <button
            onClick={() =>
              siparisSil(siparis.id)
            }
            style={{
              background: "#dc3545",
              color: "white",
              border: "none",
              padding: "8px 12px",
              borderRadius: "4px",
              cursor: "pointer",
              marginBottom: "10px",
            }}
          >
            Siparişi Sil
          </button>

          <p>{siparis.email}</p>

          <ul>
            {siparis.secimler?.map(
              (
                yemek: string,
                index: number
              ) => (
                <li key={index}>
                  {yemek}
                </li>
              )
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default Admin;