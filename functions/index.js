// Firebase ve diğer kütüphaneler
const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
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
        to: "905539318881", // Uluslararası standart format
        type: "template",
        template: {
          name: "bilgi_talebi",
          language: {
            code: "tr"
          },
          components: [
            {
              type: "body",
              parameters: [
                {
                  type: "text",
                  text: "Haftalık menü"
                }
              ]
            }
          ]
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log(response.data);
    res.status(200).send(response.data);

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

                // --- 🛡️ MÜKERRER (DUPLICATE) İSTEK KONTROLÜ ---
                const mesajVarMi = await db
                  .collection("islenen_mesajlar")
                  .doc(messageId)
                  .get();

                if (mesajVarMi.exists) {
                    console.log("Mükerrer istek engellendi, bu mesaj daha önce işlendi:", messageId);
                    return res.sendStatus(200); // Meta'ya 200 dönüyoruz ki tekrar darlamasın
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
                      createdAt: new Date()
                    });
                } else {
                    console.log("Desteklenmeyen mesaj türü yoksayılıyor:", mesajTuru);
                    // Desteklenmeyen türlerde bile mesajı işlendi olarak kaydedelim ki döngüye girmesin
                    await db.collection("islenen_mesajlar").doc(messageId).set({
                        createdAt: new Date().toISOString(),
                    });
                    return res.sendStatus(200);
                }

                // Mesajın başarıyla işlendiğini kaydederek mükerrerliği kalıcı olarak engelle
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
  schedule: "22 09 * * 1-6",
  timeZone: "Europe/Istanbul"
}, async (event) => {
    console.log("Havuzdaki metin notlarını toplu işleme görevi başladı...");

    try {
        const snapshot = await db.collection("mesaj_havuzu").get();

        if (snapshot.empty) {
            console.log("Havuzda işlenecek yeni metin mesajı yok.");
            return;
        }

        let metinNotlari = [];
        snapshot.docs.forEach(doc => {
            metinNotlari.push(doc.data().content);
        });

        let menuVerisi = {};
        const aktifDoc = await db.collection("menuler").doc("aktif_menu").get();
        if (aktifDoc.exists) {
            menuVerisi = aktifDoc.data();
        } else {
            console.log("Aktif menü bulunamadı, metinler uygulanamıyor.");
            return;
        }

        console.log("Toplu metin notları işleniyor:", metinNotlari);

        const bugunIngilizce = ["Pazar", "Pazartesi", "Sali", "Carsamba", "Persembe", "Cuma", "Cumartesi"];
        const bugunIndex = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })).getDay();
        const bugun = bugunIngilizce[bugunIndex];

        const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
        console.log("Toplam işlenecek not:", snapshot.size);
        console.log(JSON.stringify(metinNotlari, null, 2));

        const topluPrompt = `
Mevcut Menü Verisi:
${JSON.stringify(menuVerisi)}

Bugün firmadan gelen metin mesajları/notlar şunlar:
${JSON.stringify(metinNotlari)}

Bugün günlerden: ${bugun}

Kurallar:
1. ${bugun} gününü güncelle.
2. Diğer günlere o günler için not gelmediyse dokunma.
3. Eğer meyve ve tatlı ile ilgili bir not gelmişse önceki menüdeki tatlı ve meyve bilgilerini güncelle(İsmi "Meyve" ve "Tatlı" veya Farklı meyve ve tatlı isimleri).
4. Aynı konu hakkında birden fazla not varsa en son gelen bilgi geçerlidir.
5. İptal edilen ürünleri kaldır.
6. Sadece güncellenmiş SON MENÜYÜ JSON olarak döndür.
7. Açıklama veya markdown yazma.
8. Menüyle ilgisi olmayan, anlamsız, eksik, spam veya tek karakterlik mesajları yok say.
9. Bir mesajın yemek değişikliği, tatlı değişikliği, meyve değişikliği veya menü güncellemesi içerdiğinden emin değilsen o mesajı dikkate alma.
`;

        const textResult = await model.generateContent(topluPrompt);
        const temizGuncelJson = textResult.response.text().replace(/```json|```/g, "").trim();
        menuVerisi = JSON.parse(temizGuncelJson);

        if (!menuVerisi[bugun]) {
          throw new Error(`${bugun} verisi Gemini çıktısında bulunamadı`);
        }

        await db.collection("menuler")
          .doc("aktif_menu")
          .set(
            {
              [bugun]: menuVerisi[bugun],
              updatedAt: new Date().toISOString()
            },
            { merge: true }
          );

        // Havuz ve işlenen mesaj kayıtlarını temizle
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.batchCommit ? await batch.commit() : await batch.commit();

        const islenenSnapshot = await db.collection("islenen_mesajlar").get();
        const batch2 = db.batch();
        islenenSnapshot.docs.forEach(doc => {
            batch2.delete(doc.ref);
        });
        await batch2.commit();

        console.log("Metin notları başarıyla menüye işlendi ve veritabanı güncellendi!");

    } catch (error) {
        console.error("Metin toplu işleme hatası:", error);
    }
});

exports.tatliMeyveHatirlatma = onSchedule({
  schedule: "20 09 * * 1-6",
  timeZone: "Europe/Istanbul"
}, async () => {
  try {
    await axios.post(
      "https://graph.facebook.com/v25.0/1125395517333883/messages",
      {
        messaging_product: "whatsapp",
        to: "905539318881",
        type: "template",
        template: {
          name: "bilgi_talebi",
          language: {
            code: "tr"
          },
          components: [
            {
              type: "body",
              parameters: [
                {
                  type: "text",
                  text: "Bugünkü tatlı ve meyve"
                }
              ]
            }
          ]
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("Tatlı ve meyve hatırlatma mesajı gönderildi.");

  } catch (error) {
    console.error(
      "Tatlı ve meyve hatırlatma hatası:",
      error.response?.data || error.message
    );
  }
});