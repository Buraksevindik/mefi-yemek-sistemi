// ============================================================
// FIREBASE / GOOGLE / WHATSAPP / GEMINI
// ============================================================

const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { GoogleAuth } = require("google-auth-library");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const axios = require("axios");

initializeApp();

const db = getFirestore();


// ============================================================
// SABİTLER
// ============================================================

const TIME_ZONE = "Europe/Istanbul";

const CATERING_NUMARASI = "905539318881";

const WHATSAPP_PHONE_NUMBER_ID = "1125395517333883";

const WHATSAPP_API_URL =
  `https://graph.facebook.com/v25.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

const CLOUD_SCHEDULER_LOCATION = "us-central1";


// ============================================================
// GEMINI
// ============================================================

const genAI = new GoogleGenerativeAI(
  process.env.API_KEY
);


// ============================================================
// BUGÜNÜ YYYY-MM-DD OLARAK AL
// ============================================================

function bugununTarihi() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: TIME_ZONE,
  }).format(new Date());
}


// ============================================================
// BUGÜNÜN KAPALI OLUP OLMADIĞINI KONTROL ET
// ============================================================

async function bugunKapaliMi() {
  const bugun = bugununTarihi();

  console.log(
    `Kapalı gün kontrolü yapılıyor. Bugün: ${bugun}`
  );

  try {
    const kapaliGunDoc = await db
      .collection("kapaliGunler")
      .doc(bugun)
      .get();

    const kapali = kapaliGunDoc.exists;

    console.log(
      `Kapalı gün sonucu: ${kapali}`
    );

    return kapali;

  } catch (error) {

    console.error(
      "Kapalı gün kontrolünde hata:",
      error
    );

    // Firestore kontrolü hata verirse
    // yanlışlıkla mesaj göndermemesi için
    // GÜVENLİK AMAÇLI OLARAK KAPALI KABUL EDİYORUZ.
    return true;
  }
}


// ============================================================
// WHATSAPP TEMPLATE MESAJI
// ============================================================

async function templateMesajiGonder(metin) {

  try {

    const response = await axios.post(
      WHATSAPP_API_URL,
      {
        messaging_product: "whatsapp",

        to: CATERING_NUMARASI,

        type: "template",

        template: {
          name: "bilgi_talebi",

          language: {
            code: "tr",
          },

          components: [
            {
              type: "body",

              parameters: [
                {
                  type: "text",
                  text: metin,
                },
              ],
            },
          ],
        },
      },

      {
        headers: {
          Authorization:
            `Bearer ${process.env.WHATSAPP_TOKEN}`,

          "Content-Type":
            "application/json",
        },
      }
    );

    console.log(
      "WhatsApp template başarılı:",
      response.data
    );

    return response.data;

  } catch (error) {

    console.error(
      "WhatsApp template hatası:",
      error.response?.data ||
      error.message
    );

    throw error;
  }
}


// ============================================================
// NORMAL WHATSAPP MESAJI
// ============================================================

async function normalMesajGonder(metin) {

  try {

    const response = await axios.post(
      WHATSAPP_API_URL,

      {
        messaging_product: "whatsapp",

        to: CATERING_NUMARASI,

        type: "text",

        text: {
          body: metin,
        },
      },

      {
        headers: {
          Authorization:
            `Bearer ${process.env.WHATSAPP_TOKEN}`,

          "Content-Type":
            "application/json",
        },
      }
    );

    console.log(
      "WhatsApp normal mesaj başarılı:",
      response.data
    );

    return response.data;

  } catch (error) {

    console.error(
      "WhatsApp normal mesaj hatası:",
      error.response?.data ||
      error.message
    );

    throw error;
  }
}


// ============================================================
// 1. WHATSAPP WEBHOOK
// ============================================================

exports.whatsappWebhook = onRequest(
  async (req, res) => {

    // --------------------------------------------------------
    // GET - META WEBHOOK DOĞRULAMA
    // --------------------------------------------------------

    if (req.method === "GET") {

      const mode =
        req.query["hub.mode"];

      const token =
        req.query["hub.verify_token"];

      const challenge =
        req.query["hub.challenge"];

      const VERIFY_TOKEN =
        process.env.VERIFY_TOKEN;

      if (
        mode === "subscribe" &&
        token === VERIFY_TOKEN
      ) {

        console.log(
          "WhatsApp webhook doğrulandı."
        );

        return res
          .status(200)
          .send(challenge);
      }

      console.error(
        "Webhook doğrulama başarısız."
      );

      return res.sendStatus(403);
    }


    // --------------------------------------------------------
    // POST - WHATSAPP MESAJI
    // --------------------------------------------------------

    if (req.method === "POST") {

      try {

        const body = req.body;

        if (
          body.object !==
          "whatsapp_business_account"
        ) {
          return res.sendStatus(200);
        }


        const entry =
          body.entry?.[0];

        const changes =
          entry?.changes?.[0];

        const value =
          changes?.value;

        const message =
          value?.messages?.[0];


        if (!message) {
          return res.sendStatus(200);
        }


        const gonderenNumara =
          message.from;


        // Sadece catering numarasından gelen
        // mesajları işliyoruz.

        if (
          gonderenNumara !==
          CATERING_NUMARASI
        ) {

          console.log(
            "Yetkisiz numaradan mesaj:",
            gonderenNumara
          );

          return res.sendStatus(200);
        }


        const messageId =
          message.id;


        // ----------------------------------------------------
        // MÜKERRER MESAJ KONTROLÜ
        // ----------------------------------------------------

        const mesajVarMi =
          await db
            .collection("islenen_mesajlar")
            .doc(messageId)
            .get();


        if (mesajVarMi.exists) {

          console.log(
            "Bu mesaj daha önce işlendi:",
            messageId
          );

          return res.sendStatus(200);
        }


        const mesajTuru =
          message.type;


        // ----------------------------------------------------
        // GÖRSEL MENÜ
        // ----------------------------------------------------

        if (
          mesajTuru === "image"
        ) {

          const mediaId =
            message.image.id;


          const mediaResponse =
            await axios.get(

              `https://graph.facebook.com/v25.0/${mediaId}`,

              {
                headers: {
                  Authorization:
                    `Bearer ${process.env.WHATSAPP_TOKEN}`,
                },
              }
            );


          const downloadResponse =
            await axios.get(
              mediaResponse.data.url,

              {
                headers: {
                  Authorization:
                    `Bearer ${process.env.WHATSAPP_TOKEN}`,
                },

                responseType:
                  "arraybuffer",
              }
            );


          const model =
            genAI.getGenerativeModel({
              model: "gemini-3.6-flash",
            });


          const imageData =
            Buffer
              .from(downloadResponse.data)
              .toString("base64");


          const prompt = `
Bu bir yemek menüsü görseli.

Pazartesi'den Cumartesi'ye kadar olan yemekleri analiz et.

SADECE aşağıdaki JSON formatında çıktı ver.

Markdown veya açıklama ekleme.

{
  "Pazartesi": {
    "Corbalar": [],
    "AnaYemekler": [],
    "YanUrunler": [],
    "Ekstralar": [],
    "Icecekler": ["Kola", "Ayran"],
    "Ekmek": ["Ekmek"]
  },

  "Sali": {
    "Corbalar": [],
    "AnaYemekler": [],
    "YanUrunler": [],
    "Ekstralar": [],
    "Icecekler": ["Kola", "Ayran"],
    "Ekmek": ["Ekmek"]
  },

  "Carsamba": {
    "Corbalar": [],
    "AnaYemekler": [],
    "YanUrunler": [],
    "Ekstralar": [],
    "Icecekler": ["Kola", "Ayran"],
    "Ekmek": ["Ekmek"]
  },

  "Persembe": {
    "Corbalar": [],
    "AnaYemekler": [],
    "YanUrunler": [],
    "Ekstralar": [],
    "Icecekler": ["Kola", "Ayran"],
    "Ekmek": ["Ekmek"]
  },

  "Cuma": {
    "Corbalar": [],
    "AnaYemekler": [],
    "YanUrunler": [],
    "Ekstralar": [],
    "Icecekler": ["Kola", "Ayran"],
    "Ekmek": ["Ekmek"]
  },

  "Cumartesi": {
    "Corbalar": [],
    "AnaYemekler": [],
    "YanUrunler": [],
    "Ekstralar": [],
    "Icecekler": ["Kola", "Ayran"],
    "Ekmek": ["Ekmek"]
  }
}

Kurallar:

1. Çorbaları ayrı ayrı listele.

2. Ana yemekleri ayrı ayrı listele.

3. Yan ürünleri ayrı ayrı listele.

4. Salata, cacık, yoğurt, turşu gibi ürünleri Ekstralar dizisine ayrı ayrı yaz.

5. Gün isimleri tam olarak:
Pazartesi
Sali
Carsamba
Persembe
Cuma
Cumartesi

6. JSON dışında hiçbir şey döndürme.

7. Icecekler alanını HER GÜN oluştur.

8. Icecekler varsayılan olarak:
["Kola", "Ayran"]

9. Ekmek alanını HER GÜN oluştur.

10. Ekmek varsayılan olarak:
["Ekmek"]

11. Görselde kola, ayran veya ekmek yazmasa bile bu alanları oluştur.

12. Görselde menü bilgisi yoksa boş JSON döndür.
`;


          const result =
            await model.generateContent([
              prompt,

              {
                inlineData: {
                  data: imageData,
                  mimeType: "image/jpeg",
                },
              },
            ]);


          const temizJson =
            result.response
              .text()
              .replace(/```json|```/g, "")
              .trim();


          const menuVerisi =
            JSON.parse(temizJson);


          await db
            .collection("menuler")
            .doc("aktif_menu")
            .set(
              {
                ...menuVerisi,

                updatedAt:
                  new Date().toISOString(),
              },

              {
                merge: true,
              }
            );


          console.log(
            "Görsel menü başarıyla işlendi."
          );
        }


        // ----------------------------------------------------
        // NORMAL TEXT MESAJ
        // ----------------------------------------------------

        else if (
          mesajTuru === "text"
        ) {

          const metinIcerigi =
            message.text.body;


          await db
            .collection("mesaj_havuzu")
            .doc(messageId)
            .set({

              messageId,

              type: "text",

              content:
                metinIcerigi,

              createdAt:
                new Date(),
            });


          console.log(
            "Metin mesaj havuzuna eklendi:",
            metinIcerigi
          );
        }


        // ----------------------------------------------------
        // İŞLENDİ OLARAK KAYDET
        // ----------------------------------------------------

        await db
          .collection("islenen_mesajlar")
          .doc(messageId)
          .set({

            createdAt:
              new Date().toISOString(),

          });


        return res.sendStatus(200);

      } catch (error) {

        console.error(
          "Webhook hata:",
          error
        );

        return res.sendStatus(500);
      }
    }


    return res.sendStatus(404);
  }
);


// ============================================================
// 2. GÜNLÜK NOT İŞLE
// ============================================================

exports.gunlukNotIsle =
  onSchedule(

    {
      schedule: "43 15 * * 1-6",
      timeZone: TIME_ZONE,
    },

    async () => {

      console.log(
        "================================"
      );

      console.log(
        "gunlukNotIsle BAŞLADI"
      );

      console.log(
        "Tarih:",
        bugununTarihi()
      );


      // ------------------------------------------------------
      // KAPALI GÜN
      // ------------------------------------------------------

      if (
        await bugunKapaliMi()
      ) {

        console.log(
          "BUGÜN KAPALI. gunlukNotIsle DURDURULDU."
        );

        return;
      }


      // ------------------------------------------------------
      // ENABLED KONTROLÜ
      // ------------------------------------------------------

      const schedulerDoc =
        await db
          .collection("schedulerSettings")
          .doc("gunlukNotIsle")
          .get();


      if (
        schedulerDoc.exists &&
        schedulerDoc.data().enabled === false 
      ) {

        console.log(
          "gunlukNotIsle pasif."
        );

        return;
      }


      try {

        const snapshot =
          await db
            .collection("mesaj_havuzu")
            .get();


        if (snapshot.empty) {

          console.log(
            "İşlenecek mesaj yok."
          );

          return;
        }


        const metinNotlari =
          snapshot.docs.map(
            doc => doc.data().content
          );


        const aktifDoc =
          await db
            .collection("menuler")
            .doc("aktif_menu")
            .get();


        if (!aktifDoc.exists) {

          console.log(
            "Aktif menü bulunamadı."
          );

          return;
        }


        let menuVerisi =
          aktifDoc.data();


        const gunler = [
          "Pazar",
          "Pazartesi",
          "Sali",
          "Carsamba",
          "Persembe",
          "Cuma",
          "Cumartesi",
        ];


        const bugunIndex =
          new Date(
            new Date().toLocaleString(
              "en-US",
              {
                timeZone:
                  TIME_ZONE,
              }
            )
          ).getDay();


        const bugun =
          gunler[bugunIndex];


        const model =
          genAI.getGenerativeModel({
            model: "gemini-3.6-flash",
          });


        const topluPrompt = `
Mevcut Menü Verisi:

${JSON.stringify(menuVerisi)}

Bugün firmadan gelen metin mesajları/notlar:

${JSON.stringify(metinNotlari)}

Bugün günlerden:

${bugun}

Kurallar:

1. ${bugun} gününü güncelle.

2. Diğer günlere dokunma.

3. Meyve, tatlı veya makarna ile ilgili not varsa mevcut bilgiyi güncelle.

4. Aynı konu hakkında birden fazla not varsa en son bilgi geçerlidir.

5. İptal edilen ürünleri kaldır.

6. Ürün değiştirildiyse eski ürünü silip yeni ürünü ekle.

7. Sadece güncellenmiş SON MENÜYÜ JSON olarak döndür.

8. Açıklama veya Markdown yazma.

9. Menüyle ilgisi olmayan mesajları yok say.

10. "şefin spesiyali" -> Tatlı

11. Doğrudan meyve ismi -> Meyve

12. "erişte" veya doğrudan makarna çeşidi -> Makarna

13. JSON dışında hiçbir şey döndürme.
`;


        const textResult =
          await model.generateContent(
            topluPrompt
          );


        const temizGuncelJson =
          textResult.response
            .text()
            .replace(/```json|```/g, "")
            .trim();


        menuVerisi =
          JSON.parse(
            temizGuncelJson
          );


        if (
          !menuVerisi[bugun]
        ) {

          throw new Error(
            `${bugun} verisi Gemini çıktısında bulunamadı`
          );
        }


        await db
          .collection("menuler")
          .doc("aktif_menu")
          .set(
            {
              [bugun]:
                menuVerisi[bugun],

              updatedAt:
                new Date().toISOString(),
            },

            {
              merge: true,
            }
          );


        // ----------------------------------------------------
        // MESAJ HAVUZUNU TEMİZLE
        // ----------------------------------------------------

        const batch =
          db.batch();


        snapshot.docs.forEach(
          doc => {
            batch.delete(
              doc.ref
            );
          }
        );


        const islenenSnapshot =
          await db
            .collection(
              "islenen_mesajlar"
            )
            .get();


        islenenSnapshot.docs.forEach(
          doc => {
            batch.delete(
              doc.ref
            );
          }
        );


        await batch.commit();


        console.log(
          "Metin notları başarıyla işlendi."
        );

      } catch (error) {

        console.error(
          "Metin toplu işleme hatası:",
          error
        );
      }
    }
  );


// ============================================================
// 3. TATLI / MEYVE / MAKARNA HATIRLATMASI
// ============================================================

exports.tatliMeyveMakarnaHatirlatma =
  onSchedule(

    {
      schedule: "42 15 * * 1-6",
      timeZone: TIME_ZONE,
    },

    async () => {

      console.log(
        "================================"
      );

      console.log(
        "tatliMeyveMakarnaHatirlatma BAŞLADI"
      );

      console.log(
        "Tarih:",
        bugununTarihi()
      );


      // ------------------------------------------------------
      // KAPALI GÜN
      // ------------------------------------------------------

if (await bugunKapaliMi()) {
  console.log(
    "BUGÜN KAPALI. Sipariş verilmeyeceği mesajı gönderiliyor."
  );

  try {
    await templateMesajiGonder(
      "Bugün sipariş verilmeyecektir."
    );

    console.log(
      "Kapalı gün mesajı gönderildi."
    );
  } catch (error) {
    console.error(
      "Kapalı gün mesajı gönderilemedi:",
      error
    );
  }

  return;
}


      // ------------------------------------------------------
      // ENABLED KONTROLÜ
      // ------------------------------------------------------

      const schedulerDoc =
        await db
          .collection("schedulerSettings")
          .doc(
            "tatliMeyveMakarnaHatirlatma"
          )
          .get();


if (
  schedulerDoc.exists &&
  schedulerDoc.data().enabled === false
) {

        console.log(
          "tatliMeyveMakarnaHatirlatma pasif."
        );

        return;
      }


      try {

        await templateMesajiGonder(
          "Bugünkü tatlı meyve ve makarna"
        );


        console.log(
          "Tatlı/meyve/makarna hatırlatması gönderildi."
        );

      } catch (error) {

        console.error(
          "Tatlı/meyve/makarna gönderim hatası:",
          error
        );
      }
    }
  );


// ============================================================
// 4. GÜNLÜK SİPARİŞ ÖZETİ
// ============================================================

async function gunlukSiparisOzetiGonder() {
  const bugun = bugununTarihi();

  console.log(
    "Sipariş özeti tarihi:",
    bugun
  );

  const snapshot = await db
    .collection("siparisler")
    .where("tarih", "==", bugun)
    .get();

  if (snapshot.empty) {
    console.log("Bugün sipariş bulunamadı.");

    await normalMesajGonder(
      "Bugün için sipariş bulunmuyor."
    );

    return;
  }

  // --------------------------------------------------------
  // TÜM SİPARİŞLERİ TEK LİSTEDE TOPLA
  // --------------------------------------------------------

  const cateringEntries = [];

  snapshot.forEach((doc) => {
    const data = doc.data();

    // Kullanıcının kendi siparişi
    if (
      typeof data.sira === "number" &&
      Array.isArray(data.secimler)
    ) {
      cateringEntries.push({
        sira: data.sira,
        secimler: data.secimler,
      });
    }

    // Misafir siparişleri
    if (Array.isArray(data.misafirler)) {
      data.misafirler.forEach((misafir) => {
        if (
          typeof misafir.sira === "number" &&
          Array.isArray(misafir.secimler)
        ) {
          cateringEntries.push({
            sira: misafir.sira,
            secimler: misafir.secimler,
          });
        }
      });
    }
  });

  // --------------------------------------------------------
  // SIRA NUMARASINA GÖRE SIRALA
  // --------------------------------------------------------

  cateringEntries.sort(
    (a, b) => a.sira - b.sira
  );

  // --------------------------------------------------------
  // WHATSAPP MESAJI
  // --------------------------------------------------------

  let mesaj = "";

  cateringEntries.forEach((entry) => {
    mesaj += `${entry.sira}.\n`;

    mesaj += entry.secimler.join("\n");

    mesaj += "\n\n";
  });

  console.log(
    "Catering'e gönderilecek sipariş özeti:",
    mesaj
  );

  await normalMesajGonder(mesaj);
}


// ============================================================
// 5. GÜNLÜK SİPARİŞ ÖZETİ SCHEDULER
// ============================================================

exports.gunlukSiparisOzeti =
  onSchedule(

    {
      schedule: "52 15 * * 1-6",
      timeZone: TIME_ZONE,
    },

    async () => {

      console.log(
        "================================"
      );

      console.log(
        "gunlukSiparisOzeti BAŞLADI"
      );

      console.log(
        "Tarih:",
        bugununTarihi()
      );


      // ------------------------------------------------------
      // KAPALI GÜN
      // ------------------------------------------------------

      if (
        await bugunKapaliMi()
      ) {

        console.log(
          "BUGÜN KAPALI. SİPARİŞ ÖZETİ GÖNDERİLMEYECEK."
        );

        return;
      }


      // ------------------------------------------------------
      // ENABLED KONTROLÜ
      // ------------------------------------------------------

      const schedulerDoc =
        await db
          .collection("schedulerSettings")
          .doc(
            "gunlukSiparisOzeti"
          )
          .get();


      if (
        schedulerDoc.exists &&
        schedulerDoc.data().enabled === false
      ) {

        console.log(
          "gunlukSiparisOzeti pasif."
        );

        return;
      }


      try {

        console.log(
          "Sipariş özeti fonksiyonu çalışıyor."
        );


        await gunlukSiparisOzetiGonder();


        console.log(
          "Sipariş özeti başarıyla gönderildi."
        );

      } catch (error) {

        console.error(
          "Sipariş özeti hatası:",
          error
        );
      }
    }
  );


// ============================================================
// 6. CLOUD SCHEDULER GÜNCELLE
// ============================================================

exports.updateScheduler =
  onRequest(
    async (req, res) => {

      // ------------------------------------------------------
      // CORS
      // ------------------------------------------------------

      res.set(
        "Access-Control-Allow-Origin",
        "*"
      );

      res.set(
        "Access-Control-Allow-Methods",
        "GET, POST, OPTIONS"
      );

      res.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
      );


      if (
        req.method === "OPTIONS"
      ) {

        return res
          .status(204)
          .send("");
      }


      if (
        req.method !== "POST"
      ) {

        return res
          .status(405)
          .json({
            error:
              "Sadece POST kullanılabilir.",
          });
      }


      try {

        const {
          jobName,
          hour,
          minute,
        } = req.body;


        // ----------------------------------------------------
        // VERİ KONTROLÜ
        // ----------------------------------------------------

        if (
          !jobName ||
          hour === undefined ||
          minute === undefined
        ) {

          return res
            .status(400)
            .json({
              success: false,
              error:
                "Eksik bilgi.",
            });
        }


        const saat =
          Number(hour);

        const dakika =
          Number(minute);


        if (
          !Number.isInteger(saat) ||
          saat < 0 ||
          saat > 23
        ) {

          return res
            .status(400)
            .json({
              success: false,
              error:
                "Saat 0-23 arasında olmalıdır.",
            });
        }


        if (
          !Number.isInteger(dakika) ||
          dakika < 0 ||
          dakika > 59
        ) {

          return res
            .status(400)
            .json({
              success: false,
              error:
                "Dakika 0-59 arasında olmalıdır.",
            });
        }


        // ----------------------------------------------------
        // GERÇEK CLOUD SCHEDULER JOB ADI
        // ----------------------------------------------------

        let targetJobName =
          jobName;


        if (
          !targetJobName.startsWith(
            "firebase-schedule-"
          )
        ) {

          targetJobName =
            `firebase-schedule-${jobName}-us-central1`;
        }


        console.log(
          "Güncellenecek Scheduler Job:",
          targetJobName
        );


        // ----------------------------------------------------
        // GOOGLE AUTH
        // ----------------------------------------------------

        const auth =
          new GoogleAuth({

            scopes: [
              "https://www.googleapis.com/auth/cloud-platform",
            ],

          });


        const client =
          await auth.getClient();


        const accessToken =
          await client.getAccessToken();


        const projectId =
          process.env.GCLOUD_PROJECT;


        if (!projectId) {

          throw new Error(
            "GCLOUD_PROJECT bulunamadı."
          );
        }


        // ----------------------------------------------------
        // CLOUD SCHEDULER URL
        // ----------------------------------------------------

        const url =
          `https://cloudscheduler.googleapis.com/v1/projects/${projectId}/locations/${CLOUD_SCHEDULER_LOCATION}/jobs/${targetJobName}`;


        // ----------------------------------------------------
        // CRON
        // ----------------------------------------------------

        const cron =
          `${dakika} ${saat} * * 1-6`;


        console.log(
          "Yeni Cron:",
          cron
        );


        // ----------------------------------------------------
        // CLOUD SCHEDULER UPDATE
        // ----------------------------------------------------

        const response =
          await axios.patch(

            url,

            {
              schedule:
                cron,

              timeZone:
                TIME_ZONE,
            },

            {
              params: {
                updateMask:
                  "schedule,timeZone",
              },

              headers: {
                Authorization:
                  `Bearer ${accessToken.token}`,

                "Content-Type":
                  "application/json",
              },
            }
          );


        console.log(
          "Scheduler güncellendi:",
          response.data
        );


        return res.json({

          success: true,

          jobName:
            targetJobName,

          cron,

          hour: saat,

          minute: dakika,

        });

      } catch (error) {

        console.error(
          "Scheduler güncelleme hatası:",
          error.response?.data ||
          error.message ||
          error
        );


        return res
          .status(500)
          .json({

            success: false,

            error:
              error.response?.data ||
              error.message,

          });
      }
    }
  );


// ============================================================
// 7. CLOUD SCHEDULER LİSTELE
// ============================================================

exports.getSchedulers =
  onRequest(
    async (req, res) => {

      // ------------------------------------------------------
      // CORS
      // ------------------------------------------------------

      res.set(
        "Access-Control-Allow-Origin",
        "*"
      );

      res.set(
        "Access-Control-Allow-Methods",
        "GET, OPTIONS"
      );

      res.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
      );


      if (
        req.method === "OPTIONS"
      ) {

        return res
          .status(204)
          .send("");
      }


      if (
        req.method !== "GET"
      ) {

        return res
          .status(405)
          .json({
            error:
              "Sadece GET kullanılabilir.",
          });
      }


      try {

        // ----------------------------------------------------
        // GOOGLE AUTH
        // ----------------------------------------------------

        const auth =
          new GoogleAuth({

            scopes: [
              "https://www.googleapis.com/auth/cloud-platform",
            ],

          });


        const client =
          await auth.getClient();


        const accessToken =
          await client.getAccessToken();


        const projectId =
          process.env.GCLOUD_PROJECT;


        if (!projectId) {

          throw new Error(
            "GCLOUD_PROJECT bulunamadı."
          );
        }


        // ----------------------------------------------------
        // JOBLAR
        // ----------------------------------------------------

        const jobs = [

          "firebase-schedule-gunlukSiparisOzeti-us-central1",

          "firebase-schedule-gunlukNotIsle-us-central1",

          "firebase-schedule-tatliMeyveMakarnaHatirlatma-us-central1",

        ];


        const sonuc = [];


        // ----------------------------------------------------
        // HER JOB'U GET ET
        // ----------------------------------------------------

        for (
          const job of jobs
        ) {

          try {

            const url =
              `https://cloudscheduler.googleapis.com/v1/projects/${projectId}/locations/${CLOUD_SCHEDULER_LOCATION}/jobs/${job}`;


            const response =
              await axios.get(

                url,

                {
                  headers: {
                    Authorization:
                      `Bearer ${accessToken.token}`,
                  },
                }
              );


            const cron =
              response.data.schedule;


            const parts =
              cron.split(" ");


            const minute =
              Number(parts[0]);


            const hour =
              Number(parts[1]);


            let baslik =
              job;


            if (
              job ===
              "firebase-schedule-gunlukSiparisOzeti-us-central1"
            ) {

              baslik =
                "Günlük Sipariş Özeti";

            } else if (
              job ===
              "firebase-schedule-gunlukNotIsle-us-central1"
            ) {

              baslik =
                "Günlük Not İşle";

            } else if (
              job ===
              "firebase-schedule-tatliMeyveMakarnaHatirlatma-us-central1"
            ) {

              baslik =
                "Tatlı Meyve Makarna Hatırlatma";
            }


            sonuc.push({

              id: job,

              baslik,

              hour,

              minute,

              schedule:
                cron,

            });


          } catch (error) {

            console.error(
              `Job okunamadı: ${job}`,
              error.response?.data ||
              error.message
            );

          }
        }


        return res.json(
          sonuc
        );


      } catch (error) {

        console.error(
          "Scheduler listeleme hatası:",
          error.response?.data ||
          error.message ||
          error
        );


        return res
          .status(500)
          .json({

            error:
              error.message,

          });
      }
    }
  );