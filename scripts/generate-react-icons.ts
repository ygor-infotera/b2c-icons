import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { optimize } from 'svgo';
import prettier from 'prettier';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ICON_DIR = path.join(__dirname, '../public/icons');
const OUTPUT_DIR = path.join(__dirname, '../src/icons');

interface IconMetadata {
  componentName: string;
  fileName: string;
  slug: string;
  isFlag: boolean;
  isFillable: boolean;
  svgContent: string;
  viewBox: string;
}

/**
 * Slugify filename (same logic as generate-icons.ts)
 */
function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Convert slug to PascalCase for component names
 */
function toPascalCase(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * Extract viewBox from SVG
 */
function extractViewBox(svg: string): string {
  const viewBoxMatch = svg.match(/viewBox\s*=\s*["']([^"']+)["']/);
  return viewBoxMatch ? viewBoxMatch[1] : '0 0 24 24'; // Default to 24x24
}

/**
 * Detect if SVG is multi-color (has white/black for contrast + other colors)
 * These icons need to preserve their colors like flags
 */
function isMultiColorIcon(svgContent: string): boolean {
  // Check for white stroke (common in counter badges)
  const hasWhiteStroke = /stroke\s*=\s*["'](?:white|#fff|#ffffff)["']/i.test(svgContent);

  // Check for other colors (not white, black, or none)
  const hasOtherColors = /(?:fill|stroke)\s*=\s*["'](?!none|white|#fff|#ffffff|black|#000|#000000)([^"']+)["']/i.test(svgContent);

  // Multi-color if it has both white strokes and other colors
  return hasWhiteStroke && hasOtherColors;
}

/**
 * Extract inner SVG content (remove <svg> wrapper)
 * Also strip fill and stroke attributes to allow wrapper control (except for flags and multi-color icons)
 */
function extractInnerSVG(svg: string, preserveColors: boolean = false, isMultiColor: boolean = false): string {
  // Match the content between <svg> tags
  const match = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  if (!match) {
    return svg;
  }

  let innerContent = match[1].trim();

  // For flags, preserve colors exactly as-is
  if (preserveColors && !isMultiColor) {
    return innerContent;
  }

  // For multi-color icons, replace colors with tokens for customization
  if (isMultiColor) {
    // Replace white/fff with secondary color token
    innerContent = innerContent
      .replace(/fill="#fff(?:fff)?"/g, 'fill="{{SECONDARY_COLOR}}"')
      .replace(/fill="white"/g, 'fill="{{SECONDARY_COLOR}}"')
      .replace(/stroke="#fff(?:fff)?"/g, 'stroke="{{SECONDARY_COLOR}}"')
      .replace(/stroke="white"/g, 'stroke="{{SECONDARY_COLOR}}"');

    // Replace other colors (not white/black) with primary color token
    innerContent = innerContent
      .replace(/fill="#([0-9a-fA-F]{3,6})"/g, (match, hex) => {
        if (hex.toLowerCase() === 'fff' || hex.toLowerCase() === 'ffffff') return match;
        if (hex.toLowerCase() === '000' || hex.toLowerCase() === '000000') return match;
        return 'fill="{{PRIMARY_COLOR}}"';
      })
      .replace(/stroke="#([0-9a-fA-F]{3,6})"/g, (match, hex) => {
        if (hex.toLowerCase() === 'fff' || hex.toLowerCase() === 'ffffff') return match;
        if (hex.toLowerCase() === '000' || hex.toLowerCase() === '000000') return match;
        return 'stroke="{{PRIMARY_COLOR}}"';
      });

    return innerContent;
  }

  // For regular icons, strip fill and stroke color attributes to allow wrapper SVG to control them
  // Keep fill-rule, fill-opacity, stroke-linecap, stroke-linejoin, etc. as they're structural
  innerContent = innerContent
    .replace(/\s*fill="(?!none)[^"]*"/g, '')           // Remove fill="#fff" etc, keep fill="none"
    .replace(/\s*stroke="(?!none)[^"]*"/g, '')         // Remove stroke="#000" etc, keep stroke="none"
    .replace(/\s*stroke-width="[^"]*"/g, '');          // Remove stroke-width="2" etc

  return innerContent;
}

/**
 * Detect if SVG uses fill colors (not just stroke)
 * Most icons with fill attributes should be fillable
 * Flags should preserve their multi-color nature
 */
function detectFillable(svgContent: string, isFlag: boolean): boolean {
  // Flags should preserve colors, so they're fillable but handled specially
  if (isFlag) {
    return true;
  }

  // Check if SVG has fill attributes with actual colors (not "none")
  const hasFillColor = /fill\s*=\s*["'](?!none)([^"']+)["']/i.test(svgContent);

  // Also check for style attributes with fill
  const hasStyleFill = /style\s*=\s*["'][^"']*fill\s*:\s*(?!none)([^;"']+)/i.test(svgContent);

  return hasFillColor || hasStyleFill;
}

/**
 * Generate component file content
 */
function generateComponentCode(
  componentName: string,
  svgContent: string,
  fillable: boolean,
  viewBox: string
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
    .map(({ componentName }) => `export { ${componentName} } from './icons/${componentName}';`)
    .join('\n');

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
  console.log('🚀 Starting React icon generation...\n');

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Read all SVG files
  const icons = fs.readdirSync(ICON_DIR).filter(file => file.endsWith('.svg'));
  console.log(`📦 Found ${icons.length} SVG files\n`);

  const iconMetadata: IconMetadata[] = [];

  // Process each SVG
  for (const icon of icons) {
    const filePath = path.join(ICON_DIR, icon);
    const svgContent = fs.readFileSync(filePath, 'utf-8');

    // Generate component metadata (determine isFlag first)
    const iconName = path.basename(icon, '.svg');
    const slug = slugify(iconName);
    const componentName = toPascalCase(slug);
    const isFlag = slug.startsWith('flag-');

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

    // Check if this is a multi-color icon (like counter badges)
    const isMultiColor = isMultiColorIcon(svgContent);

    // Extract viewBox and inner SVG content
    const viewBox = extractViewBox(optimizedContent);
    // Preserve colors for flags and multi-color icons
    const preserveColors = isFlag || isMultiColor;
    const innerContent = extractInnerSVG(optimizedContent, preserveColors, isMultiColor);

    const isFillable = detectFillable(svgContent, isFlag);

    iconMetadata.push({
      componentName,
      fileName: icon,
      slug,
      isFlag,
      isFillable,
      svgContent: innerContent,
      viewBox,
    });

    // Generate component file
    const componentCode = generateComponentCode(componentName, innerContent, isFillable, viewBox);

    // Format with prettier
    let formattedCode = componentCode;
    try {
      formattedCode = await prettier.format(componentCode, {
        parser: 'typescript',
        singleQuote: true,
        trailingComma: 'es5',
      });
    } catch (error) {
      console.warn(`⚠️  Prettier formatting failed for ${componentName}, using unformatted`);
    }

    // Write component file
    const componentPath = path.join(OUTPUT_DIR, `${componentName}.tsx`);
    fs.writeFileSync(componentPath, formattedCode);

    const typeLabel = isFlag ? '(flag)' : isMultiColor ? '(multi-color)' : isFillable ? '(fillable)' : '(stroke)';
    console.log(`✅ Generated ${componentName}.tsx ${typeLabel}`);
  }

  console.log(`\n📝 Generating index.ts...\n`);

  // Generate index.ts
  const indexContent = generateIndexFile(iconMetadata);

  // Format with prettier
  let formattedIndex = indexContent;
  try {
    formattedIndex = await prettier.format(indexContent, {
      parser: 'typescript',
      singleQuote: true,
      trailingComma: 'es5',
    });
  } catch (error) {
    console.warn('⚠️  Prettier formatting failed for index.ts, using unformatted');
  }

  // Write index file
  const indexPath = path.join(__dirname, '../src/index.ts');
  fs.writeFileSync(indexPath, formattedIndex);

  console.log(`✅ Generated src/index.ts with ${iconMetadata.length} exports\n`);
  console.log('✨ React icon generation complete!\n');

  // Print summary
  const fillableCount = iconMetadata.filter(m => m.isFillable).length;
  const strokeCount = iconMetadata.length - fillableCount;
  const flagCount = iconMetadata.filter(m => m.isFlag).length;

  console.log('📊 Summary:');
  console.log(`   Total icons: ${iconMetadata.length}`);
  console.log(`   Fillable: ${fillableCount}`);
  console.log(`   Stroke: ${strokeCount}`);
  console.log(`   Flags: ${flagCount}`);
}

// Run the generator
generateReactIcons().catch(error => {
  console.error('❌ Error generating React icons:', error);
  process.exit(1);
});
