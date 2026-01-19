# Infotravel Icons

A custom icon system for Infotravel projects that converts SVG files into a single optimized CSS file using Data URIs and CSS masks.

## Features

- **CSS-Powered Icons**: Uses `mask-image` for monochrome icons, allowing them to be colored using the standard CSS `color` property.
- **Flag Support**: Special handling for flags and multi-color icons to preserve their original colors.
- **Luminance Masks**: Smart detection of "holes" in monochrome icons (e.g., baggage icons with numbers) to ensure they render correctly when colored.
- **Automated Generation**: Script converts all SVGs in a folder into a ready-to-use CSS file.
- **Visual Preview**: Automatically generates an HTML preview file to browse all available icons.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/)

### Installation

```bash
pnpm install
```

### Building the Icons

To generate the CSS and HTML preview, run:

```bash
pnpm build
```

The output will be generated in the `dist/` directory:

- `dist/infotravel-icons.css`: The compiled CSS file.
- `dist/infotravel-icons.html`: A preview page to see all icons and their class names.

## Usage

1. Include the generated CSS file in your project:

   ```html
   <link rel="stylesheet" href="path/to/infotravel-icons.css" />
   ```

2. Use the icons with the `icone-` prefix followed by the filename (slugified):

   ```html
   <!-- Monochrome icon with custom color -->
   <i class="icone-notificacoes" style="color: blue;"></i>

   <!-- Multi-color flag -->
   <i class="icone-flag-brazil"></i>
   ```

## Adding New Icons

1. Place your `.svg` files in the `public/icons` directory.
2. Run `pnpm build`.
3. Check `dist/infotravel-icons.html` to verify the new icon and see its generated class name.

### Icon Naming Convention

- Filenames are automatically normalized (accents removed, converted to lowercase, special characters replaced by hyphens).
- Files starting with `flag-` are treated as multi-color icons and will not be affected by CSS `color`.
- Icons with white areas and other colors are treated as "mixed-color" and use luminance masks to preserve transparency in those regions.

## Project Structure

- `public/icons/`: Source SVG files.
- `scripts/generate-icons.ts`: The build script.
- `dist/`: Generated output files.
