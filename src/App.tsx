import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { StorefrontLayout } from "@/components/layout/StorefrontLayout";
import { ScrollToTop } from "@/components/effects/ScrollToTop";
import { PixelPageView } from "@/components/effects/PixelPageView";
import { TachometerLoader } from "@/components/effects/TachometerLoader";
import Landing from "@/pages/Landing";
import Shop from "@/pages/Shop";
import Product from "@/pages/Product";
import Checkout from "@/pages/Checkout";
import OrderConfirmation from "@/pages/OrderConfirmation";
import NotFound from "@/pages/NotFound";

const AdminLayout = lazy(() => import("@/pages/admin/AdminLayout"));
const AdminLogin = lazy(() => import("@/pages/admin/Login"));
const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));
const AdminProducts = lazy(() => import("@/pages/admin/Products"));
const AdminProductForm = lazy(() => import("@/pages/admin/ProductForm"));
const AdminCategories = lazy(() => import("@/pages/admin/Categories"));
const AdminOrders = lazy(() => import("@/pages/admin/Orders"));
const AdminOrderDetail = lazy(() => import("@/pages/admin/OrderDetail"));
const AdminDeliveryPrices = lazy(() => import("@/pages/admin/DeliveryPrices"));
const AdminReviews = lazy(() => import("@/pages/admin/Reviews"));

function AdminFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <TachometerLoader />
    </div>
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <PixelPageView />
      <Routes>
        <Route element={<StorefrontLayout />}>
          <Route index element={<Landing />} />
          <Route path="shop" element={<Shop />} />
          <Route path="product/:slug" element={<Product />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="order-confirmation/:orderNumber" element={<OrderConfirmation />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route
          path="admin/login"
          element={
            <Suspense fallback={<AdminFallback />}>
              <AdminLogin />
            </Suspense>
          }
        />
        <Route
          path="admin"
          element={
            <Suspense fallback={<AdminFallback />}>
              <AdminLayout />
            </Suspense>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="products/new" element={<AdminProductForm />} />
          <Route path="products/:id" element={<AdminProductForm />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="orders/:id" element={<AdminOrderDetail />} />
          <Route path="delivery-prices" element={<AdminDeliveryPrices />} />
          <Route path="reviews" element={<AdminReviews />} />
        </Route>
      </Routes>
    </>
  );
}
