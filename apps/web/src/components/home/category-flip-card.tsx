import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

interface CategoryFlipCardProps {
  name: string;
  icon: LucideIcon;
  slug: string;
  color: string;
}

export function CategoryFlipCard({ name, icon: Icon, slug, color }: CategoryFlipCardProps) {
  return (
    <Link href={`/products?category=${slug}`}>
      <style jsx>{`
        .flip-card {
          background-color: transparent;
          width: 100%;
          height: 110px;
          perspective: 1000px;
        }

        .flip-card:hover .flip-card-inner {
          transform: rotateY(180deg);
        }

        .flip-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          text-align: center;
          transition: transform 0.6s;
          transform-style: preserve-3d;
        }

        .flip-card-inner::after {
          color: inherit;
        }

        .flip-card-front,
        .flip-card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
        }

        .flip-card-front {
          color: black;
        }

        .flip-card-back {
          color: black;
          transform: rotateY(180deg);
        }
      `}</style>

      <div className={`flip-card rounded-md border cursor-pointer ${color}`}>
        <div className="flip-card-inner">
          {/* Front - Text */}
          <div className="flip-card-front flex items-center justify-center p-2">
            <h3 className="font-semibold text-[11px] text-center leading-tight">{name}</h3>
          </div>

          {/* Back - Icon */}
          <div className="flip-card-back flex items-center justify-center p-2">
            <Icon className="h-9 w-9 opacity-80" strokeWidth={1.5} />
          </div>
        </div>
      </div>
    </Link>
  );
}
