import { saveAs } from "file-saver";
import * as Icons from "infotravel-icons";
import JSZip from "jszip";
import React, { memo, useCallback, useMemo, useRef, useState } from "react";
import ReactDOMServer from "react-dom/server";
import "./App.css";

// Memoized IconCard to prevent unnecessary re-renders of the entire grid
const IconCard = memo(
  ({
    name,
    Component,
    category,
    isSelected,
    onToggle,
    onCopy,
  }: {
    name: string;
    Component: React.ComponentType<Icons.IconProps>;
    category: string;
    isSelected: boolean;
    onToggle: (name: string) => void;
    onCopy: (name: string, event: React.MouseEvent) => void;
  }) => {
    return (
      <div
        className={`icon-card ${isSelected ? "selected" : ""}`}
        onClick={() => onToggle(name)}
        title="Click to select for export"
      >
        <button
          className="copy-mini-button"
          onClick={(e) => onCopy(name, e)}
          title="Copy component code"
        >
          Copy
        </button>
        <div className="icon-wrapper">
          <Component />
        </div>
        <div className="icon-name">{name}</div>
        <div className="icon-category">{category}</div>
      </div>
    );
  },
);

IconCard.displayName = "IconCard";

const INITIAL_SIZE = 32;
const INITIAL_COLOR = "#60a5fa";

function App() {
  const [search, setSearch] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [copiedName, setCopiedName] = useState("");
  const [selectedIcons, setSelectedIcons] = useState<Set<string>>(new Set());

  // Refs for zero-rerender updates
  const containerRef = useRef<HTMLDivElement>(null);
  const sizeLabelRef = useRef<HTMLLabelElement>(null);

  // Storage for values to avoid reading from state (which would require re-renders)
  const colorRef = useRef(INITIAL_COLOR);
  const sizeRef = useRef(INITIAL_SIZE);

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

  const toggleSelection = useCallback((name: string) => {
    setSelectedIcons((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  const clearSelection = () => setSelectedIcons(new Set());

  const copyToClipboard = useCallback(
    (name: string, event?: React.MouseEvent) => {
      if (event) event.stopPropagation();
      // Read current values directly from Refs for the code snippet
      const text = `<${name} size={${sizeRef.current}} color="${colorRef.current}" />`;
      navigator.clipboard.writeText(text);
      setCopiedName(name);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    },
    [], // Zero dependencies means this callback NEVER changes
  );

  const handleExport = async () => {
    const targetIcons = iconsToExport;
    if (targetIcons.length === 0) return;

    try {
      // @ts-expect-error - File System Access API not available in all browsers
      const showDirectoryPicker = window.showDirectoryPicker;

      if (typeof showDirectoryPicker === "function") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dirHandle = await (window as any).showDirectoryPicker();

        let count = 0;
        for (const { name, Component } of targetIcons) {
          const svgString = ReactDOMServer.renderToStaticMarkup(
            <Component
              size={sizeRef.current}
              color={name.includes("Flag") ? undefined : colorRef.current}
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
        const zip = new JSZip();

        targetIcons.forEach(({ name, Component }) => {
          const svgString = ReactDOMServer.renderToStaticMarkup(
            <Component
              size={sizeRef.current}
              color={name.includes("Flag") ? undefined : colorRef.current}
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

  // Immediate visual feedback bypassed through DOM refs - NO React re-renders!
  const handleColorInput = (e: React.FormEvent<HTMLInputElement>) => {
    const val = e.currentTarget.value;
    colorRef.current = val;
    if (containerRef.current) {
      containerRef.current.style.setProperty("--icon-preview-color", val);
    }
  };

  const handleSizeInput = (e: React.FormEvent<HTMLInputElement>) => {
    const val = e.currentTarget.value;
    sizeRef.current = Number(val);
    if (containerRef.current) {
      containerRef.current.style.setProperty("--icon-preview-size", `${val}px`);
    }
    if (sizeLabelRef.current) {
      sizeLabelRef.current.innerText = `Size: ${val}px`;
    }
  };

  // Sync state only when interaction ends - REMOVED to keep it buttery smooth
  // We use Refs only to avoid any React re-render cycle during visual changes

  return (
    <div className="preview-container" ref={containerRef}>
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
          <label ref={sizeLabelRef}>Size: {INITIAL_SIZE}px</label>
          <input
            type="range"
            min="16"
            max="128"
            defaultValue={INITIAL_SIZE}
            onInput={handleSizeInput}
            className="range-input"
          />
        </div>

        <div className="control-group">
          <label>Color</label>
          <input
            type="color"
            defaultValue={INITIAL_COLOR}
            onInput={handleColorInput}
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
        {filteredIcons.map(({ name, Component, category }) => (
          <IconCard
            key={name}
            name={name}
            Component={Component}
            category={category}
            isSelected={selectedIcons.has(name)}
            onToggle={toggleSelection}
            onCopy={copyToClipboard}
          />
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
