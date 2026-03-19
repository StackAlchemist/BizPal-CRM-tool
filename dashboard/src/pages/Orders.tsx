/**
 * ORDERS PAGE
 * -----------
 * - Lists all orders with status filtering
 * - Inline status update (Pending → Paid → Delivered) via dropdown
 * - Add new orders via a slide-in form that fetches the customer list
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersApi, customersApi } from "../lib/api";
import { Order, OrderStatus, Customer } from "../types";

const STATUS_OPTIONS: OrderStatus[] = ["Pending", "Paid", "Delivered"];

function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    Pending:   "badge badge-pending",
    Paid:      "badge badge-paid",
    Delivered: "badge badge-delivered",
  };
  return <span className={cls[status] ?? "badge"}>{status}</span>;
}

// ── Inline status dropdown ─────────────────────────────────────
function StatusSelect({ order }: { order: Order }) {
  const qc = useQueryClient();
  const update = useMutation({
    mutationFn: (status: string) => ordersApi.updateStatus(order._id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });

  return (
    <select
      value={order.status}
      onChange={(e) => update.mutate(e.target.value)}
      disabled={update.isPending}
      onClick={(e) => e.stopPropagation()} // don't trigger row click
      className="bg-surface-input border border-surface-border text-xs text-gray-300
                 rounded-md px-2 py-1 outline-none focus:border-brand cursor-pointer
                 disabled:opacity-50"
    >
      {STATUS_OPTIONS.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}

// ── Add Order Form ─────────────────────────────────────────────
function AddOrderForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [customerId, setCustomerId] = useState("");
  const [product, setProduct]       = useState("");
  const [amount, setAmount]         = useState("");
  const [notes, setNotes]           = useState("");
  const [error, setError]           = useState("");

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => customersApi.list().then((r) => r.data as Customer[]),
  });

  const create = useMutation({
    mutationFn: () =>
      ordersApi.create({
        customerId,
        productName: product,
        amount: Number(amount),
        notes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.message || "Failed to create order"),
  });

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <aside className="w-80 bg-surface-card border-l border-surface-border flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <h2 className="text-sm font-semibold text-gray-100">New order</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-200 text-lg">×</button>
        </div>

        <div className="p-5 flex flex-col gap-4 flex-1">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Customer *</label>
            <select
              className="input"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">Select a customer...</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} · {c.phone}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Product / service *</label>
            <input className="input" placeholder="e.g. Ankara 3-piece set" value={product} onChange={(e) => setProduct(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Amount (₦) *</label>
            <input className="input" type="number" placeholder="e.g. 45000" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Notes</label>
            <textarea className="input resize-none" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <div className="p-5 border-t border-surface-border">
          <button
            onClick={() => create.mutate()}
            disabled={create.isPending || !customerId || !product || !amount}
            className="btn-primary w-full"
          >
            {create.isPending ? "Creating..." : "Create order"}
          </button>
        </div>
      </aside>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────
export default function Orders() {
  const [statusFilter, setStatus] = useState("");
  const [adding, setAdding]       = useState(false);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders", statusFilter],
    queryFn: () =>
      ordersApi
        .list({ status: statusFilter || undefined })
        .then((r) => r.data as Order[]),
  });

  const qc = useQueryClient();
  const remove = useMutation({
    mutationFn: (id: string) => ordersApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });

  const totalShown = orders.reduce((sum, o) => sum + o.amount, 0);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {orders.length} orders · ₦{totalShown.toLocaleString("en-NG")} total
          </p>
        </div>
        <button onClick={() => setAdding(true)} className="btn-primary">
          + New order
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 mb-4 bg-surface-card border border-surface-border
                      rounded-lg p-1 w-fit">
        {["", ...STATUS_OPTIONS].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              statusFilter === s
                ? "bg-surface-input text-gray-100"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">No orders found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3">Customer</th>
                <th className="text-left px-5 py-3">Product</th>
                <th className="text-left px-5 py-3">Amount</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Date</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const customer = typeof order.customerId === "object" ? order.customerId : null;
                return (
                  <tr
                    key={order._id}
                    className="border-b border-surface-border/50 hover:bg-surface-hover transition-colors"
                  >
                    <td className="px-5 py-3 text-gray-100 font-medium">
                      {customer?.name ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-gray-300">{order.productName}</td>
                    <td className="px-5 py-3 text-gray-200 font-medium">
                      ₦{order.amount.toLocaleString("en-NG")}
                    </td>
                    <td className="px-5 py-3">
                      <StatusSelect order={order} />
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString("en-NG", {
                        day: "numeric", month: "short",
                      })}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => {
                          if (confirm("Delete this order?")) remove.mutate(order._id);
                        }}
                        className="text-xs text-gray-600 hover:text-red-400 transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {adding && <AddOrderForm onClose={() => setAdding(false)} />}
    </div>
  );
}
