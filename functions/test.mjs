import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI("AQ.Ab8RN6KfsN4GyPIGHviFLqcMQYnVqxnb7pxu8kcGT4c2dI6nbw ");

async function listModels() {
  try {
    // Not: SDK üzerinden doğrudan liste alınamazsa REST API ile çekebiliriz ama genelde fetch ile kesin sonuç alınır:
    const apiKey = "AQ.Ab8RN6KfsN4GyPIGHviFLqcMQYnVqxnb7pxu8kcGT4c2dI6nbw"; 
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    
    if (data.models) {
      console.log("--- KULLANILABİLİR MODELLER ---");
      data.models.forEach(m => console.log(m.name.replace("models/", "")));
    } else {
      console.log("Modeller çekilemedi, API Key'i kontrol et:", data);
    }
  } catch (error) {
    console.error("Hata:", error);
  }
}

listModels();