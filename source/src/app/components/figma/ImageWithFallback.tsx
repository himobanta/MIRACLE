import { useState, ImgHTMLAttributes } from 'react';

export interface ImageWithFallbackProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
}

export function ImageWithFallback({
  src,
  alt,
  fallbackSrc = 'https://images.unsplash.com/photo-1636153279424-cb5d1e00f5a2?w=1200&fit=crop&auto=format&q=80',
  className,
  ...rest
}: ImageWithFallbackProps) {
  const [imgSrc, setImgSrc] = useState(src);

  return (
    <img
      src={imgSrc || fallbackSrc}
      alt={alt}
      onError={() => {
        if (imgSrc !== fallbackSrc) {
          setImgSrc(fallbackSrc);
        }
      }}
      className={className}
      {...rest}
    />
  );
}
