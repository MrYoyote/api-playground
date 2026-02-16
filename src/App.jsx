import { useEffect, useState } from "react";
import RequestForm from "./components/RequestForm";
import ResponseViewer from "./components/ResponseViewer";

function normalizeUrl(u) {
  return String(u ?? "").trim();
}

function isValidHttpUrl(u) {
  try {
    const url = new URL(u);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function App() {
  const [resultat, setResultat] = useState("");
  const [erreur, setErreur] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [time, setTime] = useState(null);

  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem("api-playground-history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("api-playground-history", JSON.stringify(history));
  }, [history]);

  const clearHistory = () => setHistory([]);

  const removeFromHistory = (url) => {
    setHistory((prev) => prev.filter((x) => x !== url));
  };

  const addToHistory = (url) => {
    const u = normalizeUrl(url);
    if (!u) return;
    if (!isValidHttpUrl(u) || erreur) return;

    // ✅ si déjà présent : remonter en haut, pas de doublon
    setHistory((prev) => [u, ...prev.filter((x) => x !== u)].slice(0, 10));
  };

  const envoyerRequete = async (url) => {
    const u = normalizeUrl(url);

    // ✅ filtre : vide ou invalide => pas d'historique
    if (!u || !isValidHttpUrl(u)) {
      setErreur("URL invalide. Exemple : https://jsonplaceholder.typicode.com/users");
      setResultat("");
      setStatus(null);
      setTime(null);
      return;
    }

    setLoading(true);
    setErreur("");
    setResultat("");
    setStatus(null);
    setTime(null);

    addToHistory(u);

    const start = performance.now();

    try {
      const res = await fetch(u);
      const ms = Math.round(performance.now() - start);

      setStatus(res.status);
      setTime(ms);

      const contentType = res.headers.get("content-type") || "";
      const raw = await res.text();

      if (!res.ok) {
        let msg = raw;
        if (contentType.includes("application/json")) {
          try {
            const j = JSON.parse(raw);
            msg = j.message || j.error || JSON.stringify(j, null, 2);
          } catch {}
        }
        setErreur(`HTTP ${res.status} ${res.statusText} — ${msg.slice(0, 500)}`);
        return;
      }

      if (contentType.includes("application/json")) {
        try {
          const j = JSON.parse(raw);
          setResultat(JSON.stringify(j, null, 2));
        } catch {
          setResultat(raw);
        }
      } else {
        setResultat(raw);
      }
    } catch (e) {
      const msg = e?.message ?? String(e);
      setErreur(
        msg.includes("Failed to fetch")
          ? "Erreur réseau: requête bloquée (souvent CORS) ou serveur injoignable."
          : `Erreur réseau: ${msg}`
      );
    } finally {
      setLoading(false);
    }
  };

  const hasResponse = loading || erreur || resultat || status || time;

  return (
    <div style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>API Playground</h1>

      <RequestForm onSend={envoyerRequete} />

      {hasResponse && (
        <ResponseViewer
          data={resultat}
          error={erreur}
          loading={loading}
          status={status}
          time={time}
        />
      )}

      {/* ✅ Historique EN DESSOUS du JSON */}
      {history.length > 0 && (
        <div style={{ marginTop: 18, marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h3 style={{ margin: 0, fontSize: 16, opacity: 0.9 }}>Historique</h3>
            <button onClick={clearHistory}>Tout effacer</button>
          </div>

          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 10 }}>
            {history.map((u) => (
              <div
                key={u}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  border: "1px solid var(--border)",
                  background: "var(--panel)",
                  padding: "8px 10px",
                  borderRadius: 12,
                  maxWidth: "100%",
                }}
              >
                <button
                  onClick={() => envoyerRequete(u)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 10,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                  title="Relancer cette requête"
                >
                  Ouvrir
                </button>

                <span
                  style={{
                    opacity: 0.9,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: 520,
                  }}
                  title={u}
                >
                  {u}
                </span>

                <button
                  onClick={() => removeFromHistory(u)}
                  title="Supprimer de l'historique"
                  style={{ padding: "6px 10px", borderRadius: 10 }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


export default App;
