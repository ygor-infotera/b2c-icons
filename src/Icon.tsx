import React from "react";

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
}

export function createIcon(
  name: string,
  svgContent: string,
  isFillable: boolean,
  viewBox: string = "0 0 24 24",
) {
  const Icon = ({ size = 24, color = "currentColor", ...props }: IconProps) => {
    return (
      <svg
        width={size}
        height={size}
        viewBox={viewBox}
        fill={isFillable ? color : "none"}
        stroke={!isFillable ? color : "none"}
        xmlns="http://www.w3.org/2000/svg"
        dangerouslySetInnerHTML={{ __html: svgContent }}
        {...props}
      />
    );
  };

  Icon.displayName = name;

  return Icon;
}
