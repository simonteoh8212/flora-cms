"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  Plus,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageCircle,
  Calendar,
  MapPin,
  MessageSquare,
  Loader2,
  FileSpreadsheet,
  Trash2,
  Layers,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  getOrdersAction,
  markOrderAsPaidAction,
  deleteOrderAction,
  getSalesAnalyticsAction,
  SerializedOrder,
  SalesAnalytics,
} from "@/app/admin/order-actions";
import CreateOrderModal from "./CreateOrderModal";
import { formatPrice, cn } from "@/lib/utils";

export default function OrderManagementView() {
  const [orders, setOrders] = useState<SerializedOrder[]>([]);
  const [metrics, setMetrics] = useState<SalesAnalytics>({
    todayRevenue: 0,
    todayOrdersCount: 0,
    monthRevenue: 0,
    monthOrdersCount: 0,
    pendingVerificationCount: 0,
    totalPaidRevenue: 0,
  });

  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING_PAYMENT" | "PAID">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load orders and metrics from server
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, metricsRes] = await Promise.all([
        getOrdersAction({ status: statusFilter, search: searchQuery }),
        getSalesAnalyticsAction(),
      ]);

      if (ordersRes.success && ordersRes.data) {
        setOrders(ordersRes.data.orders);
      }
      if (metricsRes.success && metricsRes.data) {
        setMetrics(metricsRes.data);
      }
    } catch (err: unknown) {
      console.error("Failed to load orders data:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  // Debounce search/filter changes
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      loadData();
      return;
    }

    const timer = setTimeout(() => {
      loadData();
    }, 250);

    return () => clearTimeout(timer);
  }, [statusFilter, searchQuery, loadData]);

  // Handle Mark as Paid & Sync to Google Sheet
  const handleMarkAsPaid = async (order: SerializedOrder) => {
    setVerifyingId(order.id);
    try {
      const res = await markOrderAsPaidAction(order.id);
      if (res.success && res.data) {
        toast.success(
          `Order #${order.orderNumber} confirmed & synced to Google Sheets!`
        );
        // Update local state immediately
        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? res.data! : o))
        );
        // Refresh metrics
        const metricsRes = await getSalesAnalyticsAction();
        if (metricsRes.success && metricsRes.data) {
          setMetrics(metricsRes.data);
        }
      } else {
        toast.error(res.error || "Could not verify payment.");
      }
    } catch {
      toast.error("Failed to update order status.");
    } finally {
      setVerifyingId(null);
    }
  };

  // Handle Delete Order
  const handleDelete = async (id: string, orderNumber: string) => {
    if (!confirm(`Are you sure you want to delete order #${orderNumber}?`)) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await deleteOrderAction(id);
      if (res.success) {
        toast.success(`Removed order #${orderNumber}`);
        setOrders((prev) => prev.filter((o) => o.id !== id));
        const metricsRes = await getSalesAnalyticsAction();
        if (metricsRes.success && metricsRes.data) {
          setMetrics(metricsRes.data);
        }
      } else {
        toast.error(res.error || "Failed to delete order.");
      }
    } catch {
      toast.error("Error deleting order.");
    } finally {
      setDeletingId(null);
    }
  };

  // Google Sheet Webhook link or spreadsheet view link
  const openGoogleSheet = () => {
    const targetUrl =
      process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL
      if(targetUrl)
    window.open(targetUrl, "_blank");
  };

  return (
    <div className="space-y-4">
      {/* Financial Executive Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {/* Today's Sales */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Today&apos;s Sales</p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-lg sm:text-xl font-extrabold text-emerald-700">
              {formatPrice(metrics.todayRevenue)}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
            {metrics.todayOrdersCount} paid {metrics.todayOrdersCount === 1 ? "order" : "orders"}
          </p>
        </div>

        {/* This Month's Revenue */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">This Month</p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-lg sm:text-xl font-extrabold text-slate-900">
              {formatPrice(metrics.monthRevenue)}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
            {metrics.monthOrdersCount} paid this month
          </p>
        </div>

        {/* Pending Verifications */}
        <div className="col-span-2 sm:col-span-1 bg-amber-50/70 rounded-2xl p-3.5 border border-amber-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-amber-900 uppercase tracking-wide">Pending Review</p>
              {metrics.pendingVerificationCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </div>
            <p className="text-lg sm:text-xl font-extrabold text-amber-900 mt-1">
              {metrics.pendingVerificationCount} {metrics.pendingVerificationCount === 1 ? "Order" : "Orders"}
            </p>
          </div>
          <p className="text-[10px] text-amber-700/90 font-medium">
            Awaiting DuitNow verification
          </p>
        </div>
      </div>

      {/* Action Bar & Google Sheet Shortcut */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={openGoogleSheet}
          className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-all flex items-center gap-1.5 border border-emerald-200/80 active:scale-95 shadow-2xs"
          title="Open your linked Google Spreadsheet"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>Open Google Sheet</span>
          <ExternalLink className="w-3 h-3 text-emerald-500" />
        </button>

        <button
          onClick={() => setModalOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Log Order</span>
        </button>
      </div>

      {/* Search & Filter Pills */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer name, phone, or order #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all flex-shrink-0 ${
              statusFilter === "ALL"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>All Orders</span>
          </button>

          <button
            onClick={() => setStatusFilter("PENDING_PAYMENT")}
            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all flex-shrink-0 ${
              statusFilter === "PENDING_PAYMENT"
                ? "bg-amber-600 text-white"
                : "bg-white text-amber-800 border border-amber-200"
            }`}
          >
            <Clock className="w-3 h-3 text-amber-500" />
            <span>Pending Review ({metrics.pendingVerificationCount})</span>
          </button>

          <button
            onClick={() => setStatusFilter("PAID")}
            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all flex-shrink-0 ${
              statusFilter === "PAID"
                ? "bg-emerald-700 text-white"
                : "bg-white text-emerald-700 border border-emerald-200"
            }`}
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>Paid & Synced</span>
          </button>
        </div>
      </div>

      {/* Orders List */}
      {loading && orders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200/80 text-center shadow-ios flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-xs font-semibold text-slate-600">Loading sales records...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 text-center shadow-ios">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <FileSpreadsheet className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No orders found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            {searchQuery || statusFilter !== "ALL"
              ? "No orders match your filter criteria."
              : "No orders logged yet. Tap '+ Log Order' above to record your first floral sale!"}
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-4 px-4 py-2 rounded-2xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-sm transition-all inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" /> Log First Order
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const isPaid = order.status === "PAID";
            const cleanPhone = order.customerPhone.replace(/[^0-9]/g, "");
            const waLink = cleanPhone ? `https://wa.me/${cleanPhone.startsWith("0") ? "6" + cleanPhone : cleanPhone}` : null;

            return (
              <div
                key={order.id}
                className={cn(
                  "bg-white rounded-2xl p-4 border transition-all shadow-ios space-y-3",
                  isPaid ? "border-slate-200/80" : "border-amber-200 bg-amber-50/20"
                )}
              >
                {/* Header: Order Number, Date, Status */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-slate-900 font-mono tracking-tight">
                      #{order.orderNumber}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(order.createdAt).toLocaleDateString("en-MY", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {/* Status Badge */}
                  {isPaid ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>PAID & SYNCED</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" />
                      <span>PENDING VERIFICATION</span>
                    </span>
                  )}
                </div>

                {/* Customer Info & WhatsApp Action */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 truncate">
                      {order.customerName}
                    </h4>
                    {order.customerPhone && (
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {order.customerPhone}
                      </p>
                    )}
                  </div>

                  {waLink && (
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-colors flex items-center gap-1 flex-shrink-0"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                </div>

                {/* Items Ordered */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100/80">
                  <p className="text-xs font-semibold text-slate-800">
                    {order.items}
                  </p>
                  {order.cardMessage && (
                    <div className="mt-1.5 flex items-start gap-1.5 text-[11px] text-slate-500 italic bg-white p-2 rounded-lg border border-slate-100">
                      <MessageSquare className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
                      <span>&ldquo;{order.cardMessage}&rdquo;</span>
                    </div>
                  )}
                </div>

                {/* Delivery Info */}
                {(order.deliverySlot || order.deliveryAddress) && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 text-xs text-slate-600">
                    {order.deliverySlot && (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{order.deliverySlot}</span>
                      </span>
                    )}
                    {order.deliveryAddress && (
                      <span className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{order.deliveryAddress}</span>
                      </span>
                    )}
                  </div>
                )}

                {/* Footer: Price & Confirmation Action */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-xs text-slate-400 font-medium">Total: </span>
                    <span className="text-base font-extrabold text-emerald-700">
                      {formatPrice(order.totalAmount)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Delete button (Super Admin or Master Admin) */}
                    <button
                      onClick={() => handleDelete(order.id, order.orderNumber)}
                      disabled={deletingId === order.id}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete order"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Mark as Paid Action */}
                    {!isPaid ? (
                      <button
                        onClick={() => handleMarkAsPaid(order)}
                        disabled={verifyingId === order.id}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                      >
                        {verifyingId === order.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>Confirm & Sync to Sheet</span>
                      </button>
                    ) : (
                      <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Synced to Google Sheet</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Log Order Modal */}
      <CreateOrderModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onOrderCreated={() => {
          loadData();
        }}
      />
    </div>
  );
}
