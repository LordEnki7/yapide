import { useState } from "react";
import { Link } from "wouter";
import {
  useGetMyBusiness, getGetMyBusinessQueryKey,
  useListProducts, getListProductsQueryKey,
  useCreateProduct, useUpdateProduct, useDeleteProduct
} from "@workspace/api-client-react";
import { formatDOP } from "@/lib/auth";
import { useLang } from "@/lib/lang";
import LangToggle from "@/components/LangToggle";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, X, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ImageUploader from "@/components/ImageUploader";

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

export default function BusinessMenu() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLang();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(DEFAULT_FORM);

  const { data: business } = useGetMyBusiness({ query: { queryKey: getGetMyBusinessQueryKey() } });

  const { data: products, isLoading } = useListProducts(
    business?.id ?? 0,
    { query: { enabled: !!business?.id, queryKey: getListProductsQueryKey(business?.id ?? 0) } }
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListProductsQueryKey(business?.id ?? 0) });

  const createProduct = useCreateProduct({
    mutation: {
      onSuccess: () => { invalidate(); setShowForm(false); setForm(DEFAULT_FORM); toast({ title: t.productCreated }); },
      onError: () => toast({ title: t.error, variant: "destructive" }),
    }
  });

  const updateProduct = useUpdateProduct({
    mutation: {
      onSuccess: () => { invalidate(); setShowForm(false); setEditingId(null); setForm(DEFAULT_FORM); toast({ title: t.productUpdated }); },
      onError: () => toast({ title: t.error, variant: "destructive" }),
    }
  });

  const deleteProduct = useDeleteProduct({
    mutation: {
      onSuccess: () => { invalidate(); toast({ title: t.productDeleted }); },
      onError: () => toast({ title: t.error, variant: "destructive" }),
    }
  });

  const handleSubmit = () => {
    if (!form.name || !form.price) return;
    const productData = {
      name: form.name,
      description: form.description || undefined,
      price: parseFloat(form.price),
      category: form.category || undefined,
      imageUrl: form.imageUrl || undefined,
      isAvailable: form.isAvailable,
    };
    if (editingId) {
      updateProduct.mutate({ productId: editingId, data: productData });
    } else {
      createProduct.mutate({ businessId: business!.id, data: productData });
    }
  };

  const openEdit = (product: any) => {
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

  return (
    <div className="min-h-screen bg-background text-white pb-24">
      <div className="bg-background border-b border-yellow-400/20 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/business">
          <button className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/10 transition">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <h1 className="text-xl font-black text-yellow-400">{t.myMenu}</h1>
        <div className="ml-auto flex items-center gap-2">
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
            <Input placeholder={t.productName} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400" />
            <Textarea placeholder={t.description} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400 resize-none" rows={2} />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder={t.price} value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400" />
              <Input placeholder={t.category} value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="bg-white/8 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400" />
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
              disabled={createProduct.isPending || updateProduct.isPending}
            >
              {editingId ? t.saveChanges : t.createProduct}
            </Button>
          </div>
        </div>
      )}

      <div className="px-4 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 bg-white/8 rounded-xl" />)}
          </div>
        ) : products?.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">🍽️</p>
            <p className="text-gray-400 mb-4">{t.noProducts}</p>
            <Button
              onClick={() => { setShowForm(true); setEditingId(null); setForm(DEFAULT_FORM); }}
              className="bg-yellow-400 text-black font-bold hover:bg-yellow-300"
            >
              {t.addFirst}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {products?.map((product) => (
              <div key={product.id} data-testid={`menu-item-${product.id}`} className="bg-white/8 border border-white/10 rounded-xl p-3 flex gap-3">
                {product.imageUrl && (
                  <img src={product.imageUrl} alt={product.name} className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">{product.name}</p>
                      {product.category && <p className="text-xs text-gray-500">{product.category}</p>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => openEdit(product)} className="w-8 h-8 rounded-lg bg-white/8 flex items-center justify-center hover:bg-white/10 transition">
                        <Pencil size={12} className="text-gray-400" />
                      </button>
                      <button onClick={() => deleteProduct.mutate({ productId: product.id })} className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center hover:bg-red-500/20 transition">
                        <Trash2 size={12} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-yellow-400 font-black">{formatDOP(product.price)}</span>
                    <Badge className={`text-xs border ${product.isAvailable ? "bg-green-400/20 text-green-400 border-green-400/40" : "bg-gray-500/20 text-gray-400 border-gray-500/40"}`}>
                      {product.isAvailable ? t.available : t.inactive}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
