import { useState } from 'react';
import menuData from './menu.json';
import './App.css';

const SEND_URL = "https://graph.facebook.com/v25.0/1125395517333883/messages";
const ACCESS_TOKEN = "EAAOvH6ZA7TjwBSEtF586ZAezlvOiYT9ZC3wNPubLbtkwb2rN1jVw1q4TZAUdvWKXTA00meksiZC6JMj1lfYRSXaB1uvgCJLuRpNu32kTZB9ZCyeJUBeH2tRXvKg8YT8rCW2yz4CoZC3urS07uozGHKNt6ZBdLcT9fC2a0ZBewXyri0OdOClzdHtwcLvZBZC5KpOlbX9EQslmUezddR6hqIjVAs5HgV4XgX2MA8VhAvZAFedSmzkNLz1PnVOD3PIjhKT5cqK1itBAZAz26fA22ZBVzdewnu0Yy8ZB";

function App() {
  const [status, setStatus] = useState<string>('Hazır');
  // Kullanıcının yaptığı seçimleri tutmak için state (Örn: { Pazartesi: { corba: '...', yemek: '...' } })
  const [secimler, setSecimler] = useState<{ [key: string]: { corba?: string; yemek?: string } }>({});

  const handleSelectionChange = (gun: string, tip: 'corba' | 'yemek', deger: string) => {
    setSecimler(prev => ({
      ...prev,
      [gun]: {
        ...prev[gun],
        [tip]: deger
      }
    }));
  };

  const sendOrderToWhatsApp = async () => {
    setStatus('Sipariş gönderiliyor...');
    
    // Seçimleri metne dökelim
    let siparisMetni = "🍽️ *Günlük Yemek Seçimlerim*\n\n";
    Object.entries(secimler).forEach(([gun, detay]) => {
      siparisMetni += `*${gun}:*\n`;
      if (detay.corba) siparisMetni += `- Çorba: ${detay.corba}\n`;
      if (detay.yemek) siparisMetni += `- Ana Yemek: ${detay.yemek}\n`;
      siparisMetni += `\n`;
    });

    const payload = {
      messaging_product: "whatsapp",
      to: "905539318881", // Test numarası
      type: "text",
      text: {
        body: siparisMetni
      }
    };

    try {
      const response = await fetch(SEND_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (response.ok) {
        setStatus('Başarılı! Sipariş WhatsApp ile gönderildi.');
        alert("Siparişler başarıyla gönderildi!");
      } else {
        setStatus(`Hata: ${data.error?.message || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error("Hata oluştu:", error);
      setStatus('Bağlantı hatası oluştu.');
    }
  };

  return (
    <div style={{ padding: "30px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ textAlign: "center" }}>Mefi Yemek Seçim Sistemi</h1>
      <p style={{ textAlign: "center" }}>Lütfen haftalık menüden yemeklerinizi seçin ve WhatsApp üzerinden iletin.</p>
      
      {/* Menü Listeleme Alanı */}
      <div style={{ marginTop: "20px" }}>
        {Object.entries(menuData).map(([gun, detay]: [string, any]) => (
          <div key={gun} style={{ marginBottom: "20px", padding: "20px", border: "1px solid #ddd", borderRadius: "8px", background: "#fff" }}>
            <h3>{gun}</h3>
            
            <div style={{ marginTop: "10px" }}>
              <strong>Çorbalar:</strong>
              <div style={{ display: "flex", gap: "10px", marginTop: "5px", flexWrap: "wrap" }}>
                {detay.corbalar.map((corba: string, idx: number) => (
                  <label key={idx} style={{ cursor: "pointer", background: "#f1f1f1", padding: "6px 10px", borderRadius: "4px" }}>
                    <input 
                      type="radio" 
                      name={`corba-${gun}`} 
                      value={corba}
                      onChange={() => handleSelectionChange(gun, 'corba', corba)}
                    /> {corba}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginTop: "15px" }}>
              <strong>Ana Yemekler:</strong>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginTop: "5px" }}>
                {detay.ana_yemekler.map((yemek: string, idx: number) => (
                  <label key={idx} style={{ cursor: "pointer" }}>
                    <input 
                      type="radio" 
                      name={`yemek-${gun}`} 
                      value={yemek}
                      onChange={() => handleSelectionChange(gun, 'yemek', yemek)}
                    /> {yemek}
                  </label>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Gönderme Butonu ve Durum */}
      <div style={{ marginTop: "30px", padding: "20px", border: "1px solid #ccc", borderRadius: "8px", background: "#f9f9f9", textAlign: "center" }}>
        <button
          type="button"
          onClick={sendOrderToWhatsApp}
          style={{ padding: "12px 24px", fontSize: "16px", cursor: "pointer", backgroundColor: "#25D366", color: "white", border: "none", borderRadius: "5px", fontWeight: "bold" }}
        >
          Seçimleri WhatsApp ile Gönder
        </button>
        <p style={{ marginTop: "15px" }}><strong>Durum:</strong> {status}</p>
      </div>
    </div>
  );
}

export default App;