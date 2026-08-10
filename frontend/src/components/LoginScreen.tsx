type LoginScreenProps = {
  onGiris: () => void;
};

export default function LoginScreen({ onGiris }: LoginScreenProps) {
  return (
    <div style={{ padding: "20px", textAlign: "center" }}>
      <h1>MEFİ Menü Sistemi</h1>
      <button
        onClick={onGiris}
        style={{ padding: "10px 20px", fontSize: "16px", cursor: "pointer" }}
      >
        Google ile Giriş Yap
      </button>
    </div>
  );
}
