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
 * Extract inner SVG content (remove <svg> wrapper)
 */
function extractInnerSVG(svg: string): string {
  // Match the content between <svg> tags
  const match = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  if (!match) {
    return svg;
  }
  return match[1].trim();
}

/**
 * Detect if SVG uses fill colors (not just stroke)
 */
function detectFillable(svgContent: string): boolean {
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
  fillable: boolean
): string {
  return `import { createIcon } from '../Icon';

const svgContent = \`${svgContent}\`;

export const ${componentName} = createIcon('${componentName}', svgContent, ${fillable});
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
export { IconProps, createIcon } from './Icon';

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

    // Extract inner SVG content
    const innerContent = extractInnerSVG(optimizedContent);

    // Generate component metadata
    const iconName = path.basename(icon, '.svg');
    const slug = slugify(iconName);
    const componentName = toPascalCase(slug);
    const isFlag = slug.startsWith('flag-');
    const isFillable = detectFillable(svgContent);

    iconMetadata.push({
      componentName,
      fileName: icon,
      slug,
      isFlag,
      isFillable,
      svgContent: innerContent,
    });

    // Generate component file
    const componentCode = generateComponentCode(componentName, innerContent, isFillable);

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

    console.log(`✅ Generated ${componentName}.tsx ${isFlag ? '(flag)' : ''} ${isFillable ? '(fillable)' : '(stroke)'}`);
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
