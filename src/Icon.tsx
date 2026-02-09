import React from "react";

export interface IconProps extends React.ComponentPropsWithoutRef<"svg"> {
  size?: number | string;
  color?: string;
}

export function createIcon(
  name: string,
  svgContent: string,
  isMulticolor: boolean,
  viewBox: string = "0 0 24 24",
) {
  const Icon = ({ size = 24, color = "currentColor", ...props }: IconProps) => {
    return (
      <svg
        width={size}
        height={size}
        viewBox={viewBox}
        fill={isMulticolor ? "none" : color}
        stroke={isMulticolor ? "none" : color}
        xmlns="http://www.w3.org/2000/svg"
        dangerouslySetInnerHTML={{ __html: svgContent }}
        {...props}
      />
    );
  };

  Icon.displayName = name;

  return Icon;
}
