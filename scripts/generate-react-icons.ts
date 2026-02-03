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
  isFillable: boolean;
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

/**
 * Extract inner SVG content (remove <svg> wrapper)
 * Also strip fill and stroke attributes to allow wrapper control (except for multicolors, multi-color icons, and filled icons)
 */
function extractInnerSVG(
  svg: string,
  preserveColors: boolean = false,
  isFilled: boolean = false,
): string {
  // Match the content between <svg> tags
  const match = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  if (!match) {
    return svg;
  }

  let innerContent = match[1].trim();

  // For multicolors, preserve colors exactly as-is but add stroke="none" to prevent parent stroke inheritance
  if (preserveColors) {
    // Add stroke="none" to all paths/shapes that don't have a stroke attribute
    innerContent = innerContent.replace(
      /<(path|circle|rect|ellipse|polygon)([^>]*?)(\/?)>/g,
      (match, tag, attrs, selfClosing) => {
        // If no stroke attribute, add stroke="none" to prevent inheritance
        if (!/stroke\s*=/.test(attrs)) {
          attrs = attrs + ' stroke="none"';
        }
        return `<${tag}${attrs}${selfClosing}>`;
      },
    );
    return innerContent;
  }

  // For "filled" icons, keep explicit fill and stroke attributes but strip colors
  // This preserves which paths should be filled vs stroked
  if (isFilled) {
    // Parse paths and circles to add explicit none attributes for hybrid rendering
    innerContent = innerContent.replace(
      /<(path|circle)([^>]*?)(\/?)>/g,
      (match, tag, attrs, selfClosing) => {
        const hasFill = /fill="(?!none)[^"]*"/.test(attrs);
        const hasStroke = /stroke="(?!none)[^"]*"/.test(attrs);

        // If element has only stroke (no fill), add explicit fill="none"
        if (hasStroke && !hasFill && !/fill="none"/.test(attrs)) {
          attrs = attrs + ' fill="none"';
        }
        // If element has only fill (no stroke), add explicit stroke="none"
        else if (hasFill && !hasStroke && !/stroke="none"/.test(attrs)) {
          attrs = attrs + ' stroke="none"';
        }

        return `<${tag}${attrs}${selfClosing}>`;
      },
    );

    // Strip color values but KEEP fill="none" and stroke="none"
    innerContent = innerContent
      .replace(/\s*fill="(?!none)[^"]*"/g, "")
      .replace(/\s*stroke="(?!none)[^"]*"/g, "");

    return innerContent;
  }

  // For regular icons, we need to handle hybrid icons (icons with both fill and stroke paths)
  // Strategy: Add explicit fill="none" or stroke="none" to disambiguate paths, then strip colors

  // Parse paths and add explicit none attributes for hybrid icons
  innerContent = innerContent.replace(
    /<path([^>]*?)(\/?)>/g,
    (match, attrs, selfClosing) => {
      const hasFill = /fill="(?!none)[^"]*"/.test(attrs);
      const hasStroke = /stroke="(?!none)[^"]*"/.test(attrs);

      // If path has only stroke (no fill), add explicit fill="none"
      if (hasStroke && !hasFill && !/fill="none"/.test(attrs)) {
        attrs = attrs + ' fill="none"';
      }
      // If path has only fill (no stroke), add explicit stroke="none"
      else if (hasFill && !hasStroke && !/stroke="none"/.test(attrs)) {
        attrs = attrs + ' stroke="none"';
      }

      return `<path${attrs}${selfClosing}>`;
    },
  );

  // Now strip color values, keeping fill="none" and stroke="none"
  innerContent = innerContent
    .replace(/\s*fill="(?!none)[^"]*"/g, "") // Remove fill="#fff" etc, keep fill="none"
    .replace(/\s*stroke="(?!none)[^"]*"/g, "") // Remove stroke="#000" etc, keep stroke="none"
    .replace(/\s*stroke-width="[^"]*"/g, ""); // Remove stroke-width="2" etc

  return innerContent;
}

/**
 * Detect if SVG uses fill colors (not just stroke)
 * Most icons with fill attributes should be fillable
 * Multicolors should preserve their multi-color nature
 * Filled icons (with "filled" in name) ARE fillable - they're hybrid icons needing both fill and stroke
 */
function detectFillable(
  svgContent: string,
  isMulticolor: boolean,
  isFilled: boolean,
): boolean {
  // Multicolors should preserve colors, so they're fillable but handled specially
  if (isMulticolor) {
    return true;
  }

  // "Filled" icons ARE fillable - they're hybrid icons that need both fill and stroke set to color
  // This allows paths with fill="none" to use stroke, and paths with stroke="none" to use fill
  if (isFilled) {
    return true;
  }

  // Check if SVG has fill attributes with actual colors (not "none")
  const hasFillColor = /fill\s*=\s*["'](?!none)([^"']+)["']/i.test(svgContent);

  // Also check for style attributes with fill
  const hasStyleFill =
    /style\s*=\s*["'][^"']*fill\s*:\s*(?!none)([^;"']+)/i.test(svgContent);

  return hasFillColor || hasStyleFill;
}

/**
 * Generate component file content
 */
function generateComponentCode(
  componentName: string,
  svgContent: string,
  fillable: boolean,
  viewBox: string,
): string {
  return `import { createIcon } from '../Icon';

const svgContent = \`${svgContent}\`;

export const ${componentName} = createIcon('${componentName}', svgContent, ${fillable}, '${viewBox}');
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

    // Check if this is a "filled" icon (icons with "filled" in the name)
    const isFilled = slug.includes("-filled") && !isMulticolor;

    // Extract viewBox and inner SVG content
    const viewBox = extractViewBox(optimizedContent);
    // Preserve colors for multicolors
    const preserveColors = isMulticolor;
    const innerContent = extractInnerSVG(
      optimizedContent,
      preserveColors,
      isFilled,
    );

    const isFillable = detectFillable(svgContent, isMulticolor, isFilled);

    iconMetadata.push({
      componentName,
      fileName: icon,
      slug,
      isMulticolor,
      isFillable,
      svgContent: innerContent,
      viewBox,
    });

    // Generate component file
    const componentCode = generateComponentCode(
      componentName,
      innerContent,
      isFillable,
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

    const typeLabel = isMulticolor
      ? "(multicolor)"
      : isFilled
        ? "(filled)"
        : isFillable
          ? "(fillable)"
          : "(stroke)";
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
  const fillableCount = iconMetadata.filter((m) => m.isFillable).length;
  const strokeCount = iconMetadata.length - fillableCount;
  const multicolorCount = iconMetadata.filter((m) => m.isMulticolor).length;

  console.log("📊 Summary:");
  console.log(`   Total icons: ${iconMetadata.length}`);
  console.log(`   Fillable: ${fillableCount}`);
  console.log(`   Stroke: ${strokeCount}`);
  console.log(`   Multicolors: ${multicolorCount}`);
}

// Run the generator
generateReactIcons().catch((error) => {
  console.error("❌ Error generating React icons:", error);
  process.exit(1);
});
