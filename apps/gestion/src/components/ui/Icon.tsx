import React from "react";

interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, "path"> {
  path: string | string[];
  solid?: boolean;
}

export const Icon: React.FC<IconProps> = ({
  path,
  solid = false,
  className = "w-5 h-5",
  viewBox = "0 0 24 24",
  ...props
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      fill={solid ? "currentColor" : "none"}
      stroke={solid ? "none" : "currentColor"}
      strokeWidth={solid ? 0 : 1.5}
      className={className}
      {...props}
    >
      {Array.isArray(path) ? (
        path.map((d, i) => (
          <path
            key={i}
            strokeLinecap="round"
            strokeLinejoin="round"
            d={d}
            fillRule={solid ? "evenodd" : undefined}
            clipRule={solid ? "evenodd" : undefined}
          />
        ))
      ) : (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d={path}
          fillRule={solid ? "evenodd" : undefined}
          clipRule={solid ? "evenodd" : undefined}
        />
      )}
    </svg>
  );
};
