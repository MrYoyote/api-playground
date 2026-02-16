import { useEffect, useMemo, useState } from "react";
import JsonTree from "./JsonTree";

function ResponseViewer({ data, error, loading, status, time }) {
  const [query, setQuery] = useState("");

  const [matchPaths, setMatchPaths] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const [treeActionId, setTreeActionId] = useState(0);
  const [treeAction, setTreeAction] = useState(null);

  const parsed = useMemo(() => {
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }, [data]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const total = matchPaths.length;
  const safeIndex = total ? Math.min(activeIndex, total - 1) : 0;
  const activeMatchPath = total ? matchPaths[safeIndex] : null;

  useEffect(() => {
    if (!total) setActiveIndex(0);
    else if (activeIndex >= total) setActiveIndex(0);
  }, [total, activeIndex]);

  const canNavigate = total > 0;

  const onPrev = () => {
    if (!total) return;
    setActiveIndex((i) => (i - 1 + total) % total);
  };

  const onNext = () => {
    if (!total) return;
    setActiveIndex((i) => (i + 1) % total);
  };

  const doExpandAll = () => {
    setTreeAction("expandAll");
    setTreeActionId((x) => x + 1);
  };

  const doCollapseAll = () => {
    setTreeAction("collapseAll");
    setTreeActionId((x) => x + 1);
  };

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
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (e.shiftKey) onPrev();
                else onNext();
              }
            }}
            placeholder="Rechercher (clé ou valeur)... (Entrée = Suivant, Shift+Entrée = Précédent)"
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid #555",
              background: "#1b1b1b",
              color: "#fff",
            }}
          />

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              marginTop: "10px",
              alignItems: "center",
            }}
          >
            <button onClick={doExpandAll}>Développer tout</button>
            <button onClick={doCollapseAll}>Réduire tout</button>

            <button disabled={!canNavigate} onClick={onPrev}>
              Précédent
            </button>
            <button disabled={!canNavigate} onClick={onNext}>
              Suivant
            </button>

            <div style={{ opacity: 0.9 }}>
              {canNavigate ? `${safeIndex + 1}/${total}` : "0/0"}
            </div>

            {query && <button onClick={() => setQuery("")}>Effacer la recherche</button>}
          </div>
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
          <JsonTree
            data={parsed}
            query={query}
            onMatchesChange={setMatchPaths}
            activeMatchPath={activeMatchPath}
            treeActionId={treeActionId}
            treeAction={treeAction}
          />
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
