import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import { CartProvider } from "@/lib/cart";
import { LangProvider } from "@/lib/lang";
import BottomNav from "@/components/BottomNav";

import CustomerHome from "@/pages/customer/Home";
import BusinessStore from "@/pages/customer/BusinessStore";
import CustomerCart from "@/pages/customer/Cart";
import CustomerOrders from "@/pages/customer/Orders";
import CustomerOrderDetail from "@/pages/customer/OrderDetail";
import CustomerPoints from "@/pages/customer/Points";

import DriverDashboard from "@/pages/driver/Dashboard";
import DriverJobs from "@/pages/driver/Jobs";
import DriverWallet from "@/pages/driver/Wallet";

import BusinessDashboard from "@/pages/business/Dashboard";
import BusinessOrders from "@/pages/business/Orders";
import BusinessMenu from "@/pages/business/Menu";

import AdminDashboard from "@/pages/admin/Dashboard";
import AdminUsers from "@/pages/admin/Users";
import AdminDrivers from "@/pages/admin/Drivers";
import AdminBusinesses from "@/pages/admin/Businesses";
import AdminOrders from "@/pages/admin/Orders";

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
        <Route path="/customer" component={CustomerHome} />
        <Route path="/customer/business/:id" component={BusinessStore} />
        <Route path="/customer/cart" component={CustomerCart} />
        <Route path="/customer/orders" component={CustomerOrders} />
        <Route path="/customer/orders/:id" component={CustomerOrderDetail} />
        <Route path="/customer/points" component={CustomerPoints} />
        <Route path="/driver" component={DriverDashboard} />
        <Route path="/driver/jobs" component={DriverJobs} />
        <Route path="/driver/wallet" component={DriverWallet} />
        <Route path="/business" component={BusinessDashboard} />
        <Route path="/business/orders" component={BusinessOrders} />
        <Route path="/business/menu" component={BusinessMenu} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route path="/admin/drivers" component={AdminDrivers} />
        <Route path="/admin/businesses" component={AdminBusinesses} />
        <Route path="/admin/orders" component={AdminOrders} />
        <Route component={NotFound} />
      </Switch>
      <BottomNav />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LangProvider>
          <CartProvider>
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
