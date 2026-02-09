import fs from "fs";
import path from "path";
import prettier from "prettier";
import { optimize } from "svgo";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ICON_DIR = path.join(__dirname, "../public/icons");
const OUTPUT_DIR = path.join(__dirname, "../src/icons");

interface IconMetadata {
  componentName: string;
  fileName: string;
  slug: string;
  isMulticolor: boolean;
  svgContent: string;
  viewBox: string;
}

/**
 * Slugify filename (same logic as generate-icons.ts)
 */
function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Convert slug to PascalCase for component names
 */
function toPascalCase(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

/**
 * Extract viewBox from SVG
 */
function extractViewBox(svg: string): string {
  const viewBoxMatch = svg.match(/viewBox\s*=\s*["']([^"']+)["']/);
  return viewBoxMatch ? viewBoxMatch[1] : "0 0 24 24"; // Default to 24x24
}

const BLACK_COLORS = new Set(["black", "#000", "#000000"]);
const WHITE_COLORS = new Set(["white", "#fff", "#ffffff"]);

function isBlackColor(color: string): boolean {
  return BLACK_COLORS.has(color.toLowerCase().trim());
}

function isWhiteColor(color: string): boolean {
  return WHITE_COLORS.has(color.toLowerCase().trim());
}

/**
 * Detect whether an SVG uses non-black, non-white colors.
 * 'monochrome' = only black/white → black becomes target color
 * 'colored' = has other colors → only those become target color, black/white preserved
 */
function detectColorMode(
  svgContent: string,
): "monochrome" | "colored" {
  const attrColorRegex =
    /\b(?:fill|stroke)\s*=\s*["']([^"']+)["']/gi;
  let match;

  while ((match = attrColorRegex.exec(svgContent)) !== null) {
    const color = match[1].trim().toLowerCase();
    if (color === "none" || color === "currentcolor") continue;
    if (!isBlackColor(color) && !isWhiteColor(color)) {
      return "colored";
    }
  }

  return "monochrome";
}

/**
 * Determine what to do with a color value during extraction.
 * Returns:
 *   undefined → strip attribute, element inherits target color from wrapper
 *   string → explicit attribute value to set
 */
function computeNewColor(
  effectiveColor: string,
  colorMode: "monochrome" | "colored",
): string | undefined {
  const lc = effectiveColor.toLowerCase().trim();

  if (lc === "none") return "none";
  if (lc === "currentcolor") return undefined;

  if (isWhiteColor(effectiveColor)) return "white";

  if (isBlackColor(effectiveColor)) {
    // In colored icons, black is structural and should be preserved
    if (colorMode === "colored") return "black";
    // In monochrome icons, black becomes target color
    return undefined;
  }

  // Any other color → strip → inherits target color from wrapper
  return undefined;
}

/**
 * Extract inner SVG content (remove <svg> wrapper)
 * Processes colors based on icon type:
 * - Multicolor: preserves all colors, adds stroke="none" to prevent inheritance
 * - Monochrome (black/white only): strips black (inherits target), preserves white
 * - Colored (has non-black/non-white): strips those colors (inherits target), preserves black and white
 */
function extractInnerSVG(
  svg: string,
  isMulticolor: boolean,
): string {
  const match = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  if (!match) {
    return svg;
  }

  // Get parent SVG's fill/stroke for inheritance resolution
  const svgTag = svg.match(/<svg[^>]*>/)?.[0] || "";
  const parentFillMatch = svgTag.match(/\bfill\s*=\s*["']([^"']*)["']/);
  const parentStrokeMatch = svgTag.match(/\bstroke\s*=\s*["']([^"']*)["']/);
  const parentFill = parentFillMatch ? parentFillMatch[1].trim() : "black";
  const parentStroke = parentStrokeMatch
    ? parentStrokeMatch[1].trim()
    : "none";

  let innerContent = match[1].trim();

  // For multicolor icons, preserve all colors, just add stroke="none" to prevent inheritance
  if (isMulticolor) {
    innerContent = innerContent.replace(
      /<(path|circle|rect|ellipse|polygon|line|polyline)([^>]*?)(\/?)>/g,
      (fullMatch, tag, attrs, selfClosing) => {
        if (!/\bstroke\s*=/.test(attrs)) {
          attrs = attrs + ' stroke="none"';
        }
        return `<${tag}${attrs}${selfClosing}>`;
      },
    );
    return innerContent;
  }

  const colorMode = detectColorMode(svg);

  // Process each shape element
  innerContent = innerContent.replace(
    /<(path|circle|rect|ellipse|polygon|line|polyline)([^>]*?)(\/?)>/g,
    (fullMatch, tag, attrs, selfClosing) => {
      // Extract current fill and stroke values
      const fillMatch = attrs.match(/\bfill\s*=\s*["']([^"']*)["']/);
      const strokeMatch = attrs.match(/\bstroke\s*=\s*["']([^"']*)["']/);

      const fillValue = fillMatch ? fillMatch[1].trim() : null;
      const strokeValue = strokeMatch ? strokeMatch[1].trim() : null;

      // Resolve effective values considering parent SVG inheritance
      const effectiveFill = fillValue !== null ? fillValue : parentFill;
      const effectiveStroke =
        strokeValue !== null ? strokeValue : parentStroke;

      // Strip existing fill and stroke color attributes
      let newAttrs = attrs
        .replace(/\s*\bfill\s*=\s*["'][^"']*["']/g, "")
        .replace(/\s*\bstroke\s*=\s*["'][^"']*["']/g, "");

      // Compute new fill and stroke
      const newFill = computeNewColor(effectiveFill, colorMode);
      const newStroke = computeNewColor(effectiveStroke, colorMode);

      if (newFill !== undefined) newAttrs += ` fill="${newFill}"`;
      if (newStroke !== undefined) newAttrs += ` stroke="${newStroke}"`;

      return `<${tag}${newAttrs}${selfClosing}>`;
    },
  );

  return innerContent;
}


/**
 * Generate component file content
 */
function generateComponentCode(
  componentName: string,
  svgContent: string,
  isMulticolor: boolean,
  viewBox: string,
): string {
  return `import { createIcon } from '../Icon';

const svgContent = \`${svgContent}\`;

export const ${componentName} = createIcon('${componentName}', svgContent, ${isMulticolor}, '${viewBox}');
`;
}

/**
 * Generate index.ts barrel export
 */
function generateIndexFile(metadata: IconMetadata[]): string {
  const exports = metadata
    .map(
      ({ componentName }) =>
        `export { ${componentName} } from './icons/${componentName}';`,
    )
    .join("\n");

  return `// Auto-generated file - do not edit manually
export type { IconProps } from './Icon';
export { createIcon } from './Icon';

${exports}
`;
}

/**
 * Main generation function
 */
async function generateReactIcons() {
  console.log("🚀 Starting React icon generation...\n");

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Read all SVG files
  const icons = fs
    .readdirSync(ICON_DIR)
    .filter((file) => file.endsWith(".svg"));
  console.log(`📦 Found ${icons.length} SVG files\n`);

  const iconMetadata: IconMetadata[] = [];

  // Process each SVG
  for (const icon of icons) {
    const filePath = path.join(ICON_DIR, icon);
    const svgContent = fs.readFileSync(filePath, "utf-8");

    // Generate component metadata (determine isMulticolor first)
    const iconName = path.basename(icon, ".svg");
    const slug = slugify(iconName);
    const componentName = toPascalCase(slug);
    const isMulticolor = slug.startsWith("multicolor-");

    // Optimize SVG with SVGO
    let optimizedContent = svgContent;
    try {
      const result = optimize(svgContent, {
        path: filePath,
        multipass: true,
      });
      optimizedContent = result.data;
    } catch (error) {
      console.warn(`⚠️  SVGO optimization failed for ${icon}, using original`);
    }

    // Extract viewBox and inner SVG content
    const viewBox = extractViewBox(optimizedContent);
    const innerContent = extractInnerSVG(optimizedContent, isMulticolor);

    iconMetadata.push({
      componentName,
      fileName: icon,
      slug,
      isMulticolor,
      svgContent: innerContent,
      viewBox,
    });

    // Generate component file
    const componentCode = generateComponentCode(
      componentName,
      innerContent,
      isMulticolor,
      viewBox,
    );

    // Format with prettier
    let formattedCode = componentCode;
    try {
      formattedCode = await prettier.format(componentCode, {
        parser: "typescript",
        singleQuote: true,
        trailingComma: "es5",
      });
    } catch (error) {
      console.warn(
        `⚠️  Prettier formatting failed for ${componentName}, using unformatted`,
      );
    }

    // Write component file
    const componentPath = path.join(OUTPUT_DIR, `${componentName}.tsx`);
    fs.writeFileSync(componentPath, formattedCode);

    const typeLabel = isMulticolor ? "(multicolor)" : "(standard)";
    console.log(`✅ Generated ${componentName}.tsx ${typeLabel}`);
  }

  console.log(`\n📝 Generating index.ts...\n`);

  // Generate index.ts
  const indexContent = generateIndexFile(iconMetadata);

  // Format with prettier
  let formattedIndex = indexContent;
  try {
    formattedIndex = await prettier.format(indexContent, {
      parser: "typescript",
      singleQuote: true,
      trailingComma: "es5",
    });
  } catch (error) {
    console.warn(
      "⚠️  Prettier formatting failed for index.ts, using unformatted",
    );
  }

  // Write index file
  const indexPath = path.join(__dirname, "../src/index.ts");
  fs.writeFileSync(indexPath, formattedIndex);

  console.log(
    `✅ Generated src/index.ts with ${iconMetadata.length} exports\n`,
  );
  console.log("✨ React icon generation complete!\n");

  // Print summary
  const multicolorCount = iconMetadata.filter((m) => m.isMulticolor).length;
  const standardCount = iconMetadata.length - multicolorCount;

  console.log("📊 Summary:");
  console.log(`   Total icons: ${iconMetadata.length}`);
  console.log(`   Standard: ${standardCount}`);
  console.log(`   Multicolor: ${multicolorCount}`);
}

// Run the generator
generateReactIcons().catch((error) => {
  console.error("❌ Error generating React icons:", error);
  process.exit(1);
});
