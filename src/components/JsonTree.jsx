import { useState } from "react";

function isObject(value) {
  return value !== null && typeof value === "object";
}

function JsonNode({ name, value, depth = 0 }) {
  const [open, setOpen] = useState(depth < 2); // ouvert par défaut sur les 2 premiers niveaux
  const indent = { paddingLeft: `${depth * 20}px` };

  const isArr = Array.isArray(value);
  const isObj = isObject(value) && !isArr;

  if (!isObject(value)) {
    const getColor = (val) => {
        if (typeof val === "string") return "#4FC3F7";
        if (typeof val === "number") return "#FFD54F";
        if (typeof val === "boolean") return "#81C784";
        if (val === null) return "#E57373";
        return "#fff";
    };

    const display =
        typeof value === "string" ? `"${value}"` : String(value);

    return (
        <div style={indent}>
        <span style={{ color: "#B39DDB",opacity: 0.8 }}>{name}:</span>{" "}
        <span style={{ color: getColor(value) }}>{display}</span>
        </div>
    );
}


  const entries = isArr ? value.map((v, i) => [i, v]) : Object.entries(value);
  const preview = isArr ? `Array(${value.length})` : `Object(${entries.length})`;

  return (
    <div>
      <div style={indent}>
        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            marginRight: "8px",
            cursor: "pointer",
            borderRadius: "6px",
            border: "1px solid #444",
            background: "#1b1b1b",
            color: "#fff",
            padding: "2px 8px",
          }}
        >
          {open ? "−" : "+"}
        </button>

        <span style={{ opacity: 0.8 }}>{name}:</span>{" "}
        <span style={{ opacity: 0.9 }}>{preview}</span>
      </div>

      {open && (
        <div>
          {entries.map(([k, v]) => (
            <JsonNode
              key={`${name}.${k}`}
              name={isArr ? `[${k}]` : k}
              value={v}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function JsonTree({ data }) {
  return (
    <div>
      <JsonNode name="root" value={data} depth={0} />
    </div>
  );
}

export default JsonTree;
