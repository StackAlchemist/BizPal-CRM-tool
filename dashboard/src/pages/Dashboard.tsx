/**
 * DASHBOARD PAGE
 * --------------
 * Shows high-level stats (customers, orders, revenue) and recent orders.
 * Data is fetched once on mount using React Query and cached for 30 seconds.
 */

import { useQuery } from "@tanstack/react-query";
import { ordersApi, customersApi } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Order } from "../types";
import { Link } from "react-router-dom";

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card flex flex-col gap-1">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-100">{value}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    Pending:   "badge badge-pending",
    Paid:      "badge badge-paid",
    Delivered: "badge badge-delivered",
  };
  return <span className={cls[status] ?? "badge"}>{status}</span>;
}

export default function Dashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["stats"],
    queryFn:  () => ordersApi.stats().then((r) => r.data),
    staleTime: 30_000,
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["orders", "recent"],
    queryFn:  () => ordersApi.list().then((r) => r.data as Order[]),
    staleTime: 30_000,
  });

  const recentOrders = orders?.slice(0, 5) ?? [];

  return (
    <div className="p-6 max-w-5xl">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-100">
          Good day, {user?.businessName} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1">Here's what's happening with your business.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {statsLoading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse h-20 bg-surface-card" />
          ))
        ) : (
          <>
            <StatCard
              label="Total customers"
              value={stats?.totalCustomers?.toLocaleString() ?? "0"}
              sub="All time"
            />
            <StatCard
              label="Total orders"
              value={stats?.totalOrders?.toLocaleString() ?? "0"}
              sub="All time"
            />
            <StatCard
              label="Revenue"
              value={`₦${(stats?.totalRevenue ?? 0).toLocaleString("en-NG")}`}
              sub="Paid + Delivered orders"
            />
          </>
        )}
      </div>

      {/* Recent orders table */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <h2 className="text-sm font-semibold text-gray-100">Recent orders</h2>
          <Link to="/orders" className="text-xs text-brand hover:underline">View all →</Link>
        </div>

        {ordersLoading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading...</div>
        ) : recentOrders.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No orders yet.{" "}
            <Link to="/customers" className="text-brand hover:underline">
              Save a customer first →
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3">Customer</th>
                <th className="text-left px-5 py-3">Product</th>
                <th className="text-left px-5 py-3">Amount</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => {
                const customer = typeof order.customerId === "object" ? order.customerId : null;
                return (
                  <tr
                    key={order._id}
                    className="border-b border-surface-border/50 hover:bg-surface-hover transition-colors"
                  >
                    <td className="px-5 py-3 text-gray-200">
                      {customer?.name ?? "Unknown"}
                    </td>
                    <td className="px-5 py-3 text-gray-300">{order.productName}</td>
                    <td className="px-5 py-3 text-gray-300 font-medium">
                      ₦{order.amount.toLocaleString("en-NG")}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString("en-NG", {
                        day: "numeric", month: "short",
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
