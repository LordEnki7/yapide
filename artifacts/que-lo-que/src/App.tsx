import { useState, useCallback } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import { CartProvider } from "@/lib/cart";
import { LangProvider } from "@/lib/lang";
import BottomNav from "@/components/BottomNav";
import SplashScreen from "@/components/SplashScreen";

import CustomerHome from "@/pages/customer/Home";
import BusinessStore from "@/pages/customer/BusinessStore";
import CustomerCart from "@/pages/customer/Cart";
import CustomerOrders from "@/pages/customer/Orders";
import CustomerOrderDetail from "@/pages/customer/OrderDetail";
import CustomerPoints from "@/pages/customer/Points";
import CustomerProfile from "@/pages/customer/Profile";

import DriverDashboard from "@/pages/driver/Dashboard";
import DriverJobs from "@/pages/driver/Jobs";
import DriverWallet from "@/pages/driver/Wallet";

import BusinessDashboard from "@/pages/business/Dashboard";
import BusinessOrders from "@/pages/business/Orders";
import BusinessMenu from "@/pages/business/Menu";
import BusinessAnalytics from "@/pages/business/Analytics";

import AdminDashboard from "@/pages/admin/Dashboard";
import AdminUsers from "@/pages/admin/Users";
import AdminDrivers from "@/pages/admin/Drivers";
import AdminBusinesses from "@/pages/admin/Businesses";
import AdminBusinessMenu from "@/pages/admin/BusinessMenu";
import AdminOrders from "@/pages/admin/Orders";
import AdminPromoCodes from "@/pages/admin/PromoCodes";
import AdminCommandCenter from "@/pages/admin/CommandCenter";
import AdminNotifications from "@/pages/admin/Notifications";
import AdminStaff from "@/pages/admin/Staff";
import CustomerSupport from "@/pages/customer/Support";
import BusinessOnboarding from "@/pages/business/Onboarding";
import DriverOnboarding from "@/pages/driver/Onboarding";
import DriverProfile from "@/pages/driver/Profile";
import BusinessProfile from "@/pages/business/Profile";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function Router() {
  return (
    <>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/customer" component={CustomerHome} />
        <Route path="/customer/business/:id" component={BusinessStore} />
        <Route path="/customer/cart" component={CustomerCart} />
        <Route path="/customer/orders" component={CustomerOrders} />
        <Route path="/customer/orders/:id" component={CustomerOrderDetail} />
        <Route path="/customer/points" component={CustomerPoints} />
        <Route path="/customer/profile" component={CustomerProfile} />
        <Route path="/business/onboarding" component={BusinessOnboarding} />
        <Route path="/driver/onboarding" component={DriverOnboarding} />
        <Route path="/driver" component={DriverDashboard} />
        <Route path="/driver/jobs" component={DriverJobs} />
        <Route path="/driver/wallet" component={DriverWallet} />
        <Route path="/driver/profile" component={DriverProfile} />
        <Route path="/business" component={BusinessDashboard} />
        <Route path="/business/orders" component={BusinessOrders} />
        <Route path="/business/menu" component={BusinessMenu} />
        <Route path="/business/analytics" component={BusinessAnalytics} />
        <Route path="/business/profile" component={BusinessProfile} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route path="/admin/drivers" component={AdminDrivers} />
        <Route path="/admin/businesses" component={AdminBusinesses} />
        <Route path="/admin/businesses/:id/menu" component={AdminBusinessMenu} />
        <Route path="/admin/orders" component={AdminOrders} />
        <Route path="/admin/promo-codes" component={AdminPromoCodes} />
        <Route path="/admin/command-center" component={AdminCommandCenter} />
        <Route path="/admin/notifications" component={AdminNotifications} />
        <Route path="/admin/staff" component={AdminStaff} />
        <Route path="/customer/support" component={CustomerSupport} />
        <Route component={NotFound} />
      </Switch>
      <BottomNav />
    </>
  );
}

function App() {
  const [splashDone, setSplashDone] = useState(() => {
    return sessionStorage.getItem("yapide_splash_shown") === "1";
  });

  const handleSplashDone = useCallback(() => {
    sessionStorage.setItem("yapide_splash_shown", "1");
    setSplashDone(true);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LangProvider>
          <CartProvider>
            {!splashDone && <SplashScreen onDone={handleSplashDone} />}
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
          </CartProvider>
        </LangProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
