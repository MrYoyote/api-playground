import { useEffect, useState } from 'react';
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
    setErreur("");
    setResultat("");
    setHistory((prev) => {{
      const filtered = prev.filter((item) => item !== url);
      return [url, ...filtered].slice(0, 10);
    }});
    setLoading(true);
    setStatus(null);
    setTime(null);

    const debut = performance.now();

    try {
      const response = await fetch(url);
      setStatus(response.status);

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      setResultat(JSON.stringify(data, null, 2));
    } catch (err) {
      setErreur(err.message);
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