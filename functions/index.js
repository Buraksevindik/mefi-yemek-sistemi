// Firebase ve diğer kütüphaneler
const { onRequest } = require("firebase-functions/v2/https");
const { GoogleAuth } = require("google-auth-library");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const axios = require("axios");
const functions = require("firebase-functions");

// Firebase Admin'i başlat
initializeApp();
const db = getFirestore();

const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const CATERING_NUMARASI = "905539318881";


async function templateMesajiGonder(metin) {
    try {
        const response = await axios.post(
            "https://graph.facebook.com/v25.0/1125395517333883/messages",
            {
                messaging_product: "whatsapp",
                to: CATERING_NUMARASI,
                type: "template",
                template: {
                    name: "bilgi_talebi",
                    language: { code: "tr" },
                    components: [
                        {
                            type: "body",
                            parameters: [
                                {
                                    type: "text",
                                    text: metin
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

        console.log("WhatsApp başarılı:", response.data);
        return response.data;

    } catch (err) {
        console.error("Meta cevabı:", err.response?.data);
        throw err;
    }
}
async function normalMesajGonder(metin) {
    return axios.post(
        "https://graph.facebook.com/v25.0/1125395517333883/messages",
        {
            messaging_product: "whatsapp",
            to: CATERING_NUMARASI,
            type: "text",
            text: {
                body: metin
            }
        },
        {
            headers: {
                Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
                "Content-Type": "application/json"
            }
        }
    );
}

// ==========================================
// 2. WHATSAPP WEBHOOK
// ==========================================
exports.whatsappWebhook = onRequest(async (req, res) => {
    if (req.method === "GET") {
        const mode = req.query["hub.mode"];
        const token = req.query["hub.verify_token"];
        const challenge = req.query["hub.challenge"];
        const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

        if (mode && token === VERIFY_TOKEN) {
            return res.status(200).send(challenge);
        } else {
            return res.sendStatus(403);
        }
    }

    if (req.method === "POST") {
        try {
            const body = req.body;

            if (body.object === "whatsapp_business_account") {
                const entry = body.entry?.[0];
                const changes = entry?.changes?.[0];
                const value = changes?.value;
                const message = value?.messages?.[0];

                if (!message) return res.sendStatus(200);

                const gonderenNumara = message.from;
                if (gonderenNumara !== CATERING_NUMARASI) {
                    return res.sendStatus(200);
                }

                const messageId = message.id;

                // Mükerrer İstek Kontrolü
                const mesajVarMi = await db.collection("islenen_mesajlar").doc(messageId).get();
                if (mesajVarMi.exists) {
                    return res.sendStatus(200);
                }

                let mesajTuru = message.type; // "image" veya "text"

                if (mesajTuru === "image") {
                    const mediaId = message.image.id;
                    const mediaResponse = await axios.get(
                        `https://graph.facebook.com/v25.0/${mediaId}`,
                        { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` } }
                    );

                    const downloadResponse = await axios.get(mediaResponse.data.url, {
                        headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
                        responseType: "arraybuffer",
                    });

                    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
                    const imageData = Buffer.from(downloadResponse.data).toString("base64");

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
    ],
      "Icecekler": [
         "Kola",
         "Ayran"
        ],
        "Ekmek": [
            "Ekmek"
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
7. "Icecekler" alanını HER GÜN oluştur ve varsayılan olarak ["Kola","Ayran"] yaz.
8. "Ekmek" alanını HER GÜN oluştur ve varsayılan olarak ["Ekmek"] yaz.
9. Görselde kola, ayran veya ekmek yazmasa bile bu alanları eksiksiz oluştur.
10. Her gün için mutlaka şu alanlar bulunsun: Corbalar, AnaYemekler, YanUrunler, Ekstralar, Icecekler, Ekmek.
`;

                    const result = await model.generateContent([
                        prompt,
                        { inlineData: { data: imageData, mimeType: "image/jpeg" } },
                    ]);

                    const temizJson = result.response.text().replace(/```json|```/g, "").trim();
                    const menuVerisi = JSON.parse(temizJson);

                    await db.collection("menuler").doc("aktif_menu").set({
                        ...menuVerisi,
                        updatedAt: new Date().toISOString(),
                    }, { merge: true });

                } else if (mesajTuru === "text") {
                    const metinIcerigi = message.text.body;
                    await db.collection("mesaj_havuzu").doc(messageId).set({
                        messageId,
                        type: "text",
                        content: metinIcerigi,
                        createdAt: new Date()
                    });
                }

                // Mesajı işlenmiş olarak kaydet
                await db.collection("islenen_mesajlar").doc(messageId).set({
                    createdAt: new Date().toISOString(),
                });
            }

            return res.sendStatus(200);
        } catch (err) {
            console.error("Webhook hata:", err);
            return res.sendStatus(500);
        } 
    }

    return res.sendStatus(404);
});

// ==========================================
// 3. ZAMANLANMIŞ METİN NOTU İŞLEME
// ==========================================
exports.gunlukNotIsle = onSchedule({
  schedule: "43 15 * * 1-6",
  timeZone: "Europe/Istanbul"
}, async () => {
    try {
        const snapshot = await db.collection("mesaj_havuzu").get();
        if (snapshot.empty) return;

        const metinNotlari = snapshot.docs.map(doc => doc.data().content);

        const aktifDoc = await db.collection("menuler").doc("aktif_menu").get();
        if (!aktifDoc.exists) return;
        let menuVerisi = aktifDoc.data();

        const bugunIngilizce = ["Pazar", "Pazartesi", "Sali", "Carsamba", "Persembe", "Cuma", "Cumartesi"];
        const bugunIndex = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })).getDay();
        const bugun = bugunIngilizce[bugunIndex];

        const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

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

        await db.collection("menuler").doc("aktif_menu").set({
            [bugun]: menuVerisi[bugun],
            updatedAt: new Date().toISOString()
        }, { merge: true });

        // Havuz ve işlenen mesajları temizle
        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        
        const islenenSnapshot = await db.collection("islenen_mesajlar").get();
        islenenSnapshot.docs.forEach(doc => batch.delete(doc.ref));

        await batch.commit();
        console.log("Metin notları başarıyla menüye işlendi.");

    } catch (error) {
        console.error("Metin toplu işleme hatası:", error);
    }
});

// ==========================================
// 4. TATLI & MEYVE HATIRLATMA
// ==========================================
exports.tatliMeyveHatirlatma = onSchedule({
  schedule: "42 15 * * 1-6",
  timeZone: "Europe/Istanbul"
}, async () => {
  try {
    await axios.post(
      "https://graph.facebook.com/v25.0/1125395517333883/messages",
      {
        messaging_product: "whatsapp",
        to: CATERING_NUMARASI,
        type: "template",
        template: {
          name: "bilgi_talebi",
          language: { code: "tr" },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: "Bugünkü tatlı ve meyve" }]
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
  } catch (error) {
    console.error("Tatlı/meyve hatırlatma hatası:", error.response?.data || error.message);
  }
});

async function gunlukSiparisOzetiGonder() {
    const bugun = new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Europe/Istanbul",
    }).format(new Date());

    // .orderBy("sira", "asc") kısmını kaldırdık ki index hatası vermesin
    const snapshot = await db
        .collection("siparisler")
        .where("tarih", "==", bugun)
        .get();

    if (snapshot.empty) {
        await normalMesajGonder("Bugün için sipariş bulunmuyor.");
        return;
    }

    let siparisler = [];
    snapshot.forEach(doc => {
        siparisler.push(doc.data());
    });

    // Sıralamayı JavaScript içinde (bellekte) yapıyoruz
    siparisler.sort((a, b) => (a.sira || 0) - (b.sira || 0));

    let mesaj = "";

    siparisler.forEach(data => {
        const siraNo = data.sira !== undefined ? data.sira : 1;
        
        mesaj += `${siraNo}.\n`;
        mesaj += (data.secimler || []).join("\n");
        mesaj += "\n\n";
    });

    await normalMesajGonder(mesaj);
}
exports.gunlukSiparisOzeti = onSchedule({
    //asd
  schedule: "52 15 * * 1-6",
  timeZone: "Europe/Istanbul"
}, async () => {    
    console.log("Sipariş özeti fonksiyonu çalıştı");
    await gunlukSiparisOzetiGonder();
});
// ==========================================
// 5. UPDATE SCHEDULER (CORS Destekli)
// ==========================================
exports.updateScheduler = onRequest(async (req, res) => {

    // 1. CORS İzinlerini Tanımla
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    // 2. Tarayıcının ön uçuş (preflight) isteğini hemen yanıtla
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }

    try {
        const { jobName, hour, minute } = req.body;

        if (!jobName || hour === undefined || minute === undefined) {
            return res.status(400).json({
                error: "Eksik bilgi."
            });
        }

        // Frontend'den gelen kısa adı (örn: gunlukSiparisOzeti) Firebase'in gerçek Cloud Scheduler ismine dönüştürür
        let targetJobName = jobName;
        if (!targetJobName.startsWith("firebase-schedule-")) {
            targetJobName = `firebase-schedule-${jobName}-us-central1`;
        }

        const auth = new GoogleAuth({
            scopes: ["https://www.googleapis.com/auth/cloud-platform"],
        });

        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();

        const projectId = process.env.GCLOUD_PROJECT;
        const location = "us-central1";

        const url = `https://cloudscheduler.googleapis.com/v1/projects/${projectId}/locations/${location}/jobs/${targetJobName}`;

        const cron = `${minute} ${hour} * * 1-6`;

        const response = await axios.patch(
            url,
            {
                schedule: cron,
                timeZone: "Europe/Istanbul",
            },
            {
                params: {
                    updateMask: "schedule,timeZone",
                },
                headers: {
                    Authorization: `Bearer ${accessToken.token}`,
                },
            }
        );

        res.json({
            success: true,
            cron,
            data: response.data,
        });

    } catch (err) {
        console.error(err.response?.data || err);

        res.status(500).json({
            success: false,
            error: err.response?.data || err.message,
        });
    }
});
exports.getSchedulers = onRequest(async (req, res) => {

    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
        return res.status(204).send("");
    }

    try {

        const auth = new GoogleAuth({
            scopes: ["https://www.googleapis.com/auth/cloud-platform"],
        });

        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();

        const projectId = process.env.GCLOUD_PROJECT;
        const location = "us-central1";

        const jobs = [
            "firebase-schedule-gunlukSiparisOzeti-us-central1",
            "firebase-schedule-gunlukNotIsle-us-central1",
            "firebase-schedule-tatliMeyveHatirlatma-us-central1"
        ];

        const sonuc = [];

        for (const job of jobs) {

            const response = await axios.get(
                `https://cloudscheduler.googleapis.com/v1/projects/${projectId}/locations/${location}/jobs/${job}`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken.token}`
                    }
                }
            );

            const cron = response.data.schedule;
            const parts = cron.split(" ");

sonuc.push({
    id: job,
    baslik:
        job === "firebase-schedule-gunlukSiparisOzeti-us-central1"
            ? "Günlük Sipariş Özeti"
        : job === "firebase-schedule-gunlukNotIsle-us-central1"
            ? "Günlük Not İşle"
        : "Tatlı Meyve Hatırlatma",
    hour: Number(parts[1]),
    minute: Number(parts[0]),
});
        }

        res.json(sonuc);

    } catch (err) {

        console.error(err.response?.data || err);

        res.status(500).json({
            error: err.message
        });

    }

});