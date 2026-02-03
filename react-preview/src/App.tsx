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
  const [showToast, setShowToast] = useState(false);
  const [copiedName, setCopiedName] = useState("");

  const [selectedIcons, setSelectedIcons] = useState<Set<string>>(new Set());

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

  const iconsToExport = useMemo(() => {
    if (selectedIcons.size === 0) return filteredIcons;
    return allIcons.filter((icon) => selectedIcons.has(icon.name));
  }, [allIcons, filteredIcons, selectedIcons]);

  const toggleSelection = (name: string) => {
    setSelectedIcons((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIcons(new Set());

  const copyToClipboard = (name: string, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
    const text = `<${name} size={${size}} color="${color}" />`;
    navigator.clipboard.writeText(text);
    setCopiedName(name);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleExport = async () => {
    const targetIcons = iconsToExport;
    if (targetIcons.length === 0) return;

    try {
      // @ts-expect-error - File System Access API not available in all browsers
      const showDirectoryPicker = window.showDirectoryPicker;

      if (typeof showDirectoryPicker === "function") {
        // Use File System Access API
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dirHandle = await (window as any).showDirectoryPicker();

        let count = 0;
        for (const { name, Component } of targetIcons) {
          const svgString = ReactDOMServer.renderToStaticMarkup(
            <Component
              size={size}
              color={name.includes("Flag") ? undefined : color}
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

        targetIcons.forEach(({ name, Component }) => {
          const svgString = ReactDOMServer.renderToStaticMarkup(
            <Component
              size={size}
              color={name.includes("Flag") ? undefined : color}
            />,
          );
          zip.file(`${name}.svg`, svgString);
        });

        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, "icons.zip");
        alert(`Exported ${targetIcons.length} icons to icons.zip!`);
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
          <label>Actions</label>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button onClick={handleExport} className="export-button">
              Export{" "}
              {selectedIcons.size > 0
                ? `${selectedIcons.size} Selected`
                : `All (${iconsToExport.length})`}
            </button>
            {selectedIcons.size > 0 && (
              <button
                onClick={clearSelection}
                className="clear-button"
                title="Clear selection"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="icon-grid">
        {filteredIcons.map(({ name, Component, category }) => {
          const isSelected = selectedIcons.has(name);
          return (
            <div
              key={name}
              className={`icon-card ${isSelected ? "selected" : ""}`}
              onClick={() => toggleSelection(name)}
              title="Click to select for export"
            >
              <button
                className="copy-mini-button"
                onClick={(e) => copyToClipboard(name, e)}
                title="Copy component code"
              >
                Copy
              </button>
              <div className="icon-wrapper">
                <Component
                  size={size}
                  color={name.includes("Flag") ? undefined : color}
                />
              </div>
              <div className="icon-name">{name}</div>
              <div className="icon-category">{category}</div>
            </div>
          );
        })}
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
