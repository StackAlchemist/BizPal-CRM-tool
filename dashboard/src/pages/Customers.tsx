/**
 * CUSTOMERS PAGE
 * --------------
 * - Lists all customers with search and tag filtering
 * - Click a customer to open a detail panel (edit name/phone/tags/notes)
 * - Add new customers manually via a slide-in form
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customersApi } from "../lib/api";
import { Customer } from "../types";

const COMMON_TAGS = ["New", "VIP", "Returning", "Wholesale", "Priority"];

function TagBadge({ tag }: { tag: string }) {
  return <span className="tag">{tag}</span>;
}

// ── Customer Detail / Edit Panel ───────────────────────────────
function CustomerPanel({
  customer,
  onClose,
}: {
  customer: Customer;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName]     = useState(customer.name);
  const [phone, setPhone]   = useState(customer.phone);
  const [tags, setTags]     = useState<string[]>(customer.tags);
  const [notes, setNotes]   = useState(customer.notes);
  const [saved, setSaved]   = useState(false);

  const update = useMutation({
    mutationFn: () => customersApi.update(customer._id, { name, phone, tags, notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const remove = useMutation({
    mutationFn: () => customersApi.delete(customer._id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      onClose();
    },
  });

  const toggleTag = (tag: string) =>
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <aside className="w-80 bg-surface-card border-l border-surface-border
                        flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <h2 className="text-sm font-semibold text-gray-100">Customer detail</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-200 text-lg">×</button>
        </div>

        <div className="p-5 flex flex-col gap-4 flex-1">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Phone</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-2">Tags</label>
            <div className="flex flex-wrap gap-2">
              {COMMON_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`tag cursor-pointer transition-colors ${
                    tags.includes(tag)
                      ? "bg-brand/20 text-brand border-brand/40"
                      : ""
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Notes</label>
            <textarea
              className="input resize-none"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about this customer..."
            />
          </div>

          <p className="text-xs text-gray-600">
            Added {new Date(customer.createdAt).toLocaleDateString("en-NG", {
              day: "numeric", month: "long", year: "numeric",
            })}
          </p>
        </div>

        <div className="p-5 border-t border-surface-border flex gap-2">
          <button
            onClick={() => update.mutate()}
            disabled={update.isPending}
            className="btn-primary flex-1"
          >
            {saved ? "Saved!" : update.isPending ? "Saving..." : "Save changes"}
          </button>
          <button
            onClick={() => { if (confirm("Delete this customer?")) remove.mutate(); }}
            className="btn-danger px-3"
            disabled={remove.isPending}
          >
            Delete
          </button>
        </div>
      </aside>
    </div>
  );
}

// ── Add Customer Form ──────────────────────────────────────────
function AddCustomerForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName]   = useState("");
  const [phone, setPhone] = useState("");
  const [tags, setTags]   = useState<string[]>(["New"]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const create = useMutation({
    mutationFn: () => customersApi.create({ name, phone, tags, notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.message || "Failed to create"),
  });

  const toggleTag = (tag: string) =>
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <aside className="w-80 bg-surface-card border-l border-surface-border flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <h2 className="text-sm font-semibold text-gray-100">Add customer</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-200 text-lg">×</button>
        </div>

        <div className="p-5 flex flex-col gap-4 flex-1">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Name *</label>
            <input className="input" placeholder="Tunde Bakare" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Phone *</label>
            <input className="input" placeholder="+2348012345678" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-2">Tags</label>
            <div className="flex flex-wrap gap-2">
              {COMMON_TAGS.map((tag) => (
                <button key={tag} onClick={() => toggleTag(tag)}
                  className={`tag cursor-pointer ${tags.includes(tag) ? "bg-brand/20 text-brand border-brand/40" : ""}`}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Notes</label>
            <textarea className="input resize-none" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <div className="p-5 border-t border-surface-border">
          <button onClick={() => create.mutate()} disabled={create.isPending || !name || !phone} className="btn-primary w-full">
            {create.isPending ? "Adding..." : "Add customer"}
          </button>
        </div>
      </aside>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────
export default function Customers() {
  const [search, setSearch]     = useState("");
  const [tagFilter, setTag]     = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [adding, setAdding]     = useState(false);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers", search, tagFilter],
    queryFn:  () =>
      customersApi
        .list({ search: search || undefined, tag: tagFilter || undefined })
        .then((r) => r.data as Customer[]),
  });

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">{customers.length} total</p>
        </div>
        <button onClick={() => setAdding(true)} className="btn-primary">
          + Add customer
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          className="input max-w-xs"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input max-w-[160px]"
          value={tagFilter}
          onChange={(e) => setTag(e.target.value)}
        >
          <option value="">All tags</option>
          {COMMON_TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading customers...</div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No customers found.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3">Name</th>
                <th className="text-left px-5 py-3">Phone</th>
                <th className="text-left px-5 py-3">Tags</th>
                <th className="text-left px-5 py-3">Added</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr
                  key={c._id}
                  onClick={() => setSelected(c)}
                  className="border-b border-surface-border/50 hover:bg-surface-hover
                             transition-colors cursor-pointer"
                >
                  <td className="px-5 py-3 text-gray-100 font-medium">{c.name}</td>
                  <td className="px-5 py-3 text-gray-400">{c.phone}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((t) => <TagBadge key={t} tag={t} />)}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {new Date(c.createdAt).toLocaleDateString("en-NG", {
                      day: "numeric", month: "short",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Panels */}
      {selected && (
        <CustomerPanel customer={selected} onClose={() => setSelected(null)} />
      )}
      {adding && <AddCustomerForm onClose={() => setAdding(false)} />}
    </div>
  );
}
