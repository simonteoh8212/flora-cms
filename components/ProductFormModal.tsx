"use client";

import { useState, useRef, useEffect, ChangeEvent, FormEvent } from "react";
import Image from "next/image";
import { X, Camera, Upload, Sparkles, AlertCircle, Loader2 } from "lucide-react";
import { createProduct, updateProduct } from "@/app/admin/actions";

export interface SerializedProduct {
  id: string;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string;
  isAvailable: boolean;
  category: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: SerializedProduct | null;
  onSuccess: () => void;
}

const CATEGORIES = [
  "Bouquet",
  "Vase",
  "Box",
  "Basket",
  "Dried",
  "Single Stem",
  "Bridal",
];

const PRESET_DEMO_PHOTOS = [
  {
    name: "Classic Rose",
    url: "https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Pink Peonies",
    url: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Ceramic Vase",
    url: "https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Sunflower Basket",
    url: "https://images.unsplash.com/photo-1533616688419-b7a585564566?auto=format&fit=crop&w=800&q=80",
  },
];

export default function ProductFormModal({
  isOpen,
  onClose,
  productToEdit,
  onSuccess,
}: ProductFormModalProps) {
  const isEditing = Boolean(productToEdit);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(productToEdit?.name || "");
  const [description, setDescription] = useState(productToEdit?.description || "");
  const [price, setPrice] = useState(productToEdit?.price || "");
  const [category, setCategory] = useState(productToEdit?.category || "Bouquet");
  const [isAvailable, setIsAvailable] = useState(
    productToEdit ? productToEdit.isAvailable : true
  );

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(
    productToEdit?.imageUrl || ""
  );
  const [imageUrlDirect, setImageUrlDirect] = useState<string>(
    productToEdit?.imageUrl || ""
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setErrorMessage("Please select a valid image file.");
        return;
      }
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setImageUrlDirect(""); // Clear manual url if file is selected
      setErrorMessage(null);
    }
  };

  const handleSelectPreset = (url: string) => {
    setImageFile(null);
    setPreviewUrl(url);
    setImageUrlDirect(url);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage("Please enter the product name.");
      return;
    }

    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      setErrorMessage("Please enter a valid price (e.g. 45.00).");
      return;
    }

    if (!imageFile && !imageUrlDirect && !previewUrl) {
      setErrorMessage("Please upload a photo of the flower arrangement.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("description", description.trim());
      formData.append("price", price.trim());
      formData.append("category", category);
      formData.append("isAvailable", isAvailable ? "true" : "false");

      if (imageFile) {
        formData.append("image", imageFile);
      } else if (imageUrlDirect) {
        formData.append("imageUrl", imageUrlDirect);
      }

      let res;
      if (isEditing && productToEdit) {
        res = await updateProduct(productToEdit.id, formData);
      } else {
        res = await createProduct(formData);
      }

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage(res.error || "Failed to save product.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
    >
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* iOS Grabber for mobile sheet */}
        <div className="flex sm:hidden justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isEditing ? "Edit Floral Item" : "Add New Arrangement"}
            </h2>
            <p className="text-xs text-slate-500">
              {isEditing ? "Update details & stock status" : "Capture photo & publish to catalog"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Photo Upload Card */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Flower Photo (Cloudinary)
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            {previewUrl ? (
              <div className="relative group rounded-2xl overflow-hidden border border-emerald-200 bg-slate-50 aspect-video flex items-center justify-center">
                <Image
                  src={previewUrl}
                  alt="Flower preview"
                  fill
                  className="object-cover"
                  unoptimized={previewUrl.startsWith("blob:")}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white text-slate-800 text-xs font-medium rounded-full shadow-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5 text-emerald-600" />
                    Change Photo
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-2xl p-6 flex flex-col items-center justify-center bg-emerald-50/50 hover:bg-emerald-50 transition-all text-center group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-sm">
                  <Camera className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  Tap to Take Photo or Choose File
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Optimized automatically via Cloudinary
                </p>
              </button>
            )}

            {/* Quick Demo Presets (helpful before Cloudinary keys are wired up) */}
            <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 flex-shrink-0">
                <Sparkles className="w-3 h-3 text-emerald-600" /> Quick samples:
              </span>
              {PRESET_DEMO_PHOTOS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleSelectPreset(preset.url)}
                  className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 rounded-full flex-shrink-0 transition-colors"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Arrangement Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Emerald Garden Rose Delight"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`text-xs px-3.5 py-2 rounded-xl font-medium transition-all ${
                    category === cat
                      ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Price & Availability Row */}
          <div className="grid grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Price (USD) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="65.00"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  className="w-full pl-8 pr-3 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* In Stock Toggle */}
            <div className="pt-5">
              <label className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                <div>
                  <span className="text-xs font-semibold text-slate-800 block">
                    In Stock
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {isAvailable ? "Ready to sell" : "Marked Out of Stock"}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isAvailable}
                  onChange={(e) => setIsAvailable(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${
                    isAvailable ? "bg-emerald-600" : "bg-slate-300"
                  }`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${
                      isAvailable ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </div>
              </label>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Stem types, flower care note, packaging style..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
            />
          </div>

          {/* Modal Action Buttons */}
          <div className="pt-2 pb-4 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3.5 px-4 rounded-2xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-sm font-semibold shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{imageFile ? "Uploading & Saving..." : "Saving..."}</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>{isEditing ? "Update Product" : "Save & Publish"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
