import { useEffect, useMemo, useState } from "react";
import JsonTree from "./JsonTree";

function statusBadgeStyle(code) {
  if (!code) return { background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)" };
  if (code >= 200 && code < 300) return { background: "rgba(76, 175, 80, 0.18)", border: "1px solid rgba(76,175,80,0.35)" };
  if (code >= 300 && code < 400) return { background: "rgba(255, 193, 7, 0.18)", border: "1px solid rgba(255,193,7,0.35)" };
  if (code >= 400 && code < 500) return { background: "rgba(255, 152, 0, 0.18)", border: "1px solid rgba(255,152,0,0.35)" };
  return { background: "rgba(244, 67, 54, 0.18)", border: "1px solid rgba(244,67,54,0.35)" };
}

function downloadJson(filename, text) {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function ResponseViewer({ data, error, loading, status, time, onClear }) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState("tree"); // "tree" | "raw"

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

  const hasAny = loading || error || data || status || time;
  if (!hasAny) return null;

  return (
    <div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div
          style={{
            padding: "6px 10px",
            borderRadius: 12,
            fontWeight: 800,
            ...statusBadgeStyle(status),
          }}
          title="Status HTTP"
        >
          Status : {status ?? "—"}
        </div>

        <div style={{ opacity: 0.9 }}>Temps : {time ?? "—"} ms</div>

        <div style={{ display: "flex", gap: 8, marginLeft: "auto", flexWrap: "wrap" }}>
          <button onClick={() => setView("tree")} disabled={view === "tree"}>
            Tree
          </button>
          <button onClick={() => setView("raw")} disabled={view === "raw"}>
            Raw
          </button>

          <button
            onClick={() => {
              if (!data) return;
              downloadJson(`reponse-${Date.now()}.json`, data);
            }}
            disabled={!data}
            title="Télécharger la réponse"
          >
            Télécharger JSON
          </button>

          {/* ✅ nouveau bouton clear */}
          <button onClick={onClear} disabled={!data && !error && !status && !time} title="Effacer la réponse affichée">
            Effacer
          </button>
        </div>
      </div>

      {loading && <p>Chargement...</p>}
      {error && <p style={{ color: "red", whiteSpace: "pre-wrap" }}>Erreur: {error}</p>}

      {view === "tree" && parsed && (
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
            placeholder="Rechercher (Entrée = Suivant, Shift+Entrée = Précédent)"
          />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
            <button onClick={doExpandAll}>Développer tout</button>
            <button onClick={doCollapseAll}>Réduire tout</button>

            <button disabled={!canNavigate} onClick={onPrev}>
              Précédent
            </button>
            <button disabled={!canNavigate} onClick={onNext}>
              Suivant
            </button>

            <div style={{ opacity: 0.9 }}>{canNavigate ? `${safeIndex + 1}/${total}` : "0/0"}</div>

            {query && <button onClick={() => setQuery("")}>Effacer recherche</button>}
          </div>
        </div>
      )}

      {view === "tree" ? (
        parsed ? (
          <div
            style={{
              background: "var(--panel)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              padding: 18,
              borderRadius: 14,
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
              background: "var(--panel)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              padding: 18,
              borderRadius: 14,
              overflowX: "auto",
              maxHeight: "60vh",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {data}
          </pre>
        )
      ) : (
        <pre
          style={{
            background: "var(--panel)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            padding: 18,
            borderRadius: 14,
            overflowX: "auto",
            maxHeight: "60vh",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {data}
        </pre>
      )}
    </div>
  );
}

export default ResponseViewer;
