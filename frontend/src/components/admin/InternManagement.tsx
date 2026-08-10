import { useState } from "react";
import type { Stajyer } from "../../types/user";
import { stajyerEkle, stajyerSil } from "../../services/userService";
import { adminStyles } from "../../utils/styles";

type InternManagementProps = {
  stajyerler: Stajyer[];
  onStajyerlerChange: (stajyerler: Stajyer[]) => void;
  onGeri: () => void;
};

export default function InternManagement({
  stajyerler,
  onStajyerlerChange,
  onGeri,
}: InternManagementProps) {
  const styles = adminStyles;
  const [yeniEmail, setYeniEmail] = useState("");

  return (
    <div style={styles.page}>
      <button onClick={onGeri} style={styles.secondaryButton}>
        ← Geri
      </button>

      <h1>👨‍💼 Stajyer Yönetimi</h1>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <input
          type="email"
          placeholder="Google Mail Adresi"
          value={yeniEmail}
          onChange={(e) => setYeniEmail(e.target.value)}
          style={{ flex: 1, padding: "10px" }}
        />
        <button
          style={styles.successButton}
          onClick={async () => {
            if (!yeniEmail.trim()) return;
            try {
              const yeniStajyer = await stajyerEkle(yeniEmail);
              onStajyerlerChange([...stajyerler, yeniStajyer]);
              setYeniEmail("");
              alert("Stajyer eklendi.");
            } catch (error) {
              console.error(error);
              alert("Stajyer eklenirken hata oluştu.");
            }
          }}
        >
          Ekle
        </button>
      </div>

      {stajyerler.map((stajyer) => (
        <div
          key={stajyer.id}
          style={{
            ...styles.card,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{stajyer.email}</span>
          <button
            style={styles.dangerButton}
            onClick={async () => {
              try {
                await stajyerSil(stajyer.id);
                onStajyerlerChange(
                  stajyerler.filter((s) => s.id !== stajyer.id)
                );
              } catch (error) {
                console.error(error);
                alert("Stajyer silinemedi.");
              }
            }}
          >
            Sil
          </button>
        </div>
      ))}
    </div>
  );
}
