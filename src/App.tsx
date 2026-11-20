import { lazy, Suspense, type ReactNode } from "react";
import { Route, Routes } from "react-router-dom";
import { StorefrontLayout } from "@/components/layout/StorefrontLayout";
import { ScrollToTop } from "@/components/effects/ScrollToTop";
import { TrackingSync } from "@/components/effects/TrackingSync";
import { TachometerLoader } from "@/components/effects/TachometerLoader";
import Landing from "@/pages/Landing";

// Landing stays eager (it's the entry page); everything else loads on demand
// so the first paint doesn't pay for checkout forms or admin tables.
const Shop = lazy(() => import("@/pages/Shop"));
const Product = lazy(() => import("@/pages/Product"));
const Checkout = lazy(() => import("@/pages/Checkout"));
const OrderConfirmation = lazy(() => import("@/pages/OrderConfirmation"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Legal = lazy(() => import("@/pages/Legal"));
const LandingPage = lazy(() => import("@/pages/LandingPage"));

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
const AdminAccount = lazy(() => import("@/pages/admin/Account"));
const AdminPixels = lazy(() => import("@/pages/admin/Pixels"));
const AdminPromotions = lazy(() => import("@/pages/admin/Promotions"));
const AdminLandings = lazy(() => import("@/pages/admin/Landings"));
const AdminLandingForm = lazy(() => import("@/pages/admin/LandingForm"));
const AdminLegalPages = lazy(() => import("@/pages/admin/LegalPages"));
const AdminSettings = lazy(() => import("@/pages/admin/Settings"));

function AdminFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <TachometerLoader />
    </div>
  );
}

/* Keeps header/footer in place while a storefront page chunk loads. */
function page(element: ReactNode) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <TachometerLoader />
        </div>
      }
    >
      {element}
    </Suspense>
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <TrackingSync />
      <Routes>
        <Route element={<StorefrontLayout />}>
          <Route index element={<Landing />} />
          <Route path="shop" element={page(<Shop />)} />
          <Route path="product/:slug" element={page(<Product />)} />
          <Route path="checkout" element={page(<Checkout />)} />
          <Route path="order-confirmation/:orderNumber" element={page(<OrderConfirmation />)} />
          <Route path="politique" element={page(<Legal page="policy" />)} />
          <Route path="mentions-legales" element={page(<Legal page="mentions" />)} />
          <Route path="cgv" element={page(<Legal page="cgv" />)} />
          <Route path="confidentialite" element={page(<Legal page="privacy" />)} />
          <Route path="cookies" element={page(<Legal page="cookies" />)} />
          <Route path="*" element={page(<NotFound />)} />
        </Route>

        {/* Ad landing pages: no shop header/footer, nothing to click away to. */}
        <Route
          path="lp/:slug"
          element={
            <Suspense fallback={<AdminFallback />}>
              <LandingPage />
            </Suspense>
          }
        />

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
          <Route path="promotions" element={<AdminPromotions />} />
          <Route path="landings" element={<AdminLandings />} />
          <Route path="landings/new" element={<AdminLandingForm />} />
          <Route path="landings/:id" element={<AdminLandingForm />} />
          <Route path="pixels" element={<AdminPixels />} />
          <Route path="legal" element={<AdminLegalPages />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="account" element={<AdminAccount />} />
        </Route>
      </Routes>
    </>
  );
}
