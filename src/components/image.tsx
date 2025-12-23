"use client";

export default function Image({
  src,
  alt,
  width,
  height,
  className,
}: Readonly<{
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}>) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
        e.currentTarget.style.display = "none";
      }}
      className={className}
    />
  );
}
