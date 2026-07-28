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
        try {
            const body = req.body;

            console.log("========== POST GELDİ ==========");
            console.log(JSON.stringify(body, null, 2));
            console.log("================================");

            if (body.object === "whatsapp_business_account") {
                const entry = body.entry?.[0];
                const changes = entry?.changes?.[0];
                const value = changes?.value;

                console.log("VALUE:");
                console.log(JSON.stringify(value, null, 2));

                const message = value?.messages?.[0];

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

                        const gorselYolu = path.join(
                            os.tmpdir(),
                            "menu.jpeg"
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
    "Ekstralar": ["Salata / Cacık / Yoğurt vb.", "Tatlı / Meyve: SORULACAK"]
  }
  // Salı, Çarşamba, Perşembe, Cuma, Cumartesi için de aynı yapıyı devam ettir
}

Kurallar:
1. Çorba, ana yemek ve yan ürünleri menüden aynen al.
2. "Ekstralar" alanına menüdeki diğer yan ürünleri ekle ve tatlı/meyve seçeneklerinin yanına mutlaka "SORULACAK" ibaresini yaz.
`;

                        let result;
                        let deneme = 0;
                        const maxDeneme = 3;

                        while (deneme < maxDeneme) {
                            try {
                                result =
                                    await model.generateContent([
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
                                deneme++;

                                if (deneme >= maxDeneme) {
                                    throw apiError;
                                }

                                console.log(
                                    `Yoğunluk nedeniyle tekrar deneniyor... (${deneme}/${maxDeneme})`
                                );

                                await new Promise((resolve) =>
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

                        console.log(
                            "Menü başarıyla okundu ve Firestore'a kaydedildi!"
                        );
                    } else if (message.type === "text") {
                        console.log(
                            "Metin mesajı alındı:",
                            message.text.body
                        );
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
        }
    }

    return res.sendStatus(404);
});