import type { SchedulerJob } from "../types/scheduler";

const GET_SCHEDULERS_URL =
  "https://us-central1-mefi-yemek-sistemi.cloudfunctions.net/getSchedulers";

const UPDATE_SCHEDULER_URL =
  "https://us-central1-mefi-yemek-sistemi.cloudfunctions.net/updateScheduler";

export async function loadSchedulers(): Promise<SchedulerJob[]> {
  try {
    const response = await fetch(GET_SCHEDULERS_URL);
    const data = await response.json();
    console.log("Scheduler Response:", data);
    return data;
  } catch (err) {
    console.error("Schedulerlar alınamadı:", err);
    return [];
  }
}

export async function scheduleGuncelle(
  jobName: string,
  hour: number,
  minute: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(UPDATE_SCHEDULER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jobName,
        hour,
        minute,
      }),
    });

    const sonuc = await response.json();
    return sonuc;
  } catch (err) {
    console.error("Güncelleme hatası:", err);
    return { success: false, error: "Bağlantı hatası oluştu." };
  }
}
