// Firebase ve diğer kütüphaneler
const { onRequest } = require("firebase-functions/v2/https");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Firebase Admin'i başlat (Emülatör ile otomatik haberleşir)
initializeApp();
const db = getFirestore();

// Yapılandırma
dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

// Görselden Menü Okuma ve Firestore'a Kaydetme Fonksiyonu
exports.menuGuncelle = onRequest(async (req, res) => {
    try {
        const gorselYolu = path.join(__dirname, 'menu.jpeg');
        const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" }); 
        
        const imageData = fs.readFileSync(gorselYolu).toString("base64");

        const prompt = `Bu bir yemek menüsü görseli. 
            1. Pazartesi-Cumartesi arası yemekleri listele.
            2. Ekstraları "SORULACAK" yap.
            3. Sadece temiz JSON ver.`;

        const result = await model.generateContent([
            prompt,
            { inlineData: { data: imageData, mimeType: "image/jpeg" } }
        ]);

        const temizJson = result.response.text().replace(/```json|```/g, "").trim();
        
        // 1. İsteğe bağlı olarak yine yerel dosyaya yazabilirsin
        fs.writeFileSync(path.join(__dirname, 'menu.json'), temizJson);

        // 2. İŞTE BURASI: JSON verisini nesneye çevirip Firestore'a kaydediyoruz
        const menuVerisi = JSON.parse(temizJson);
        
        // 'menuler' adında bir koleksiyona 'aktif_menu' ID'si ile kaydediyoruz
        await db.collection("menuler").doc("aktif_menu").set(menuVerisi);

        res.send("Menü başarıyla okundu ve Firestore'a kaydedildi!");
    } catch (err) {
        res.status(500).send("Hata oluştu: " + err.message);
    }
});