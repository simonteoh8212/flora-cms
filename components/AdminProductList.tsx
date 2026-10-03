"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Sparkles,
  CheckCircle2,
  XCircle,
  Package,
  Layers,
  UserPlus,
  LogOut,
  Users,
  ShieldAlert,
  Crown,
  Shield,
  Loader2,
} from "lucide-react";
import ProductFormModal, { SerializedProduct } from "./ProductFormModal";
import TeamManagementModal from "./TeamManagementModal";
import RoleManagementModal from "./RoleManagementModal";
import {
  toggleProductAvailability,
  deleteProduct,
  seedDemoProducts,
} from "@/app/admin/actions";
import { logoutAction } from "@/app/auth/actions";
import { formatPrice } from "@/lib/utils";

export interface UserPermissions {
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageTeam: boolean;
  canManageRoles: boolean;
  roleName: string;
}

interface AdminProductListProps {
  initialProducts: SerializedProduct[];
  currentUser?: {
    username: string;
    role: string;
    roleName?: string;
  } | null;
  permissions?: UserPermissions;
}

export default function AdminProductList({
  initialProducts,
  currentUser,
  permissions,
}: AdminProductListProps) {
  const perms: UserPermissions = permissions || {
    canView: true,
    canAdd: currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "MASTER_ADMIN",
    canEdit: true,
    canDelete: currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "MASTER_ADMIN",
    canManageTeam: currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "MASTER_ADMIN",
    canManageRoles: currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "MASTER_ADMIN",
    roleName: currentUser?.role || "Staff",
  };

  const [products, setProducts] = useState<SerializedProduct[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [stockFilter, setStockFilter] = useState<"ALL" | "IN_STOCK" | "OUT_OF_STOCK">("ALL");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SerializedProduct | null>(null);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [seedingLoading, setSeedingLoading] = useState(false);
  const [navigatingRegister, setNavigatingRegister] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Available categories derived from products or default set
  const categories = [
    "All",
    "Bouquet",
    "Vase",
    "Box",
    "Basket",
    "Dried",
  ];

  // Filtering products
  const filteredProducts = products.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === "All" ||
      item.category.toLowerCase() === selectedCategory.toLowerCase();

    const matchesStock =
      stockFilter === "ALL" ||
      (stockFilter === "IN_STOCK" && item.isAvailable) ||
      (stockFilter === "OUT_OF_STOCK" && !item.isAvailable);

    return matchesSearch && matchesCategory && matchesStock;
  });

  const inStockCount = products.filter((p) => p.isAvailable).length;
  const outOfStockCount = products.filter((p) => !p.isAvailable).length;

  // Handle instant optimistic toggle for availability
  const handleToggleStock = async (product: SerializedProduct) => {
    const newStatus = !product.isAvailable;

    // Optimistic UI update
    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id ? { ...p, isAvailable: newStatus } : p
      )
    );

    const res = await toggleProductAvailability(product.id, newStatus);
    if (!res.success) {
      console.warn("Stock toggle notice:", res.error);
      // In demo mode without DB, keep the local toggle visual
      if (!product.id.startsWith("sample-")) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === product.id ? { ...p, isAvailable: !newStatus } : p
          )
        );
        alert(res.error || "Failed to update stock status.");
      }
    }
  };

  // Handle delete
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}" from your catalog?`)) {
      return;
    }

    setDeletingId(id);
    const res = await deleteProduct(id);
    setDeletingId(null);

    if (res.success || id.startsWith("sample-")) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } else {
      alert(res.error || "Failed to delete product.");
    }
  };

  // Handle seed demo items
  const handleSeedCatalog = async () => {
    setSeedingLoading(true);
    const res = await seedDemoProducts();
    setSeedingLoading(false);
    if (res.success) {
      window.location.reload();
    } else {
      alert(res.error || "Could not seed catalog.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-28">
      {/* iOS Top App Header */}
      <header className="sticky top-0 z-30 ios-glass border-b border-slate-200/80 transition-all">
        <div className="max-w-xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-600/30">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-bold tracking-tight text-slate-900 leading-tight">
                  Flora Studio
                </h1>
                {currentUser?.role === "SUPER_ADMIN" ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-0.5">
                    <ShieldAlert className="w-2.5 h-2.5" />
                    <span>Dev</span>
                  </span>
                ) : currentUser?.role === "MASTER_ADMIN" ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-0.5">
                    <Crown className="w-2.5 h-2.5" />
                    <span>Owner</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {currentUser?.roleName || "Staff"}
                  </span>
                )}
              </div>
              <p className="text-[11px] font-medium text-emerald-700 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {currentUser?.username
                  ? `@${currentUser.username} • ${perms.roleName || "Florist Staff"}`
                  : "Mobile Catalog Manager"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Role & Permission Modules (Super Admin & Master Admin only) */}
            {perms.canManageRoles && (
              <button
                onClick={() => setRoleModalOpen(true)}
                className="p-2 rounded-full text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
                title="Role & Permission Modules"
              >
                <Shield className="w-4 h-4 text-indigo-600" />
              </button>
            )}

            {/* Team & Password Management */}
            {perms.canManageTeam && (
              <button
                onClick={() => setTeamModalOpen(true)}
                className="p-2 rounded-full text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                title="Team & Access Control"
              >
                <Users className="w-4 h-4" />
              </button>
            )}

            {/* Register New Account */}
            {perms.canManageTeam && (
              <Link
                href="/register"
                onClick={() => setNavigatingRegister(true)}
                className="p-2 rounded-full text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors relative"
                title={
                  currentUser?.role === "SUPER_ADMIN"
                    ? "Create Florist Owner or Staff"
                    : "Register Florist Staff"
                }
              >
                {navigatingRegister ? (
                  <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
              </Link>
            )}

            <button
              onClick={async () => {
                setIsLoggingOut(true);
                await logoutAction();
              }}
              disabled={isLoggingOut}
              className="p-2 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Log out"
            >
              {isLoggingOut ? (
                <Loader2 className="w-4 h-4 text-rose-500 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
            </button>

            {/* Top Bar New Item Button (Rendered only if role has canAdd permission) */}
            {perms.canAdd && (
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-emerald-600/20 active:scale-95 ml-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Item</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Inventory Metrics Pills */}
        <div className="max-w-xl mx-auto px-4 pb-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setStockFilter("ALL")}
            className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all flex-shrink-0 ${
              stockFilter === "ALL"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>All ({products.length})</span>
          </button>

          <button
            onClick={() => setStockFilter("IN_STOCK")}
            className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all flex-shrink-0 ${
              stockFilter === "IN_STOCK"
                ? "bg-emerald-700 text-white"
                : "bg-white text-emerald-700 border border-emerald-200"
            }`}
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>In Stock ({inStockCount})</span>
          </button>

          <button
            onClick={() => setStockFilter("OUT_OF_STOCK")}
            className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all flex-shrink-0 ${
              stockFilter === "OUT_OF_STOCK"
                ? "bg-slate-800 text-white"
                : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            <XCircle className="w-3 h-3 text-rose-500" />
            <span>Sold Out ({outOfStockCount})</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-xl mx-auto px-4 pt-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search flower arrangements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm transition-all"
          />
        </div>

        {/* Category Horizontal Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs px-3.5 py-1.5 rounded-xl font-medium transition-all flex-shrink-0 ${
                selectedCategory === cat
                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
                  : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Cards List */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 text-center shadow-ios mt-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Package className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No flowers found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              {searchQuery || selectedCategory !== "All"
                ? "Try adjusting your search or category filter."
                : "Your florist catalog is currently empty. Tap below to add your first floral arrangement or load demo items."}
            </p>

            <div className="mt-5 flex flex-col sm:flex-row gap-2.5 justify-center">
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-2xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add First Product
              </button>

              {products.length === 0 && (
                <button
                  onClick={handleSeedCatalog}
                  disabled={seedingLoading}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  {seedingLoading ? "Seeding..." : "Load 6 Sample Bouquets"}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className={`bg-white rounded-2xl p-3 border transition-all shadow-ios flex items-center gap-3.5 ${
                  product.isAvailable
                    ? "border-slate-200/80"
                    : "border-slate-200 opacity-75 bg-slate-50/70"
                }`}
              >
                {/* Product Thumbnail */}
                <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-100">
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                  {!product.isAvailable && (
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white bg-slate-900/80 px-1.5 py-0.5 rounded">
                        Sold Out
                      </span>
                    </div>
                  )}
                </div>

                {/* Product Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-semibold tracking-wide uppercase">
                      {product.category}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 truncate mt-0.5">
                    {product.name}
                  </h3>

                  {product.description && (
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {product.description}
                    </p>
                  )}

                  <div className="mt-1 flex items-center gap-3">
                    <span className="text-sm font-bold text-emerald-700">
                      {formatPrice(product.price)}
                    </span>
                  </div>
                </div>

                {/* Actions & iOS Switch */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  {/* Stock Toggle Switch (active only if canEdit) */}
                  <label
                    className={`flex items-center gap-1.5 select-none ${
                      perms.canEdit ? "cursor-pointer" : "cursor-not-allowed opacity-75"
                    }`}
                  >
                    <span className="text-[11px] font-medium text-slate-500 hidden sm:inline">
                      {product.isAvailable ? "In Stock" : "Out"}
                    </span>
                    <input
                      type="checkbox"
                      checked={product.isAvailable}
                      disabled={!perms.canEdit}
                      onChange={() => perms.canEdit && handleToggleStock(product)}
                      className="sr-only"
                    />
                    <div
                      className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                        product.isAvailable ? "bg-emerald-600" : "bg-slate-300"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                          product.isAvailable ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </div>
                  </label>

                  {/* Edit & Delete Icons (Strictly conditional based on role permissions) */}
                  {(perms.canEdit || perms.canDelete) && (
                    <div className="flex items-center gap-1">
                      {perms.canEdit && (
                        <button
                          onClick={() => {
                            setEditingProduct(product);
                            setModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          title="Edit flower details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* If role does not have delete permission (e.g. Staff), Delete button is NOT rendered */}
                      {perms.canDelete && (
                        <button
                          onClick={() => handleDelete(product.id, product.name)}
                          disabled={deletingId === product.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete flower"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* iOS Fixed Bottom Navigation / Action Bar (Shown only if role has canAdd permission) */}
      {perms.canAdd && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 ios-glass border-t border-slate-200/80">
          <div className="max-w-xl mx-auto">
            <button
              onClick={() => {
                setEditingProduct(null);
                setModalOpen(true);
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-sm font-bold shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              <span>Add New Flower</span>
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      <ProductFormModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingProduct(null);
        }}
        productToEdit={editingProduct}
        onSuccess={() => {
          window.location.reload();
        }}
      />

      {/* Team Management & Password Reset Modal */}
      <TeamManagementModal
        isOpen={teamModalOpen}
        onClose={() => setTeamModalOpen(false)}
      />

      {/* Role & Permission Modules Modal */}
      {perms.canManageRoles && (
        <RoleManagementModal
          isOpen={roleModalOpen}
          onClose={() => setRoleModalOpen(false)}
          currentUserRole={currentUser?.role}
          onRoleChanged={() => window.location.reload()}
        />
      )}
    </div>
  );
}
