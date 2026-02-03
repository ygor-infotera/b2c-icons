import React, { forwardRef } from 'react';

export interface IconProps extends React.SVGAttributes<SVGElement> {
  size?: number | string;
  color?: string;
  secondaryColor?: string;
  tertiaryColor?: string;
  strokeWidth?: number | string;
  fill?: string;
  className?: string;
  'aria-label'?: string;
}

export const createIcon = (
  displayName: string,
  svgContent: string,
  defaultFillable: boolean = false,
  viewBox: string = '0 0 24 24'
) => {
  const IconComponent = forwardRef<SVGSVGElement, IconProps>(
    (
      {
        size = 24,
        color,
        secondaryColor,
        tertiaryColor,
        strokeWidth = 1,
        fill,
        className = '',
        'aria-label': ariaLabel,
        ...props
      },
      ref
    ) => {
      const finalSize = typeof size === 'number' ? `${size}px` : size;
      const finalColor = color || 'currentColor';
      const finalSecondaryColor = secondaryColor || 'white';
      const finalTertiaryColor = tertiaryColor || 'currentColor';
      const finalStrokeWidth = typeof strokeWidth === 'number' ? strokeWidth : parseFloat(strokeWidth as string) || 2;

      // Replace color tokens in multi-color icons
      let processedContent = svgContent;
      if (svgContent.includes('{{PRIMARY_COLOR}}')) {
        processedContent = processedContent
          .replace(/\{\{PRIMARY_COLOR\}\}/g, finalColor)
          .replace(/\{\{SECONDARY_COLOR\}\}/g, finalSecondaryColor)
          .replace(/\{\{TERTIARY_COLOR\}\}/g, finalTertiaryColor);
      }

      // Handle fill and stroke for different icon types
      // Fillable icons may also need stroke (hybrid icons with both fill and stroke)
      // So we set both to finalColor and let individual paths control via explicit attributes
      const finalFill = fill !== undefined
        ? fill
        : defaultFillable
          ? finalColor  // Use color prop as fill for fillable icons
          : 'none';

      const finalStroke = defaultFillable
        ? finalColor   // Fillable icons can have strokes too (for hybrid icons)
        : finalColor;  // Stroke-based icons use color as stroke

      return (
        <svg
          ref={ref}
          xmlns="http://www.w3.org/2000/svg"
          width={finalSize}
          height={finalSize}
          viewBox={viewBox}
          fill={finalFill}
          stroke={finalStroke}
          strokeWidth={finalStrokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-label={ariaLabel}
          aria-hidden={!ariaLabel}
          {...props}
          dangerouslySetInnerHTML={{ __html: processedContent }}
        />
      );
    }
  );

  IconComponent.displayName = displayName;
  return IconComponent;
};
