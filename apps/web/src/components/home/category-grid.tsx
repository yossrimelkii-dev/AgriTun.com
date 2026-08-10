'use client';

import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Category {
  _id: string;
  name: string;
  slug: string;
  icon?: string;
  image?: string;
  sector: string;
  sortOrder: number;
}

export function CategoryGrid() {
  const { data, isLoading } = useQuery<{ categories: Category[] }>({
    queryKey: ['categories', 'root'],
    queryFn: async () => {
      const res = await fetch('/api/categories?parentId=root');
      if (!res.ok) throw new Error('Failed to fetch categories');
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const categories = data?.categories ?? [];
  const loopCategories = [...categories, ...categories];

  return (
    <div className="w-full">
      <style jsx>{`
        @keyframes fadeInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .category-item {
          animation: fadeInLeft 0.6s ease-out forwards;
          transform-origin: center center;
        }

        .category-motion {
          animation: rotateFloat 6s ease-in-out infinite;
        }

        .category-marquee {
          animation: marquee 34s linear infinite;
          width: max-content;
        }

        .category-marquee:hover {
          animation-play-state: paused;
        }

        @keyframes rotateFloat {
          0% {
            transform: rotate(-0.6deg) translateY(0px);
          }
          50% {
            transform: rotate(0.6deg) translateY(-2px);
          }
          100% {
            transform: rotate(-0.6deg) translateY(0px);
          }
        }

        @keyframes marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        .scroll-container {
          scroll-behavior: smooth;
        }

        .scroll-container::-webkit-scrollbar {
          height: 4px;
        }

        .scroll-container::-webkit-scrollbar-track {
          background: #e5e7eb;
          border-radius: 2px;
        }

        .scroll-container::-webkit-scrollbar-thumb {
          background: #9ca3af;
          border-radius: 2px;
        }

        .scroll-container::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }
      `}</style>

      {/* Fixed-height rail: same geometry across loading / empty / loaded states
          so the layout never shifts when categories arrive. Card is h-48 (192px)
          plus 2px pb-2 → 194px. Use min-h to reserve space. */}
      <div className="relative group min-h-[196px] pb-2 px-2 overflow-hidden">
        {isLoading ? (
          <div className="flex gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48 w-72 rounded-xl flex-shrink-0" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="flex h-48 items-center justify-center">
            <p className="text-muted-foreground">Aucune catégorie disponible</p>
          </div>
        ) : (
          <div className="category-marquee flex gap-4">
            {loopCategories.map((category, index) => (
              <div
                key={`${category._id}-${index}`}
                className="category-motion flex-shrink-0"
              >
                <CategoryCard category={category} delay={((index % 6) + 1) * 0.1} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryCard({ category, delay }: { category: Category; delay: number }) {
  const router = useRouter();
  const [showSubcategories, setShowSubcategories] = useState(false);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [isLoadingSubcategories, setIsLoadingSubcategories] = useState(false);

  const defaultImages: Record<string, string> = {
    medical: 'https://images.unsplash.com/photo-1576091160550-112173f7f869?w=500&h=400&fit=crop',
    agricultural: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=500&h=400&fit=crop',
  };

  const imageUrl = category.image || defaultImages[category.sector.toLowerCase()] || defaultImages.agricultural;

  const isIconUrl = category.icon?.startsWith('http');
  const isIconEmoji = category.icon && !isIconUrl && category.icon.length < 3;

  const fetchSubcategories = async () => {
    if (subcategories.length > 0) {
      setShowSubcategories(true);
      return;
    }

    setIsLoadingSubcategories(true);
    try {
      const res = await fetch(`/api/categories?parentId=${category._id}`);
      if (res.ok) {
        const data = await res.json();
        setSubcategories(data.categories || []);
      }
    } catch (error) {
      console.error('Failed to fetch subcategories:', error);
    } finally {
      setIsLoadingSubcategories(false);
      setShowSubcategories(true);
    }
  };

  const handleCategoryClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Navigate to products filtered by category slug
    router.push(`/products?category=${category.slug}`);
  };

  const handleSubcategoryClick = (subSlug: string) => {
    router.push(`/products?category=${subSlug}`);
  };

  return (
    <div
      className="category-item group relative flex-shrink-0 w-72 overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer"
      style={{ animationDelay: `${delay}s` }}
      onMouseEnter={fetchSubcategories}
      onMouseLeave={() => setShowSubcategories(false)}
      onClick={handleCategoryClick}
    >
      {/* Background Image */}
      <div className="relative h-48 w-full overflow-hidden bg-muted">
        <Image
          src={imageUrl}
          alt={category.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-110"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
        />

        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Content Overlay - Category Only (Default) */}
      <div
        className={`absolute inset-0 flex flex-col justify-between p-4 text-white transition-opacity duration-300 ${
          showSubcategories ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        {/* Icon Section */}
        <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-white/20 backdrop-blur-sm self-start transform group-hover:scale-110 transition-transform duration-300">
          {isIconUrl ? (
            <Image
              src={category.icon}
              alt=""
              width={24}
              height={24}
              className="object-contain"
            />
          ) : isIconEmoji ? (
            <span className="text-lg">{category.icon}</span>
          ) : (
            <span className="text-lg">📦</span>
          )}
        </div>

        {/* Title and CTA */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold tracking-tight line-clamp-2 group-hover:translate-y-0 transition-transform duration-300">
            {category.name}
          </h3>
          <button
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-md transition-all duration-200 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            DÉCOUVRIR →
          </button>
        </div>
      </div>

      {/* Subcategories Overlay */}
      <div
        className={`absolute inset-0 bg-gradient-to-b from-black/70 to-black/80 p-4 flex flex-col transition-opacity duration-300 ${
          showSubcategories ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <h4 className="text-white text-sm font-semibold mb-3 line-clamp-2">{category.name}</h4>

        {isLoadingSubcategories ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
          </div>
        ) : subcategories.length === 0 ? (
          <p className="text-white/60 text-xs">Aucune sous-catégorie</p>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2">
            {subcategories.map((subcat) => (
              <button
                key={subcat._id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSubcategoryClick(subcat.slug);
                }}
                className="block w-full text-left text-xs text-white/90 hover:text-white hover:bg-white/10 px-2 py-2 rounded transition-colors duration-200 truncate"
              >
                • {subcat.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
