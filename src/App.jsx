import { useEffect, useState } from "react";
import RequestForm from "./components/RequestForm";
import ResponseViewer from "./components/ResponseViewer";

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

  const envoyerRequete = async (url) => {
    setLoading(true);
    setErreur("");
    setResultat("");
    setStatus(null);
    setTime(null);

    setHistory(prev => {
      if (prev.includes(url)) return prev;
      return [url, ...prev].slice(0, 10);
    });

    const start = performance.now();

    try {
      const res = await fetch(url);
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
      setErreur(`Erreur réseau: ${e?.message ?? String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const hasResponse = loading || erreur || resultat || status || time;

  return (
    <div style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>API Playground</h1>

      <RequestForm
        onSend={envoyerRequete}
        history={history}
        onClearHistory={clearHistory}
      />

      <br />

      {hasResponse && (
        <ResponseViewer
          data={resultat}
          error={erreur}
          loading={loading}
          status={status}
          time={time}
        />
      )}
    </div>
  );
}

export default App;
