import { Link, useLocation } from "wouter";
import { Home, Clock, Package, Wallet, ChefHat, BarChart3, Users, Bike, Building2, Star, UserCircle } from "lucide-react";
import { getStoredUser } from "@/lib/auth";
import { useLang } from "@/lib/lang";

export default function BottomNav() {
  const [location] = useLocation();
  const user = getStoredUser();
  const { t } = useLang();

  if (!user) return null;

  const CUSTOMER_NAV = [
    { icon: Home, label: t.home, href: "/customer" },
    { icon: Clock, label: t.myOrders, href: "/customer/orders" },
    { icon: Star, label: t.pointsTitle, href: "/customer/points" },
    { icon: UserCircle, label: t.profile, href: "/customer/profile" },
  ];

  const DRIVER_NAV = [
    { icon: Home, label: t.home, href: "/driver" },
    { icon: Package, label: t.orders, href: "/driver/jobs" },
    { icon: Wallet, label: t.wallet, href: "/driver/wallet" },
    { icon: UserCircle, label: t.profile, href: "/driver/profile" },
  ];

  const BUSINESS_NAV = [
    { icon: Home, label: t.home, href: "/business" },
    { icon: Package, label: t.orders, href: "/business/orders" },
    { icon: ChefHat, label: t.menu, href: "/business/menu" },
    { icon: UserCircle, label: t.profile, href: "/business/profile" },
  ];

  const ADMIN_NAV = [
    { icon: BarChart3, label: t.home, href: "/admin" },
    { icon: Users, label: t.users, href: "/admin/users" },
    { icon: Bike, label: t.drivers, href: "/admin/drivers" },
    { icon: Building2, label: t.businesses, href: "/admin/businesses" },
  ];

  let navItems = CUSTOMER_NAV;
  if (location.startsWith("/driver")) navItems = DRIVER_NAV;
  else if (location.startsWith("/business")) navItems = BUSINESS_NAV;
  else if (location.startsWith("/admin")) navItems = ADMIN_NAV;
  else if (!location.startsWith("/customer")) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-yellow-400/20 px-1">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            location === item.href ||
            (item.href !== "/customer" &&
              item.href !== "/driver" &&
              item.href !== "/business" &&
              item.href !== "/admin" &&
              location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex flex-col items-center gap-1 py-3 px-3 transition-all ${
                  isActive ? "text-yellow-400" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <Icon
                  size={20}
                  className={isActive ? "drop-shadow-[0_0_6px_rgba(255,215,0,0.8)]" : ""}
                />
                <span className="text-xs font-bold">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
