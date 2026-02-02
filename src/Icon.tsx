import React, { forwardRef } from 'react';

export interface IconProps extends React.SVGAttributes<SVGElement> {
  size?: number | string;
  color?: string;
  strokeWidth?: number | string;
  fill?: string;
  className?: string;
  'aria-label'?: string;
}

export const createIcon = (
  displayName: string,
  svgContent: string,
  defaultFillable: boolean = false
) => {
  const IconComponent = forwardRef<SVGSVGElement, IconProps>(
    (
      {
        size = 24,
        color,
        strokeWidth = 2,
        fill,
        className = '',
        'aria-label': ariaLabel,
        ...props
      },
      ref
    ) => {
      const finalSize = typeof size === 'number' ? `${size}px` : size;
      const finalFill = fill || (defaultFillable ? 'currentColor' : 'none');
      const finalColor = color || 'currentColor';
      const finalStrokeWidth = typeof strokeWidth === 'number' ? strokeWidth : parseFloat(strokeWidth as string) || 2;

      return (
        <svg
          ref={ref}
          xmlns="http://www.w3.org/2000/svg"
          width={finalSize}
          height={finalSize}
          viewBox="0 0 24 24"
          fill={finalFill}
          stroke={finalColor}
          strokeWidth={finalStrokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-label={ariaLabel}
          aria-hidden={!ariaLabel}
          {...props}
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      );
    }
  );

  IconComponent.displayName = displayName;
  return IconComponent;
};
