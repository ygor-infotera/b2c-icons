import { saveAs } from "file-saver";
import * as Icons from "infotravel-icons";
import JSZip from "jszip";
import { useMemo, useState } from "react";
import ReactDOMServer from "react-dom/server";
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

  const handleExport = async () => {
    try {
      // @ts-expect-error - File System Access API not available in all browsers
      const showDirectoryPicker = window.showDirectoryPicker;

      if (typeof showDirectoryPicker === "function") {
        // Use File System Access API
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dirHandle = await (window as any).showDirectoryPicker();

        let count = 0;
        for (const { name, Component } of filteredIcons) {
          const svgString = ReactDOMServer.renderToStaticMarkup(
            <Component
              size={size}
              color={name.includes("Flag") ? undefined : color}
              strokeWidth={strokeWidth}
            />,
          );

          const fileHandle = await dirHandle.getFileHandle(`${name}.svg`, {
            create: true,
          });
          const writable = await fileHandle.createWritable();
          await writable.write(svgString);
          await writable.close();
          count++;
        }

        alert(`Exported ${count} icons to ${dirHandle.name}!`);
      } else {
        // Fallback: Use JSZip
        const zip = new JSZip();

        filteredIcons.forEach(({ name, Component }) => {
          const svgString = ReactDOMServer.renderToStaticMarkup(
            <Component
              size={size}
              color={name.includes("Flag") ? undefined : color}
              strokeWidth={strokeWidth}
            />,
          );
          zip.file(`${name}.svg`, svgString);
        });

        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, "icons.zip");
        alert(`Exported ${filteredIcons.length} icons to icons.zip!`);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error(err);
        alert("Failed to export icons. See console for details.");
      }
    }
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

        <div className="control-group">
          <label>Actions</label>
          <button onClick={handleExport} className="export-button">
            Export SVGs
          </button>
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
