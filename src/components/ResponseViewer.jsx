import JsonTree from "./JsonTree";

function ResponseViewer({ data, error, loading, status, time }) {
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

      {/* Affichage arbre si JSON valide, sinon fallback texte */}
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
          <JsonTree data={parsed} />
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
