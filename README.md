# Infotravel Icons

A modern icon library for Infotravel projects with React component support, tree-shaking, and CSS fallback. Converts SVG files into optimized, customizable components and CSS.

## Features

- **React Components**: Tree-shakable React components with TypeScript support
- **Customizable Props**: Control size, color, strokeWidth, fill, and more
- **Tree-Shaking**: Import only the icons you use (~1.5KB per icon vs 77KB for all)
- **SVG Optimization**: SVGO-powered compression (30-50% size reduction)
- **CSS Fallback**: Traditional CSS classes still supported for backward compatibility
- **Flag Support**: Multi-color icons (flags) preserve their original colors
- **TypeScript**: Full type definitions included
- **Zero Runtime Cost**: All optimization happens at build time

## Installation

```bash
npm install infotravel-icons react
# or
pnpm add infotravel-icons react
# or
yarn add infotravel-icons react
```

Note: React is an optional peer dependency. If you only use CSS, React is not required.

## Usage

### React Components (Recommended)

Import and use icons as React components with full customization:

```tsx
import { Notificacoes, FlagBrazil, Idioma } from "infotravel-icons";

function App() {
  return (
    <div>
      {/* Basic usage */}
      <Notificacoes />

      {/* Custom size */}
      <Notificacoes size={32} />
      <Notificacoes size="2rem" />

      {/* Custom color */}
      <Notificacoes color="#FF6B6B" />
      <Notificacoes color="currentColor" />

      {/* Custom stroke width */}
      <Notificacoes strokeWidth={3} />

      {/* With className for additional styling */}
      <Idioma className="my-icon" />

      {/* Flags maintain their original colors */}
      <FlagBrazil size={48} />

      {/* Accessibility */}
      <Notificacoes aria-label="Notifications" />

      {/* All SVG props are supported */}
      <Notificacoes
        onClick={() => alert("Clicked!")}
        style={{ cursor: "pointer" }}
      />
    </div>
  );
}
```

### CSS Classes (Legacy)

For backward compatibility, CSS classes are still available:

```html
<!-- Include the CSS file -->
<link
  rel="stylesheet"
  href="node_modules/infotravel-icons/dist/infotravel-icons.css"
/>

<!-- Use with class names -->
<i class="icone-notificacoes" style="color: blue;"></i>
<i class="icone-flag-brazil"></i>
```

## API Reference

### IconProps

All icon components accept these props:

| Prop        | Type             | Default        | Description                               |
| ----------- | ---------------- | -------------- | ----------------------------------------- |
| size        | number \| string | 24             | Icon size (px if number, or any CSS unit) |
| color       | string           | 'currentColor' | Stroke color                              |
| strokeWidth | number \| string | 2              | Stroke width                              |
| fill        | string           | 'none'         | Fill color (for fillable icons)           |
| className   | string           | ''             | Additional CSS classes                    |
| aria-label  | string           | undefined      | Accessibility label                       |
| ...props    | SVGAttributes    | -              | Any other SVG element attributes          |

All components support ref forwarding:

```tsx
const iconRef = useRef<SVGSVGElement>(null);
<Notificacoes ref={iconRef} />;
```

## Available Icons

23 icons are currently available:

**Baggage Icons (with counters):**

- `BagegemDeCabineCouter0` through `BagegemDeCabineCouter4`
- `ItemPessoalCounter0` through `ItemPessoalCounter4`
- `MalaDespachadaCouter0` through `MalaDespachadaCouter4`

**Flags:**

- `FlagBrazil`
- `FlagSpain`
- `FlagUnitedStates`

**UI Icons:**

- `Notificacoes` (Notifications)
- `Idioma` (Language)
- `Contraste` (Contrast)
- `Moeda` (Currency)
- `Mostrar` (Show)

Preview all icons by opening `dist/infotravel-icons.html` after building.

## Tree-Shaking

This library is fully tree-shakable. Import only the icons you need:

```tsx
// ✅ Good: Only Notificacoes is included in bundle (~1.5KB)
import { Notificacoes } from "infotravel-icons";

// ❌ Avoid: Imports everything
import * as Icons from "infotravel-icons";
```

**Bundle Size:**

- Import 1 icon: ~1.5KB (tree-shaken)
- Import all 23 icons: ~25-30KB
- CSS file (all icons): ~77KB

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/)

### Setup

```bash
pnpm install
```

### Building

To generate both CSS and React components:

```bash
pnpm build
```

This runs:

1. `pnpm build:css` - Generates CSS file and HTML preview
2. `pnpm build:react` - Generates React components and bundles with tsup

Output files in `dist/`:

- `index.js`, `index.mjs` - React component bundles (CJS and ESM)
- `index.d.ts` - TypeScript type definitions
- `infotravel-icons.css` - CSS file with all icons
- `infotravel-icons.html` - Preview page

### Adding New Icons

1. Place your `.svg` files in the `public/icons` directory
2. Run `pnpm build`
3. Import and use the new component:

```tsx
import { NewIcon } from "infotravel-icons";
<NewIcon size={24} color="blue" />;
```

### Icon Naming Convention

- Filenames are automatically converted to PascalCase component names
- `notificacoes.svg` → `Notificacoes`
- `flag-brazil.svg` → `FlagBrazil`
- Accents are removed, special characters become hyphens
- Files starting with `flag-` are treated as multi-color icons

## Project Structure

```
infotravel-icons/
├── public/icons/              # Source SVG files
├── src/
│   ├── Icon.tsx              # Base icon component
│   ├── index.ts              # Barrel export (generated)
│   └── icons/                # Individual components (generated)
├── scripts/
│   ├── generate-icons.ts     # CSS generation
│   └── generate-react-icons.ts # React generation
├── dist/                     # Build output
├── svgo.config.mjs          # SVG optimization config
├── tsup.config.ts           # Bundler configuration
└── package.json
```

## Migration from v1.x to v2.x

### If you're using CSS (no changes needed):

```html
<!-- v1.x (still works in v2.x) -->
<link rel="stylesheet" href="path/to/infotravel-icons.css" />
<i class="icone-notificacoes"></i>
```

### To use React components (new in v2.x):

```tsx
// Install React if you haven't
npm install react

// Import and use components
import { Notificacoes } from 'infotravel-icons';
<Notificacoes size={24} color="blue" />
```

## TypeScript

Full TypeScript support is included. All components are typed with `IconProps`:

```tsx
import { Notificacoes, IconProps } from "infotravel-icons";

const MyIcon = (props: IconProps) => <Notificacoes {...props} />;
```

## License

ISC

## Contributing

1. Add SVG files to `public/icons/`
2. Run `pnpm build`
3. Test the generated components
4. Submit a pull request
