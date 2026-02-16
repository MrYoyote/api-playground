import { useState } from "react";
import RequestForm from "./components/RequestForm";
import ResponseViewer from "./components/ResponseViewer";

function App() {
  const [resultat, setResultat] = useState("");
  const [erreur, setErreur] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [time, setTime] = useState(null);

  const envoyerRequete = async (url) => {
    setErreur("");
    setResultat("");
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

  return (
    <div style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>API Playground</h1>

      <RequestForm onSend={envoyerRequete} />

       <br />
       <ResponseViewer
        data={resultat}
        error={erreur}
        loading={loading}
        status={status}
        time={time}
      />
    </div>
  );
}

export default App;