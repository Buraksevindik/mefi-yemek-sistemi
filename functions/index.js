// Firebase ve diğer kütüphaneler
const { onRequest } = require("firebase-functions/v2/https");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const path = require("path");
const os = require("os");
const fs = require("fs");
const axios = require("axios");

// Firebase Admin'i başlat
initializeApp();
const db = getFirestore();

const genAI = new GoogleGenerativeAI(process.env.API_KEY);

exports.testMesajGonder = onRequest(async (req, res) => {
  try {
    const response = await axios.post(
      "https://graph.facebook.com/v25.0/1125395517333883/messages",
      {
        messaging_product: "whatsapp",
        to: "905539318881",
        type: "text",
        text: {
          body: "Merhaba Burak, WhatsApp API testi başarılı 🚀",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(response.data);

    res.status(200).send("Mesaj gönderildi");
  } catch (error) {
    console.error(
      error.response?.data || error.message
    );

    res.status(500).send(error.response?.data || error.message);
  }
});

// WhatsApp Webhook Endpoint
exports.whatsappWebhook = onRequest(async (req, res) => {
    console.log(
        "-> WEBHOOK'A İSTEK GELDİ! Method:",
        req.method,
        "Body:",
        JSON.stringify(req.body)
    );

    // A) Meta Webhook Doğrulama (GET isteği)
    if (req.method === "GET") {
        const mode = req.query["hub.mode"];
        const token = req.query["hub.verify_token"];
        const challenge = req.query["hub.challenge"];

        const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

        if (mode && token === VERIFY_TOKEN) {
            console.log("Webhook başarıyla doğrulandı!");
            return res.status(200).send(challenge);
        } else {
            return res.sendStatus(403);
        }
    }

    // B) WhatsApp'tan Gelen Mesaj / Medya Bildirimi (POST isteği)
    if (req.method === "POST") {
        let gorselYolu = null;

        try {
            const body = req.body;

            console.log("========== POST GELDİ ==========");
            console.log(JSON.stringify(body, null, 2));
            console.log("================================");

            if (body.object === "whatsapp_business_account") {
                const entry = body.entry?.[0];
                const changes = entry?.changes?.[0];
                const value = changes?.value;

                const message = value?.messages?.[0];
                if (!message) {
  return res.sendStatus(200);
}
// Catering firmasının WhatsApp Business numarası (Örnek numara)
const CATERING_NUMARASI = "905539318881"; // Buraya gerçek numarayı yazmalısın

// Webhook içerisinde mesaj kontrolü yapılırken:
const gonderenNumara = message.from;

if (gonderenNumara !== CATERING_NUMARASI) {
    console.log("Yetkisiz numaradan mesaj geldi, yoksayılıyor:", gonderenNumara);
    return res.sendStatus(200);
}
                const messageId = message.id;

const mesajVarMi = await db
  .collection("islenen_mesajlar")
  .doc(messageId)
  .get();

if (mesajVarMi.exists) {
  console.log("Bu mesaj daha önce işlendi:", messageId);
  return res.sendStatus(200);
}

                if (message) {
                    console.log("MESSAGE TYPE:", message.type);
                    console.log("FROM:", message.from);

                    // Eğer gelen mesaj görsel ise
                    if (message.type === "image") {
                        const mediaId = message.image.id;

                        console.log(
                            "Catering şirketinden menü fotoğrafı alındı! Medya ID:",
                            mediaId
                        );

                        // 1. Meta API'den medya indirme linkini al
                        const mediaResponse = await axios.get(
                            `https://graph.facebook.com/v25.0/${mediaId}`,
                            {
                                headers: {
                                    Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
                                },
                            }
                        );

                        const mediaUrl = mediaResponse.data.url;

                        // 2. Görseli indirip geçici dizine kaydet
                        const downloadResponse = await axios.get(mediaUrl, {
                            headers: {
                                Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
                            },
                            responseType: "arraybuffer",
                        });

                        gorselYolu = path.join(
                            os.tmpdir(),
                            `menu_${Date.now()}.jpeg`
                        );

                        fs.writeFileSync(
                            gorselYolu,
                            downloadResponse.data
                        );

                        console.log(
                            "Menü görseli geçici dizine indirildi:",
                            gorselYolu
                        );
                        console.log("Gemini çağrısı başlıyor...");

                        // 3. Gemini ile işle
                        const model = genAI.getGenerativeModel({
                            model: "gemini-3.5-flash",
                        });

                        const imageData = fs
                            .readFileSync(gorselYolu)
                            .toString("base64");

                        const prompt = `
Bu bir yemek menüsü görseli. Pazartesi'den Cumartesi'ye kadar olan yemekleri analiz et ve SADECE aşağıdaki JSON formatında temiz bir çıktı ver, Markdown veya başka bir açıklama metni ekleme:

{
  "Pazartesi": {
    "Corbalar": ["Çorba adı"],
    "AnaYemekler": ["Ana yemek 1", "Ana yemek 2"],
    "YanUrunler": ["Pilav/Makarna adı"],
    "Ekstralar": [
      "Salata",
      "Cacık",
      "Yoğurt",
      "Turşu"
    ]
  }
  // Salı, Çarşamba, Perşembe, Cuma, Cumartesi için de aynı yapıyı devam ettir(1. Gün isimleri TAM OLARAK şu şekilde olmalı:

"Pazartesi"
"Sali"
"Carsamba"
"Persembe"
"Cuma"
"Cumartesi"

2. Baş harf büyük, diğer harfler küçük olacak.
3. Türkçe karakter kullanma.)
}

Kurallar:
1. Çorbaları ayrı ayrı listele.
2. Ana yemekleri ayrı ayrı listele.
3. Yan ürünleri ayrı ayrı listele.
4. Salata, cacık, yoğurt, turşu gibi ürünleri Ekstralar dizisinde TEK TEK eleman olarak yaz.
5. JSON dışında hiçbir şey döndürme.
Eğer menüde "Tatlı" veya "Meyve" başlığı varsa bunları Ekstralar listesine ekleme.
Sadece gerçek ürün isimlerini ekle.
`;

                        let result;
                        let deneme = 0;
                        const maxDeneme = 3;

while (deneme < maxDeneme) {
    try {
        result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: imageData,
                    mimeType: "image/jpeg",
                },
            },
        ]);

        console.log("Gemini çağrısı tamamlandı.");
        break;

    } catch (apiError) {

        if (apiError.status === 429) {
            console.log("Gemini kotası dolu.");

            return res.sendStatus(200);
        }

        deneme++;

        if (deneme >= maxDeneme) {
            throw apiError;
        }

        console.log(
            `Yoğunluk nedeniyle tekrar deneniyor... (${deneme}/${maxDeneme})`
        );

        await new Promise(resolve =>
            setTimeout(resolve, 2000)
        );
    }
}

                        const temizJson = result.response
                            .text()
                            .replace(/```json|```/g, "")
                            .trim();
                        
                        console.log("GEMINI ÇIKTISI:");
                        console.log(temizJson);
                        const menuVerisi = JSON.parse(temizJson);
                        
                        await db
                            .collection("menuler")
                            .doc("aktif_menu")
                            .set({
                                ...menuVerisi,
                                updatedAt: new Date().toISOString(),
                            });
await db
  .collection("islenen_mesajlar")
  .doc(messageId)
  .set({
    createdAt: new Date().toISOString(),
  });
                        console.log(
                            "Menü başarıyla okundu ve Firestore'a kaydedildi!"
                        );
                        
                    } else if (message.type === "text") {
                        const gelenMesaj = message.text.body;

                        console.log("Metin mesajı alındı:", gelenMesaj);

                        const model = genAI.getGenerativeModel({
                            model: "gemini-3.5-flash",
                        });

                        let sonuc;
                        let deneme = 0;
                        const maxDeneme = 3;

                        while (deneme < maxDeneme) {
                          try {
                            sonuc = await model.generateContent(`
Bu mesaj bir catering firmasından geliyor.

Mesaj:
"${gelenMesaj}"

Mesajın içindeki tatlı ve meyve bilgisini bul.

SADECE aşağıdaki JSON'u döndür:

{
  "tatli": "...",
  "meyve": "..."
}
`);
                            break;
                          } catch (err) {

    if (err.status === 429) {
        console.log("Gemini kotası dolu.");
        return res.sendStatus(200);
    }

    deneme++;

    if (deneme >= maxDeneme) {
        throw err;
    }

    console.log(
      `Gemini yoğun, tekrar deneniyor... (${deneme}/${maxDeneme})`
    );

    await new Promise(resolve =>
      setTimeout(resolve, 2000)
    );
}
                        }

                        const temizJson = sonuc.response
                            .text()
                            .replace(/```json|```/g, "")
                            .trim();

                        console.log("Gemini çıktısı:");
                        console.log(temizJson);
                        const veri = JSON.parse(temizJson);

                        // KRİTİK DÜZELTME: Türkiye saat dilimine (Europe/Istanbul) göre gün tespiti
// Türkiye saat dilimine göre küçük harfli ve İngilizce karakterli gün tespiti
const gunlerIngilizce = [
  "Pazar",
  "Pazartesi",
  "Sali",
  "Carsamba",
  "Persembe",
  "Cuma",
  "Cumartesi",
];
const bugunIndex = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })).getDay();
const bugun = gunlerIngilizce[bugunIndex];

                        const docRef = db
                          .collection("menuler")
                          .doc("aktif_menu");

                        const snap = await docRef.get();
                        const menu = snap.data();

                        const ekstralar = menu?.[bugun]?.Ekstralar || [];
                        console.log("EKSTRALAR ÖNCESİ:");
console.log(JSON.stringify(ekstralar, null, 2));

                        // eski tatlı ve meyveyi çıkar
                        const temizEkstralar = ekstralar.filter(item => {
  const i = item.trim().toLowerCase();

  return i !== "tatlı" &&
         i !== "tatli" &&
         i !== "meyve";
});
console.log("EKSTRALAR SONRASI:");
console.log(JSON.stringify(temizEkstralar, null, 2));

                        // yeni tatlı ve meyveyi ekle
                        if (veri.tatli) {
                          temizEkstralar.push(veri.tatli);
                        }

                        if (veri.meyve) {
                          temizEkstralar.push(veri.meyve);
                        }

                        await docRef.update({
                          [`${bugun}.Ekstralar`]: temizEkstralar,
                        });
await db
  .collection("islenen_mesajlar")
  .doc(messageId)
  .set({
    createdAt: new Date().toISOString(),
  });

                        console.log(`${bugun} günü için tatlı ve meyve kaydedildi.`);
                    }
                } else {
                    console.log("messages alanı yok.");
                }
            } else {
                console.log(
                    "whatsapp_business_account objesi değil:",
                    body.object
                );
            }

            return res.sendStatus(200);
        } catch (err) {
            console.error("Webhook işleme hatası:", err);
            return res.sendStatus(500);
        } finally {
            // KRİTİK DÜZELTME: Hata olsun veya olmasın, geçici dizine indirilen görsel dosyasını mutlaka sil (Disk şişmesini önle)
            if (gorselYolu && fs.existsSync(gorselYolu)) {
                try {
                    fs.unlinkSync(gorselYolu);
                    console.log("Geçici görsel dosyası başarıyla temizlendi:", gorselYolu);
                } catch (cleanupErr) {
                    console.error("Geçici dosya silinirken hata oluştu:", cleanupErr);
                }
            }
        }
    }

    return res.sendStatus(404);
});