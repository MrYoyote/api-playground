import { useMemo, useState } from "react";

function isObject(value) {
  return value !== null && typeof value === "object";
}

function normalize(str) {
  return String(str ?? "").toLowerCase();
}

// Renvoie:
// - matchSet : paths qui matchent (clé ou valeur)
// - autoOpenSet : paths à ouvrir (match + parents)
function buildSearchSets(data, query) {
  const q = normalize(query).trim();
  const matchSet = new Set();
  const autoOpenSet = new Set();

  if (!q) return { matchSet, autoOpenSet };

  const addPathAndParents = (path) => {
    const parts = path.split(".");
    let cur = parts[0]; // "root"
    autoOpenSet.add(cur);
    for (let i = 1; i < parts.length; i++) {
      cur += "." + parts[i];
      autoOpenSet.add(cur);
    }
  };

  const walk = (value, path) => {
    if (!isObject(value)) {
      if (normalize(value).includes(q)) {
        matchSet.add(path);
        addPathAndParents(path);
      }
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((v, i) => walk(v, `${path}.[${i}]`));
      return;
    }

    for (const [k, v] of Object.entries(value)) {
      const childPath = `${path}.${k}`;

      if (normalize(k).includes(q)) {
        matchSet.add(childPath);
        addPathAndParents(childPath);
      }

      walk(v, childPath);
    }
  };

  walk(data, "root");
  return { matchSet, autoOpenSet };
}

function getValueColor(val) {
  if (typeof val === "string") return "#4FC3F7";
  if (typeof val === "number") return "#FFD54F";
  if (typeof val === "boolean") return "#81C784";
  if (val === null) return "#E57373";
  return "#eee";
}

function JsonRow({ depth, children }) {
  return <div style={{ paddingLeft: `${depth * 20}px` }}>{children}</div>;
}

function JsonTree({ data, query }) {
  const q = normalize(query).trim();

  const { matchSet, autoOpenSet } = useMemo(
    () => buildSearchSets(data, query),
    [data, query]
  );

  // overrides manuels: path -> bool
  const [overrides, setOverrides] = useState({});

  const computeOpen = (path) => {
    if (Object.prototype.hasOwnProperty.call(overrides, path)) return overrides[path];
    if (q) return autoOpenSet.has(path);

    // défaut sans recherche : ouvrir 2 niveaux
    const depth = path.split(".").length - 1;
    return depth < 2;
  };

  const toggleOpen = (path) => {
    setOverrides((prev) => {
      const current = computeOpen(path);
      return { ...prev, [path]: !current };
    });
  };

  const isMatched = (path) => q && matchSet.has(path);

  const renderNode = (name, value, path, depth) => {
    // primitives
    if (!isObject(value)) {
      const display = typeof value === "string" ? `"${value}"` : String(value);
      const highlight =
        q && (normalize(name).includes(q) || normalize(value).includes(q));

      return (
        <JsonRow key={path} depth={depth}>
          <span style={{ color: highlight ? "#fff" : "#B39DDB", opacity: 0.9, fontWeight: highlight ? 700 : 400 }}>
            {name}:
          </span>{" "}
          <span style={{ color: getValueColor(value), fontWeight: highlight ? 700 : 400 }}>
            {display}
          </span>
        </JsonRow>
      );
    }

    const open = computeOpen(path);
    const matched = isMatched(path);

    const isArr = Array.isArray(value);
    const entries = isArr ? value.map((v, i) => [i, v]) : Object.entries(value);
    const preview = isArr ? `Array(${value.length})` : `Object(${entries.length})`;

    return (
      <div key={path}>
        <JsonRow depth={depth}>
          <button
            onClick={() => toggleOpen(path)}
            style={{
              marginRight: "8px",
              cursor: "pointer",
              borderRadius: "6px",
              border: matched ? "1px solid #fff" : "1px solid #444",
              background: "#1b1b1b",
              color: "#fff",
              padding: "2px 8px",
            }}
            title={open ? "Replier" : "Déplier"}
          >
            {open ? "−" : "+"}
          </button>

          <span style={{ color: matched ? "#5eff00" : "#B39DDB", fontWeight: matched ? 700 : 400, opacity: 0.95 }}>
            {name}:
          </span>{" "}
          <span style={{ opacity: 0.9 }}>{preview}</span>
        </JsonRow>

        {open && (
          <div>
            {entries.map(([k, v]) => {
              const childName = isArr ? `[${k}]` : k;
              const childPath = isArr ? `${path}.[${k}]` : `${path}.${k}`;
              return renderNode(childName, v, childPath, depth + 1);
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {renderNode("root", data, "root", 0)}
      {q && <div style={{ marginTop: "12px", opacity: 0.85 }}>Matchs: {matchSet.size}</div>}
    </div>
  );
}

export default JsonTree;
