import * as Icons from "infotravel-icons";
import { useMemo, useState } from "react";
import "./App.css";

function App() {
  const [search, setSearch] = useState("");
  const [size, setSize] = useState(32);
  const [color, setColor] = useState("#60a5fa");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [showToast, setShowToast] = useState(false);
  const [copiedName, setCopiedName] = useState("");

  const allIcons = useMemo(() => {
    return Object.entries(Icons)
      .filter(([name]) => name !== "createIcon" && name !== "IconProps")
      .map(([name, Component]) => ({
        name,
        Component: Component as React.ComponentType<Icons.IconProps>,
        category: name.includes("Flag")
          ? "Flags"
          : name.includes("Counter")
            ? "Counters"
            : "UI",
      }));
  }, []);

  const filteredIcons = useMemo(() => {
    return allIcons.filter((icon) =>
      icon.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [allIcons, search]);

  const copyToClipboard = (name: string) => {
    const text = `<${name} size={${size}} color="${color}" strokeWidth={${strokeWidth}} />`;
    navigator.clipboard.writeText(text);
    setCopiedName(name);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  return (
    <div className="preview-container">
      <header>
        <h1>Infotravel Icons</h1>
        <p>Premium React icon library for travel applications.</p>
      </header>

      <div className="controls">
        <div className="control-group">
          <label>Search Icons</label>
          <input
            type="text"
            placeholder="Search icons..."
            className="search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="control-group">
          <label>Size: {size}px</label>
          <input
            type="range"
            min="16"
            max="128"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="range-input"
          />
        </div>

        <div className="control-group">
          <label>Color</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="color-input"
          />
        </div>

        <div className="control-group">
          <label>Stroke: {strokeWidth}</label>
          <input
            type="range"
            min="0.5"
            max="4"
            step="0.5"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="range-input"
          />
        </div>
      </div>

      <div className="icon-grid">
        {filteredIcons.map(({ name, Component, category }) => (
          <div
            key={name}
            className="icon-card"
            onClick={() => copyToClipboard(name)}
            title="Click to copy component code"
          >
            <div className="icon-wrapper">
              <Component
                size={size}
                color={name.includes("Flag") ? undefined : color}
                strokeWidth={strokeWidth}
              />
            </div>
            <div className="icon-name">{name}</div>
            <div className="icon-category">{category}</div>
          </div>
        ))}
      </div>

      {filteredIcons.length === 0 && (
        <div style={{ textAlign: "center", padding: "4rem", color: "#64748b" }}>
          No icons found matching "{search}"
        </div>
      )}

      {showToast && (
        <div className="copy-toast">
          Copied &lt;{copiedName} /&gt; to clipboard!
        </div>
      )}
    </div>
  );
}

export default App;
