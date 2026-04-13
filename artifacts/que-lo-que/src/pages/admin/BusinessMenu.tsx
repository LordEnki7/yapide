import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import { formatDOP } from "@/lib/auth";
import { useLang } from "@/lib/lang";
import LangToggle from "@/components/LangToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, X, Pencil, Trash2, Store } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ImageUploader from "@/components/ImageUploader";

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  imageUrl: string | null;
  isAvailable: boolean;
}

interface Business {
  id: number;
  name: string;
  category: string;
}

interface ProductForm {
  name: string;
  description: string;
  price: string;
  category: string;
  imageUrl: string;
  isAvailable: boolean;
}

const DEFAULT_FORM: ProductForm = {
  name: "", description: "", price: "", category: "", imageUrl: "", isAvailable: true,
};

export default function AdminBusinessMenu() {
  const { id } = useParams<{ id: string }>();
  const bizId = parseInt(id, 10);
  const { t } = useLang();
  const { toast } = useToast();

  const [business, setBusiness] = useState<Business | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const fetchProducts = async () => {
    const [bizRes, prodsRes] = await Promise.all([
      fetch(`/api/businesses/${bizId}`, { credentials: "include" }),
      fetch(`/api/admin/businesses/${bizId}/products`, { credentials: "include" }),
    ]);
    if (bizRes.ok) setBusiness(await bizRes.json());
    if (prodsRes.ok) setProducts(await prodsRes.json());
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, [bizId]);

  const handleSubmit = async () => {
    if (!form.name || !form.price) return;
    setSaving(true);
    const body = {
      name: form.name,
      description: form.description || null,
      price: parseFloat(form.price),
      category: form.category || null,
      imageUrl: form.imageUrl || null,
      isAvailable: form.isAvailable,
    };
    const url = editingId
      ? `/api/admin/businesses/${bizId}/products/${editingId}`
      : `/api/admin/businesses/${bizId}/products`;
    const res = await fetch(url, {
      method: editingId ? "PATCH" : "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      toast({ title: editingId ? t.productUpdated : t.productCreated });
      setShowForm(false);
      setEditingId(null);
      setForm(DEFAULT_FORM);
      fetchProducts();
    } else {
      toast({ title: t.error, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleDelete = async (productId: number) => {
    const res = await fetch(`/api/admin/businesses/${bizId}/products/${productId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      toast({ title: t.productDeleted });
      setProducts(prev => prev.filter(p => p.id !== productId));
    }
  };

  const openEdit = (product: Product) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description ?? "",
      price: String(product.price),
      category: product.category ?? "",
      imageUrl: product.imageUrl ?? "",
      isAvailable: product.isAvailable,
    });
    setShowForm(true);
  };

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(search.toLowerCase()))
  );

  const grouped = filtered.reduce((acc: Record<string, Product[]>, p) => {
    const cat = p.category || "Sin categoría";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background text-white pb-24">
      <div className="bg-background border-b border-yellow-400/20 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/admin/businesses">
          <button className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/10 transition">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-black text-yellow-400 truncate">
            {business ? business.name : "Menú"}
          </h1>
          {business && <p className="text-xs text-gray-500">{products.length} productos</p>}
        </div>
        <div className="flex items-center gap-2">
          <LangToggle />
          <Button
            size="sm"
            onClick={() => { setShowForm(true); setEditingId(null); setForm(DEFAULT_FORM); }}
            className="bg-yellow-400 text-black font-bold hover:bg-yellow-300 gap-1 h-8"
          >
            <Plus size={14} />
            {t.addProduct}
          </Button>
        </div>
      </div>

      {showForm && (
        <div className="mx-4 mt-4 bg-white/8 border border-yellow-400/30 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-yellow-400">{editingId ? t.editProduct : t.newProduct}</h2>
            <button onClick={() => { setShowForm(false); setEditingId(null); setForm(DEFAULT_FORM); }}>
              <X size={18} className="text-gray-400 hover:text-white" />
            </button>
          </div>
          <div className="space-y-3">
            <Input
              placeholder={t.productName}
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400"
            />
            <Textarea
              placeholder={t.description}
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400 resize-none"
              rows={2}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Input
                  type="number"
                  placeholder={t.price}
                  value={form.price}
                  onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                  className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400"
                />
                {form.price && (
                  <p className="text-xs text-yellow-400/60 mt-1 px-1">
                    Cliente paga: {formatDOP(parseFloat(form.price || "0") * 1.15)}
                  </p>
                )}
              </div>
              <Input
                placeholder={t.category}
                value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400"
              />
            </div>
            <ImageUploader
              value={form.imageUrl}
              onChange={v => setForm(p => ({ ...p, imageUrl: v }))}
              label={t.imageUrl ?? "Foto del producto"}
            />
            <div className="flex items-center gap-3">
              <Switch checked={form.isAvailable} onCheckedChange={v => setForm(p => ({ ...p, isAvailable: v }))} />
              <span className="text-sm text-gray-300">{t.available}</span>
            </div>
            <Button
              className="w-full bg-yellow-400 text-black font-black hover:bg-yellow-300"
              onClick={handleSubmit}
              disabled={saving}
            >
              {editingId ? t.saveChanges : t.createProduct}
            </Button>
          </div>
        </div>
      )}

      <div className="px-4 py-4">
        <Input
          placeholder="Buscar producto o categoría..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mb-4 bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400"
        />

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 bg-white/8 rounded-xl" />)}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center py-20">
            <Store size={48} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400 mb-4">{t.noProducts}</p>
            <Button
              onClick={() => { setShowForm(true); setEditingId(null); setForm(DEFAULT_FORM); }}
              className="bg-yellow-400 text-black font-bold hover:bg-yellow-300"
            >
              {t.addFirst}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([category, prods]) => (
              <div key={category}>
                <h2 className="text-yellow-400 font-bold text-xs uppercase tracking-widest mb-2 border-b border-yellow-400/20 pb-1">
                  {category} · {prods.length}
                </h2>
                <div className="space-y-2">
                  {prods.map(product => (
                    <div key={product.id} className="bg-white/8 border border-white/10 rounded-xl p-3 flex gap-3">
                      {product.imageUrl && (
                        <img src={product.imageUrl} alt={product.name} className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-white text-sm truncate">{product.name}</p>
                            {product.description && (
                              <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{product.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => openEdit(product)}
                              className="w-7 h-7 rounded-lg bg-white/8 flex items-center justify-center hover:bg-white/10 transition"
                            >
                              <Pencil size={11} className="text-gray-400" />
                            </button>
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center hover:bg-red-500/20 transition"
                            >
                              <Trash2 size={11} className="text-red-400" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <div>
                            <span className="text-yellow-400 font-black text-sm">{formatDOP(product.price)}</span>
                            <span className="text-gray-600 text-xs ml-1">→ {formatDOP(parseFloat((product.price * 1.15).toFixed(2)))}</span>
                          </div>
                          <Badge className={`text-xs border ${product.isAvailable ? "bg-green-400/20 text-green-400 border-green-400/40" : "bg-gray-500/20 text-gray-400 border-gray-500/40"}`}>
                            {product.isAvailable ? t.available : t.inactive}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
