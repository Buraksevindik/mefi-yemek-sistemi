// Firebase ve diğer kütüphaneler
const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
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
    console.error(error.response?.data || error.message);
    res.status(500).send(error.response?.data || error.message);
  }
});

// ==========================================
// 1. WHATSAPP WEBHOOK (Görselleri Anında, Metinleri Havuzda İşleyen Versiyon)
// ==========================================
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

                const CATERING_NUMARASI = "905539318881"; 
                const gonderenNumara = message.from;

                if (gonderenNumara !== CATERING_NUMARASI) {
                    console.log("Yetkisiz numaradan mesaj geldi, yoksayılıyor:", gonderenNumara);
                    return res.sendStatus(200);
                }

                const messageId = message.id;

                // Aynı mesajın mükerrer (duplicate) gelip gelmediğini kontrol et
                const mesajVarMi = await db
                  .collection("islenen_mesajlar")
                  .doc(messageId)
                  .get();

                if (mesajVarMi.exists) {
                    console.log("Bu mesaj daha önce işlendi:", messageId);
                    return res.sendStatus(200);
                }

                let mesajTuru = message.type; // "image" veya "text"

                // --- 1. SENARYO: GÖRSEL GELDİYSE ANINDA İŞLE ---
                if (mesajTuru === "image") {
                    const mediaId = message.image.id;
                    console.log("Catering şirketinden ana menü görseli alındı, anında işleniyor! Medya ID:", mediaId);

                    const mediaResponse = await axios.get(
                        `https://graph.facebook.com/v25.0/${mediaId}`,
                        {
                            headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
                        }
                    );

                    const mediaUrl = mediaResponse.data.url;
                    const downloadResponse = await axios.get(mediaUrl, {
                        headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
                        responseType: "arraybuffer",
                    });

                    gorselYolu = path.join(os.tmpdir(), `instant_menu_${Date.now()}.jpeg`);
                    fs.writeFileSync(gorselYolu, downloadResponse.data);

                    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
                    const imageData = fs.readFileSync(gorselYolu).toString("base64");

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
}

Kurallar:
1. Çorbaları ayrı ayrı listele.
2. Ana yemekleri ayrı ayrı listele.
3. Yan ürünleri ayrı ayrı listele.
4. Salata, cacık, yoğurt, turşu gibi ürünleri Ekstralar dizisinde TEK TEK eleman olarak yaz.
5. Gün isimleri TAM OLARAK şu şekilde olmalı: "Pazartesi", "Sali", "Carsamba", "Persembe", "Cuma", "Cumartesi".
6. JSON dışında hiçbir şey döndürme.
`;

                    const result = await model.generateContent([
                        prompt,
                        {
                            inlineData: {
                                data: imageData,
                                mimeType: "image/jpeg",
                            },
                        },
                    ]);

                    const temizJson = result.response.text().replace(/```json|```/g, "").trim();
                    const menuVerisi = JSON.parse(temizJson);

                    // Doğrudan aktif menü olarak kaydet
 await db.collection("menuler")
  .doc("aktif_menu")
  .set(
    {
      ...menuVerisi,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

                    console.log("Görsel başarıyla işlendi ve aktif menü güncellendi!");

                } 
                // --- 2. SENARYO: METİN MESAJI GELDİYSE HAVUZA AT ---
                else if (mesajTuru === "text") {
                    const metinIcerigi = message.text.body;
                    console.log("Metin mesajı alındı, havuza atılıyor:", metinIcerigi);

  await db.collection("mesaj_havuzu").doc(messageId).set({
    messageId: messageId,
    type: "text",
    content: metinIcerigi,
    createdAt: new Date().toISOString()
});
                } else {
                    console.log("Desteklenmeyen mesaj türü yoksayılıyor:", mesajTuru);
                    return res.sendStatus(200);
                }

                // Mesajın işlendiğini kaydederek mükerrerliği önle
                await db.collection("islenen_mesajlar").doc(messageId).set({
                    createdAt: new Date().toISOString(),
                });

            } else {
                console.log("whatsapp_business_account objesi değil:", body.object);
            }

            return res.sendStatus(200);
        } catch (err) {
            console.error("Webhook hata:", err);
            return res.sendStatus(500);
        } finally {
            if (gorselYolu && fs.existsSync(gorselYolu)) {
                try {
                    fs.unlinkSync(gorselYolu);
                } catch (cleanupErr) {
                    console.error("Geçici dosya temizleme hatası:", cleanupErr);
                }
            }
        }
    }

    return res.sendStatus(404);
});


// ==========================================
// 2. ZAMANLANMIŞ METİN NOTU İŞLEME FONKSİYONU (Cloud Scheduler)
// ==========================================
exports.gunlukMenuTetikleyicisi = onSchedule({
  schedule: "41 17 * * *", // Belirlediğin saat
  timeZone: "Europe/Istanbul"
}, async (event) => {
    console.log("Havuzdaki metin notlarını toplu işleme görevi başladı...");

    try {
        // 1. Havuzdaki henüz işlenmemiş metin mesajlarını çek
const snapshot = await db.collection("mesaj_havuzu").get();

        if (snapshot.empty) {
            console.log("Havuzda işlenecek yeni metin mesajı yok.");
            return;
        }

        let metinNotlari = [];
        snapshot.docs.forEach(doc => {
            metinNotlari.push(doc.data().content);
        });

        // 2. Firestore'daki mevcut aktif menüyü al
        let menuVerisi = {};
        const aktifDoc = await db.collection("menuler").doc("aktif_menu").get();
        if (aktifDoc.exists) {
            menuVerisi = aktifDoc.data();
        } else {
            console.log("Aktif menü bulunamadı, metinler uygulanamıyor.");
            return;
        }

        // 3. Metin notlarını Gemini ile mevcut menüye entegre et
        console.log("Toplu metin notları işleniyor:", metinNotlari);

        const bugunIngilizce = ["Pazar", "Pazartesi", "Sali", "Carsamba", "Persembe", "Cuma", "Cumartesi"];
        const bugunIndex = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })).getDay();
        const bugun = bugunIngilizce[bugunIndex];

        const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
        console.log(
  "Toplam işlenecek not:",
  snapshot.size
);

console.log(
  JSON.stringify(metinNotlari, null, 2)
);
        const topluPrompt = `
Mevcut Menü Verisi:
${JSON.stringify(menuVerisi)}

Bugün firmadan gelen metin mesajları/notlar şunlar:
${JSON.stringify(metinNotlari)}

Bugün günlerden: ${bugun}

Kurallar:

1. Sadece ${bugun} gününü güncelle.
2. Diğer günlere dokunma.
3. Aynı konu hakkında birden fazla not varsa en son gelen bilgi geçerlidir.
4. İptal edilen ürünleri kaldır.
5. Sadece güncellenmiş SON MENÜYÜ JSON olarak döndür.
6. Açıklama veya markdown yazma.
`;

        const textResult = await model.generateContent(topluPrompt);
        const temizGuncelJson = textResult.response.text().replace(/```json|```/g, "").trim();
        menuVerisi = JSON.parse(temizGuncelJson);

        if (!menuVerisi[bugun]) {
  throw new Error(
    `${bugun} verisi Gemini çıktısında bulunamadı`
  );
}

        // 4. Güncellenmiş menüyü tekrar kaydet
await db.collection("menuler")
  .doc("aktif_menu")
  .set(
    {
      [bugun]: menuVerisi[bugun],
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  );

        // 5. İşlenen metin notlarını havuzdan sil
const batch = db.batch();

snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
});

await batch.commit();

        console.log("Metin notları başarıyla menüye işlendi ve veritabanı güncellendi!");

    } catch (error) {
        console.error("Metin toplu işleme hatası:", error);
    }
});