"use client";

import { useState } from "react";
import { X, Plus, Calendar, MapPin, MessageSquare, Phone, User, DollarSign, Loader2, CheckCircle2 } from "lucide-react";
import { createOrderAction, SerializedOrder } from "@/app/admin/order-actions";
import { toast } from "react-toastify";

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (order: SerializedOrder) => void;
}

export default function CreateOrderModal({
  isOpen,
  onClose,
  onOrderCreated,
}: CreateOrderModalProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [items, setItems] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [deliverySlot, setDeliverySlot] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [cardMessage, setCardMessage] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      toast.error("Please enter the customer's name.");
      return;
    }

    if (!items.trim()) {
      toast.error("Please specify the ordered bouquet or items.");
      return;
    }

    if (!totalAmount || isNaN(parseFloat(totalAmount)) || parseFloat(totalAmount) <= 0) {
      toast.error("Please enter a valid total amount.");
      return;
    }

    setLoading(true);
    try {
      const res = await createOrderAction({
        customerName,
        customerPhone,
        items,
        totalAmount,
        deliverySlot,
        deliveryAddress,
        cardMessage,
        status: isPaid ? "PAID" : "PENDING_PAYMENT",
      });

      if (res.success && res.data) {
        toast.success(
          isPaid
            ? `Order #${res.data.orderNumber} created & synced to Google Sheets!`
            : `Order #${res.data.orderNumber} logged as Pending Verification.`
        );
        onOrderCreated(res.data);
        onClose();
        // Reset form
        setCustomerName("");
        setCustomerPhone("");
        setItems("");
        setTotalAmount("");
        setDeliverySlot("");
        setDeliveryAddress("");
        setCardMessage("");
        setIsPaid(false);
      } else {
        toast.error(res.error || "Failed to create order.");
      }
    } catch {
      toast.error("An error occurred while creating order.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shadow-emerald-600/30">
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">Log New Flower Order</h3>
              <p className="text-[11px] text-slate-500">Record a WhatsApp or walk-in floral order</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-3.5 flex-1">
          {/* Customer Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Customer Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sarah Tan"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="e.g. 012-3456789"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Items & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold text-slate-700 mb-1 block">
                Items / Bouquets Ordered *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Emerald Garden Rose (x1)"
                value={items}
                onChange={(e) => setItems(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                Total (RM) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="78.00"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Delivery Slot & Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Delivery Date / Slot
              </label>
              <input
                type="text"
                placeholder="e.g. Tomorrow 2pm - 5pm"
                value={deliverySlot}
                onChange={(e) => setDeliverySlot(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Delivery Address
              </label>
              <input
                type="text"
                placeholder="e.g. Solaris Dutamas, KL (or Self-Pickup)"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Card Message */}
          <div>
            <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
              Greeting Card Message (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Happy Birthday Sarah! Love, Kevin"
              value={cardMessage}
              onChange={(e) => setCardMessage(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 resize-none"
            />
          </div>

          {/* Verified Paid Toggle */}
          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100 cursor-pointer hover:bg-emerald-50 transition-colors">
              <input
                type="checkbox"
                checked={isPaid}
                onChange={(e) => setIsPaid(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300"
              />
              <div className="flex-1">
                <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Payment Verified (Sync to Google Sheets immediately)
                </span>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Check this if the customer has already transferred via DuitNow QR or cash.
                </p>
              </div>
            </label>
          </div>

          {/* Submit Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isPaid ? "Save & Sync to Sheet" : "Log Order"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
