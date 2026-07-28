import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./services/firebase";

function Admin() {
  const [siparisler, setSiparisler] = useState<any[]>([]);
  const [mesaj, setMesaj] = useState("");
  useEffect(() => {
    const fetchSiparisler = async () => {
      const snapshot = await getDocs(
        collection(db, "siparisler")
      );

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
    yemekSayilari[yemek] = (yemekSayilari[yemek] || 0) + 1;
  });
});
const toplamKisi = siparisler.length;

const mesajOlustur = () => {
  let metin = "MEFİ YEMEK SİPARİŞLERİ\n\n";

  Object.entries(yemekSayilari).forEach(([yemek, adet]) => {
    metin += `${yemek} : ${adet}\n`;
  });

  metin += `\nToplam Kişi: ${toplamKisi}`;

  setMesaj(metin);
};

  return (
    <div style={{ padding: "20px" }}>
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
    navigator.clipboard.writeText(mesaj);
    alert("Mesaj panoya kopyalandı!");
  }}
>
  Mesajı Kopyala
</button>
  </div>
)}

<ul>
  {Object.entries(yemekSayilari).map(([yemek, adet]) => (
    <li key={yemek}>
      {yemek} : {adet}
    </li>
  ))}
</ul>
<p>
  <strong>Toplam Sipariş Veren Kişi:</strong> {toplamKisi}
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

          <p>{siparis.email}</p>

          <ul>
            {siparis.secimler?.map(
              (yemek: string, index: number) => (
                <li key={index}>{yemek}</li>
              )
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default Admin;