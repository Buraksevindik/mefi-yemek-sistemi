import { useState } from "react";
import type { SchedulerJob } from "../../types/scheduler";
import {
  loadSchedulers,
  scheduleGuncelle,
} from "../../services/schedulerService";
import {
  kapaliGunEkle,
  kapaliGunSil,
} from "../../services/userService";
import { adminStyles } from "../../utils/styles";

type SchedulerSettingsProps = {
  gorevler: SchedulerJob[];
  kapaliGunler: string[];
  onGorevlerChange: (gorevler: SchedulerJob[]) => void;
  onKapaliGunlerChange: (gunler: string[]) => void;
  onGeri: () => void;
};

export default function SchedulerSettings({
  gorevler,
  kapaliGunler,
  onGorevlerChange,
  onKapaliGunlerChange,
  onGeri,
}: SchedulerSettingsProps) {
  const styles = adminStyles;
  const [seciliJob, setSeciliJob] = useState("gunlukSiparisOzeti");
  const [schedulerSaat, setSchedulerSaat] = useState(15);
  const [schedulerDakika, setSchedulerDakika] = useState(52);
  const [yeniKapaliGun, setYeniKapaliGun] = useState("");

  const handleScheduleGuncelle = async (
    jobName: string,
    hour: number,
    minute: number
  ) => {
    try {
      const sonuc = await scheduleGuncelle(jobName, hour, minute);
      if (sonuc.success) {
        const updated = await loadSchedulers();
        onGorevlerChange(updated);
        alert("Zamanlama başarıyla güncellendi!");
      } else {
        alert("Hata: " + sonuc.error);
      }
    } catch (err) {
      console.error("Güncelleme hatası:", err);
      alert("Bağlantı hatası oluştu.");
    }
  };

  const handleKapaliGunEkle = async () => {
    if (!yeniKapaliGun) {
      alert("Lütfen bir tarih seçin.");
      return;
    }
    try {
      await kapaliGunEkle(yeniKapaliGun);
      onKapaliGunlerChange([...kapaliGunler, yeniKapaliGun].sort());
      setYeniKapaliGun("");
      alert("Kapalı gün eklendi.");
    } catch (error) {
      console.error("Kapalı gün ekleme hatası:", error);
      alert("Kapalı gün eklenemedi.");
    }
  };

  const handleKapaliGunSil = async (tarih: string) => {
    try {
      await kapaliGunSil(tarih);
      onKapaliGunlerChange(kapaliGunler.filter((gun) => gun !== tarih));
      alert("Kapalı gün kaldırıldı.");
    } catch (error) {
      console.error("Kapalı gün silme hatası:", error);
      alert("Kapalı gün kaldırılamadı.");
    }
  };

  return (
    <div style={styles.page}>
      <button onClick={onGeri} style={styles.secondaryButton}>
        ← Geri
      </button>

      <h1>⏰ Zamanlayıcı (Scheduler) Yönetimi</h1>

      <div
        style={{
          display: "flex",
          gap: "20px",
          marginTop: "20px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ ...styles.card, flex: 1, minWidth: "280px" }}>
          <h3 style={{ marginBottom: "15px", color: "#2563eb" }}>Görevler</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <p>Görev Sayısı: {gorevler.length}</p>
            {gorevler.map((gorev) => (
              <button
                key={gorev.id}
                onClick={() => {
                  setSeciliJob(gorev.id);
                  setSchedulerSaat(gorev.hour);
                  setSchedulerDakika(gorev.minute);
                }}
                style={{
                  padding: "12px 16px",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  background: seciliJob === gorev.id ? "#2563eb" : "#f3f4f6",
                  color: seciliJob === gorev.id ? "#fff" : "#111",
                  fontWeight: "bold",
                  transition: "0.2s",
                }}
              >
                {gorev.baslik}
                <div style={{ fontSize: "12px", opacity: 0.8, marginTop: "4px" }}>
                  Mevcut: {gorev.hour.toString().padStart(2, "0")}:
                  {gorev.minute.toString().padStart(2, "0")}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ ...styles.card, flex: 1.5, minWidth: "300px" }}>
          <h3 style={{ marginBottom: "15px", color: "#16a34a" }}>
            Görev Saatini Düzenle
          </h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleScheduleGuncelle(
                seciliJob,
                Number(schedulerSaat),
                Number(schedulerDakika)
              );
            }}
            style={{ display: "flex", flexDirection: "column", gap: "15px" }}
          >
            <div>
              <label
                style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}
              >
                Seçilen Görev (Job ID):
              </label>
              <input
                type="text"
                value={seciliJob}
                readOnly
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                  background: "#f9fafb",
                  color: "#555",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ flex: 1 }}>
                <label
                  style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}
                >
                  Saat:
                </label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={schedulerSaat}
                  onChange={(e) => setSchedulerSaat(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid #ccc",
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label
                  style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}
                >
                  Dakika:
                </label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={schedulerDakika}
                  onChange={(e) => setSchedulerDakika(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid #ccc",
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              style={{
                ...styles.successButton,
                padding: "12px",
                marginTop: "10px",
                fontSize: "16px",
              }}
            >
              Saati Güncelle
            </button>
          </form>
        </div>
      </div>

      <div style={{ ...styles.card, marginTop: "25px" }}>
        <h3 style={{ color: "#dc2626", marginBottom: "15px" }}>📅 Kapalı Günler</h3>
        <p>Seçilen tarihlerde programdaki zamanlanmış görevler çalışmaz.</p>

        <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
          <input
            type="date"
            value={yeniKapaliGun}
            onChange={(e) => setYeniKapaliGun(e.target.value)}
            style={{
              padding: "10px",
              borderRadius: "6px",
              border: "1px solid #ccc",
            }}
          />
          <button
            type="button"
            style={styles.dangerButton}
            onClick={handleKapaliGunEkle}
          >
            Kapalı Gün Ekle
          </button>
        </div>

        <h4 style={{ marginTop: "25px" }}>Tanımlı Kapalı Günler</h4>
        {kapaliGunler.length === 0 ? (
          <p>Henüz kapalı gün bulunmuyor.</p>
        ) : (
          kapaliGunler.map((tarih) => (
            <div
              key={tarih}
              style={{
                ...styles.card,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>🔴 {tarih}</span>
              <button
                type="button"
                style={styles.dangerButton}
                onClick={() => handleKapaliGunSil(tarih)}
              >
                Kaldır
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}