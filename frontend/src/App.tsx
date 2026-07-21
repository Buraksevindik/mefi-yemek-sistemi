import { useState } from 'react';
import './App.css';

const SEND_URL = "https://graph.facebook.com/v25.0/1125395517333883/messages";
const ACCESS_TOKEN = "EAAOvH6ZA7TjwBSEtF586ZAezlvOiYT9ZC3wNPubLbtkwb2rN1jVw1q4TZAUdvWKXTA00meksiZC6JMj1lfYRSXaB1uvgCJLuRpNu32kTZB9ZCyeJUBeH2tRXvKg8YT8rCW2yz4CoZC3urS07uozGHKNt6ZBdLcT9fC2a0ZBewXyri0OdOClzdHtwcLvZBZC5KpOlbX9EQslmUezddR6hqIjVAs5HgV4XgX2MA8VhAvZAFedSmzkNLz1PnVOD3PIjhKT5cqK1itBAZAz26fA22ZBVzdewnu0Yy8ZB"; // Meta panelindeki uzun token'ı buraya yapıştır

function App() {
  const [status, setStatus] = useState<string>('Hazır');

  const sendTestMessage = async () => {
    setStatus('Gönderiliyor...');
const payload = {
      messaging_product: "whatsapp",
      to: "905539318881", // Kendi numaran
      type: "template",
      template: {
        name: "hello_world",
        language: {
          code: "en_US"
        }
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
      console.log("Sonuç:", data);
      
      if (response.ok) {
        setStatus('Başarılı! Mesaj gönderildi.');
        alert("Mesaj başarıyla gönderildi!");
      } else {
        setStatus(`Hata: ${data.error?.message || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error("Hata oluştu:", error);
      setStatus('Bağlantı hatası oluştu.');
    }
  };

  return (
    <div style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
      <h1>Mefi Yemek Sistemi - WhatsApp Test</h1>
      <p>Meta Cloud API entegrasyonunu test etmek için aşağıdaki butonu kullanabilirsin.</p>
      
      <div style={{ marginTop: "20px", padding: "20px", border: "1px solid #ccc", borderRadius: "8px", background: "#f9f9f9" }}>
        <button
          type="button"
          onClick={sendTestMessage}
          style={{ padding: "12px 24px", fontSize: "16px", cursor: "pointer", backgroundColor: "#25D366", color: "white", border: "none", borderRadius: "5px", fontWeight: "bold" }}
        >
          WhatsApp Test Mesajı Gönder
        </button>
        <p style={{ marginTop: "15px" }}><strong>Durum:</strong> {status}</p>
      </div>
    </div>
  );
}

export default App;