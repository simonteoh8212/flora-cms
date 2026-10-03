"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "react-toastify";
import ProductFormModal, { SerializedProduct } from "./ProductFormModal";
import TeamManagementModal from "./TeamManagementModal";
import RoleManagementModal from "./RoleManagementModal";
import {
  toggleProductAvailability,
  deleteProduct,
  seedDemoProducts,
  getPaginatedProductsAction,
} from "@/app/admin/actions";
import { logoutAction } from "@/app/auth/actions";
import { formatPrice, cn } from "@/lib/utils";

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
  initialTotalCount?: number;
  initialInStockCount?: number;
  initialOutOfStockCount?: number;
  currentUser?: {
    username: string;
    role: string;
    roleName?: string;
  } | null;
  permissions?: UserPermissions;
}

export default function AdminProductList({
  initialProducts,
  initialTotalCount,
  initialInStockCount,
  initialOutOfStockCount,
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
  const [totalCount, setTotalCount] = useState<number>(
    initialTotalCount ?? initialProducts.length
  );
  const [inStockCount, setInStockCount] = useState<number>(
    initialInStockCount ?? initialProducts.filter((p) => p.isAvailable).length
  );
  const [outOfStockCount, setOutOfStockCount] = useState<number>(
    initialOutOfStockCount ?? initialProducts.filter((p) => !p.isAvailable).length
  );
  const [isLoadingPage, setIsLoadingPage] = useState(false);

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

  // Pagination State - items loaded page by page from DB
  const ITEMS_PER_PAGE = 5;
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + products.length, totalCount);

  // Fetch page by page from the server action with skip and take
  const fetchPage = useCallback(
    async (
      page: number,
      search: string = searchQuery,
      category: string = selectedCategory,
      stock: "ALL" | "IN_STOCK" | "OUT_OF_STOCK" = stockFilter
    ) => {
      setIsLoadingPage(true);
      try {
        const res = await getPaginatedProductsAction({
          page,
          pageSize: ITEMS_PER_PAGE,
          search,
          category,
          stock,
        });

        if (res.success && res.data) {
          setProducts(res.data.products);
          setTotalCount(res.data.totalCount);
          setInStockCount(res.data.inStockCount);
          setOutOfStockCount(res.data.outOfStockCount);
          setCurrentPage(page);
        } else if (res.error) {
          toast.error(res.error);
        }
      } catch (err: unknown) {
        console.error("Failed to load products page:", err);
      } finally {
        setIsLoadingPage(false);
      }
    },
    [searchQuery, selectedCategory, stockFilter, ITEMS_PER_PAGE]
  );

  // Debounced effect for search / category / stock filters
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      fetchPage(1, searchQuery, selectedCategory, stockFilter);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, stockFilter, fetchPage]);

  const handlePageChange = (page: number) => {
    const target = Math.max(1, Math.min(page, totalPages));
    if (target === currentPage && !isLoadingPage) return;
    fetchPage(target, searchQuery, selectedCategory, stockFilter);
    window.scrollTo({ top: 100, behavior: "smooth" });
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (safeCurrentPage <= 3) {
        pages.push(1, 2, 3, "...", totalPages);
      } else if (safeCurrentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", safeCurrentPage, "...", totalPages);
      }
    }
    return pages;
  };

  // Handle instant optimistic toggle for availability
  const handleToggleStock = async (product: SerializedProduct) => {
    const newStatus = !product.isAvailable;

    // Optimistic UI update
    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id ? { ...p, isAvailable: newStatus } : p
      )
    );
    setInStockCount((prev) => (newStatus ? prev + 1 : Math.max(0, prev - 1)));
    setOutOfStockCount((prev) => (newStatus ? Math.max(0, prev - 1) : prev + 1));

    const res = await toggleProductAvailability(product.id, newStatus);
    if (res.success) {
      toast.info(
        newStatus
          ? `"${product.name}" marked as In Stock`
          : `"${product.name}" marked as Out of Stock`,
        { autoClose: 2000 }
      );
      if (stockFilter !== "ALL") {
        fetchPage(currentPage);
      }
    } else {
      console.warn("Stock toggle notice:", res.error);
      // In demo mode without DB, keep the local toggle visual
      if (!product.id.startsWith("sample-")) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === product.id ? { ...p, isAvailable: !newStatus } : p
          )
        );
        setInStockCount((prev) => (newStatus ? Math.max(0, prev - 1) : prev + 1));
        setOutOfStockCount((prev) => (newStatus ? prev + 1 : Math.max(0, prev - 1)));
        toast.error(res.error || "Failed to update stock status.");
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
      toast.success(`Removed "${name}" from catalog.`);
      const nextPage = products.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
      fetchPage(nextPage);
    } else {
      toast.error(res.error || "Failed to delete product.");
    }
  };

  // Handle seed demo items
  const handleSeedCatalog = async () => {
    setSeedingLoading(true);
    const res = await seedDemoProducts();
    setSeedingLoading(false);
    if (res.success) {
      toast.success("Starter flower catalog seeded successfully!");
      fetchPage(1);
    } else {
      toast.error(res.error || "Could not seed catalog.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-28">
      {/* iOS Top App Header */}
      <header className="sticky top-0 z-30 ios-glass border-b border-slate-200/80 transition-all">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-600/30 flex-shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-nowrap">
                <h1 className="text-base font-bold tracking-tight text-slate-900 leading-tight whitespace-nowrap">
                  Flora Studio
                </h1>
                {currentUser?.role === "SUPER_ADMIN" ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-0.5 flex-shrink-0">
                    <ShieldAlert className="w-2.5 h-2.5" />
                    <span>Dev</span>
                  </span>
                ) : currentUser?.role === "MASTER_ADMIN" ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-0.5 flex-shrink-0">
                    <Crown className="w-2.5 h-2.5" />
                    <span>Owner</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex-shrink-0">
                    {currentUser?.roleName || "Staff"}
                  </span>
                )}
              </div>
              <p className="text-[11px] font-medium text-emerald-700 flex items-center gap-1 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                <span className="truncate">{currentUser?.username ? `@${currentUser.username}` : "Online"}</span>
                <span className="text-slate-300 hidden sm:inline">•</span>
                <span className="text-slate-500 hidden sm:inline truncate">{perms.roleName || "Florist Staff"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* iOS Grouped Toolbar for Admin Controls */}
            <div className="flex items-center bg-slate-100/90 p-0.5 sm:p-1 rounded-2xl border border-slate-200/70 shadow-2xs">
              {/* Role & Permission Modules (Super Admin & Master Admin only) */}
              {perms.canManageRoles && (
                <button
                  onClick={() => setRoleModalOpen(true)}
                  className="p-1.5 sm:p-2 rounded-xl text-slate-600 hover:text-indigo-700 hover:bg-white active:scale-95 transition-all"
                  title="Role & Permission Modules"
                >
                  <Shield className="w-4 h-4 text-indigo-600" />
                </button>
              )}

              {/* Team & Password Management */}
              {perms.canManageTeam && (
                <button
                  onClick={() => setTeamModalOpen(true)}
                  className="p-1.5 sm:p-2 rounded-xl text-slate-600 hover:text-emerald-700 hover:bg-white active:scale-95 transition-all"
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
                  className="p-1.5 sm:p-2 rounded-xl text-slate-600 hover:text-emerald-700 hover:bg-white active:scale-95 transition-all relative"
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

              {/* Logout Button */}
              <button
                onClick={async () => {
                  setIsLoggingOut(true);
                  await logoutAction();
                }}
                disabled={isLoggingOut}
                className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-white active:scale-95 transition-all"
                title="Log out"
              >
                {isLoggingOut ? (
                  <Loader2 className="w-4 h-4 text-rose-500 animate-spin" />
                ) : (
                  <LogOut className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Desktop "New Item" button (Hidden on mobile because mobile uses the fixed bottom action bar) */}
            {perms.canAdd && (
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setModalOpen(true);
                }}
                className="hidden sm:flex px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold items-center gap-1.5 transition-all shadow-sm shadow-emerald-600/20 active:scale-95"
              >
                <Plus className="w-4 h-4" />
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
            <span>All ({inStockCount + outOfStockCount})</span>
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
        {isLoadingPage && products.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-slate-200/80 text-center shadow-ios mt-4 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            <p className="text-xs font-semibold text-slate-600">Loading flowers...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 text-center shadow-ios mt-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Package className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No flowers found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              {searchQuery || selectedCategory !== "All" || stockFilter !== "ALL"
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

              {totalCount === 0 && (
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
          <div className={cn("space-y-3 transition-opacity duration-200 relative", isLoadingPage && "opacity-60 pointer-events-none")}>
            {isLoadingPage && (
              <div className="absolute inset-0 bg-white/40 backdrop-blur-[0.5px] z-10 flex items-center justify-center rounded-2xl">
                <div className="bg-slate-900/80 text-white px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-semibold shadow-lg">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>Loading page...</span>
                </div>
              </div>
            )}
            {products.map((product) => (
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

            {/* Numbered Pagination Controls */}
            {totalPages > 1 && (
              <div className="pt-5 pb-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200/80">
                {/* Items Counter Summary */}
                <p className="text-xs text-slate-500 font-medium order-2 sm:order-1">
                  Showing <span className="font-semibold text-slate-800">{totalCount > 0 ? startIndex + 1 : 0}–{endIndex}</span> of{" "}
                  <span className="font-semibold text-slate-800">{totalCount}</span> items
                </p>

                {/* Numbered Page Buttons */}
                <div className="flex items-center gap-1.5 order-1 sm:order-2">
                  {/* Previous Page Button */}
                  <button
                    onClick={() => handlePageChange(safeCurrentPage - 1)}
                    disabled={safeCurrentPage === 1 || isLoadingPage}
                    className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs active:scale-95"
                    title="Previous Page"
                    aria-label="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Page Number Pills */}
                  {getPageNumbers().map((page, idx) => {
                    if (page === "...") {
                      return (
                        <span
                          key={`ellipsis-${idx}`}
                          className="px-2 py-1 text-slate-400 text-xs font-semibold select-none"
                        >
                          ...
                        </span>
                      );
                    }

                    const pageNum = page as number;
                    const isActive = pageNum === safeCurrentPage;

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        disabled={isLoadingPage}
                        className={`min-w-[34px] h-[34px] px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center select-none active:scale-95 ${
                          isActive
                            ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
                            : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs"
                        }`}
                        aria-current={isActive ? "page" : undefined}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  {/* Next Page Button */}
                  <button
                    onClick={() => handlePageChange(safeCurrentPage + 1)}
                    disabled={safeCurrentPage === totalPages || isLoadingPage}
                    className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs active:scale-95"
                    title="Next Page"
                    aria-label="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
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
          fetchPage(editingProduct ? currentPage : 1);
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
