import { Link } from "wouter";
import { useAdminListBusinesses, getAdminListBusinessesQueryKey, useAdminToggleBusiness } from "@workspace/api-client-react";
import { useLang } from "@/lib/lang";
import LangToggle from "@/components/LangToggle";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminBusinesses() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLang();

  const { data: businesses, isLoading } = useAdminListBusinesses({
    query: { queryKey: getAdminListBusinessesQueryKey() }
  });

  const toggleBusiness = useAdminToggleBusiness({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getAdminListBusinessesQueryKey() });
        toast({ title: t.success });
      },
      onError: () => toast({ title: t.error, variant: "destructive" }),
    }
  });

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="bg-black border-b border-yellow-400/20 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/admin">
          <button className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <h1 className="text-xl font-black text-yellow-400">{t.businesses}</h1>
        <div className="ml-auto">
          <LangToggle />
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 bg-white/5 rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-3">
            {businesses?.map((biz) => (
              <div key={biz.id} data-testid={`business-${biz.id}`} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  {biz.imageUrl && (
                    <img src={biz.imageUrl} alt={biz.name} className="w-14 h-14 object-cover rounded-xl flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-black text-white truncate">{biz.name}</p>
                      <Badge className={`border text-xs flex-shrink-0 ${biz.isOpen ? "bg-green-400/20 text-green-400 border-green-400/40" : "bg-gray-500/20 text-gray-400 border-gray-500/40"}`}>
                        {biz.isOpen ? t.open : t.closed}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{biz.address}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1 text-yellow-400">
                        <Star size={12} fill="currentColor" />
                        <span className="text-xs font-bold">{biz.rating?.toFixed(1) ?? "—"}</span>
                      </div>
                      <Badge className="text-xs bg-white/5 text-gray-400 border-white/10">{biz.category}</Badge>
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  className={`w-full mt-3 font-bold text-xs ${biz.isOpen ? "bg-red-500/80 hover:bg-red-500 text-white" : "bg-green-500/80 hover:bg-green-500 text-white"}`}
                  onClick={() => toggleBusiness.mutate({ businessId: biz.id })}
                  disabled={toggleBusiness.isPending}
                >
                  {biz.isOpen ? t.close : t.open}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
