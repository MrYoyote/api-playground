import { useState } from "react";
import JsonTree from "./JsonTree";

function ResponseViewer({ data, error, loading, status, time }) {
  const [query, setQuery] = useState("");

  let parsed = null;
  if (data) {
    try {
      parsed = JSON.parse(data);
    } catch {
      parsed = null;
    }
  }

  return (
    <div>
      {loading && <p>Chargement...</p>}
      {status && <p>Status HTTP: {status}</p>}
      {time && <p>Temps de réponse: {time} ms</p>}
      {error && <p style={{ color: "red" }}>Erreur: {error}</p>}

      {parsed && (
        <div style={{ margin: "12px 0" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher (clé ou valeur)..."
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid #555",
              background: "#1b1b1b",
              color: "#fff",
            }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{ marginTop: "10px" }}
            >
              Effacer la recherche
            </button>
          )}
        </div>
      )}

      {parsed ? (
        <div
          style={{
            background: "#111",
            color: "#eee",
            padding: "20px",
            borderRadius: "8px",
            overflowX: "auto",
            maxHeight: "60vh",
          }}
        >
          <JsonTree data={parsed} query={query} />
        </div>
      ) : (
        <pre
          style={{
            background: "#111",
            color: "#eee",
            padding: "20px",
            borderRadius: "8px",
            overflowX: "auto",
            maxHeight: "60vh",
          }}
        >
          {data}
        </pre>
      )}
    </div>
  );
}

export default ResponseViewer;
