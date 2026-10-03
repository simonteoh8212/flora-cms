"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  MessageCircle,
  Sparkles,
  ArrowRight,
  Settings,
} from "lucide-react";
import { SerializedProduct } from "./ProductFormModal";
import { formatPrice } from "@/lib/utils";

interface StorefrontCatalogProps {
  products: SerializedProduct[];
}

export default function StorefrontCatalog({ products }: StorefrontCatalogProps) {
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = [
    "All",
    "Bouquet",
    "Vase",
    "Box",
    "Basket",
    "Dried",
  ];

  const filteredProducts = products.filter((item) => {
    if (selectedCategory === "All") return true;
    return item.category.toLowerCase() === selectedCategory.toLowerCase();
  });

  const generateWhatsAppLink = (product: SerializedProduct) => {
    const text = `Hi Flora Studio! 🌸 I would like to order the "${product.name}" (${formatPrice(
      product.price
    )}). Could you please share delivery options and availability?`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="min-h-screen bg-[#FBFBFC] text-slate-900 pb-20">
      {/* Top Banner Navigation */}
      <header className="sticky top-0 z-30 ios-glass border-b border-slate-200/80">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌸</span>
            <div>
              <span className="text-sm font-black tracking-tight text-slate-900 uppercase">
                Flora Studio
              </span>
              <span className="block text-[10px] text-slate-500 font-medium -mt-0.5">
                Artisan Florist
              </span>
            </div>
          </div>

          <Link
            href="/admin"
            className="px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm shadow-emerald-600/20 flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Florist Admin Portal</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-4 pt-8 pb-6 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Fresh Local Blooms • Same-Day Hand Delivery</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Handcrafted Floral Catalog
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-md mx-auto">
          Explore our seasonal arrangements. Tap any bouquet to order directly through WhatsApp for immediate florist confirmation.
        </p>
      </section>

      {/* Category Filter Pills */}
      <div className="max-w-4xl mx-auto px-4 pb-6">
        <div className="flex items-center justify-center gap-2 overflow-x-auto no-scrollbar py-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs px-4 py-2 rounded-2xl font-semibold transition-all flex-shrink-0 ${
                selectedCategory === cat
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <main className="max-w-4xl mx-auto px-4">
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center max-w-md mx-auto">
            <span className="text-4xl mb-3 block">💐</span>
            <h3 className="text-base font-bold text-slate-800">No blooms in this category</h3>
            <p className="text-xs text-slate-500 mt-1">
              Please check back soon or view all arrangements.
            </p>
            <button
              onClick={() => setSelectedCategory("All")}
              className="mt-4 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-2xl"
            >
              View All Flowers
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProducts.map((product) => {
              const whatsappUrl = generateWhatsAppLink(product);

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-ios hover:shadow-ios-lg transition-all flex flex-col group"
                >
                  {/* Photo Container */}
                  <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Category Tag */}
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-[11px] font-bold text-slate-800 shadow-sm">
                        {product.category}
                      </span>
                    </div>

                    {/* Stock Status Badge */}
                    <div className="absolute top-3 right-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold backdrop-blur-md shadow-sm ${
                          product.isAvailable
                            ? "bg-emerald-500/90 text-white"
                            : "bg-slate-900/80 text-white"
                        }`}
                      >
                        {product.isAvailable ? "In Stock" : "Sold Out"}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-bold text-slate-900 line-clamp-1">
                          {product.name}
                        </h3>
                        <span className="text-base font-extrabold text-emerald-700 whitespace-nowrap">
                          {formatPrice(product.price)}
                        </span>
                      </div>

                      {product.description && (
                        <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>
                      )}
                    </div>

                    {/* WhatsApp Action Button */}
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      {product.isAvailable ? (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2.5 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.98] text-white text-xs font-bold shadow-md shadow-green-500/20 transition-all flex items-center justify-center gap-2"
                        >
                          <MessageCircle className="w-4 h-4 fill-white" />
                          <span>Order on WhatsApp</span>
                        </a>
                      ) : (
                        <button
                          disabled
                          className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 text-slate-400 text-xs font-semibold cursor-not-allowed text-center"
                        >
                          Currently Sold Out
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Customer Footer */}
      <footer className="max-w-4xl mx-auto px-4 mt-16 text-center text-xs text-slate-400 border-t border-slate-200/60 pt-8">
        <p className="font-semibold text-slate-600">Flora Studio • Artisan Florals</p>
        <p className="mt-1">
          Demo storefront powered by Next.js 14, Prisma ORM, and Cloudinary.
        </p>
        <div className="mt-4">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold hover:underline"
          >
            <span>Open Florist Mobile CMS Admin</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </footer>
    </div>
  );
}
