import { Link } from "wouter";
import { useAdminListUsers, getAdminListUsersQueryKey, useAdminBanUser } from "@workspace/api-client-react";
import { useLang } from "@/lib/lang";
import LangToggle from "@/components/LangToggle";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const { t } = useLang();

  const { data: users, isLoading } = useAdminListUsers(
    {},
    { query: { queryKey: getAdminListUsersQueryKey({}) } }
  );

  const banUser = useAdminBanUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey({}) });
        toast({ title: t.userBanned });
      },
      onError: () => toast({ title: t.error, variant: "destructive" }),
    }
  });

  const filtered = users?.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  const ROLE_COLORS: Record<string, string> = {
    customer: "bg-blue-400/20 text-blue-400 border-blue-400/40",
    driver: "bg-green-400/20 text-green-400 border-green-400/40",
    business: "bg-purple-400/20 text-purple-400 border-purple-400/40",
    admin: "bg-yellow-400/20 text-yellow-400 border-yellow-400/40",
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="bg-black border-b border-yellow-400/20 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/admin">
          <button className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <h1 className="text-xl font-black text-yellow-400">{t.users}</h1>
        <div className="ml-auto">
          <LangToggle />
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder={t.searchUsers}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-400"
          />
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 bg-white/5 rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered?.map((user) => (
              <div key={user.id} data-testid={`user-${user.id}`} className="bg-white/5 border border-white/10 rounded-xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold truncate">{user.name}</p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={`text-xs border ${ROLE_COLORS[user.role] ?? "bg-white/5 text-gray-400 border-white/10"}`}>
                      {user.role}
                    </Badge>
                    <Button
                      size="sm"
                      variant={user.isBanned ? "default" : "outline"}
                      onClick={() => banUser.mutate({ userId: user.id, data: { isBanned: !user.isBanned } })}
                      disabled={banUser.isPending}
                      className={`text-xs h-7 font-bold ${user.isBanned ? "bg-green-500/80 text-white hover:bg-green-500" : "border-red-500/40 text-red-400 hover:bg-red-500/20"}`}
                    >
                      {user.isBanned ? "Desbanear" : t.banUser}
                    </Button>
                  </div>
                </div>
                {user.isBanned && (
                  <Badge className="mt-2 text-xs bg-red-500/20 text-red-400 border-red-500/40">{t.banned}</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
