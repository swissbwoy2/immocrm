import React from 'react';
import { useSignedUrl } from '@/lib/storageUrl';

type SignedImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  src?: string | null;
};

/** <img> qui signe automatiquement les URLs des buckets privés. */
export const SignedImage: React.FC<SignedImageProps> = ({ src, alt = '', ...rest }) => {
  const resolved = useSignedUrl(src);
  if (!resolved) return <div {...(rest as any)} aria-hidden />;
  return <img src={resolved} alt={alt} {...rest} />;
};
