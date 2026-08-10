'use client';

import Link from 'next/link';
import Image from 'next/image';

type BrandLogoProps = {
  href?: string;
  className?: string;
  imageClassName?: string;
};

export function BrandLogo({
  href = '/',
  className = '',
  imageClassName = '',
}: BrandLogoProps) {
  return (
    <Link href={href} className={`inline-flex items-center gap-3 ${className}`}>
      <Image
        src="/agritun.png"
        alt="TunAgri"
        width={96}
        height={96}
        sizes="(min-width: 640px) 96px, 80px"
        priority
        className={`h-20 w-20 sm:h-24 sm:w-24 rounded-full object-contain ${imageClassName}`}
      />
    </Link>
  );
}