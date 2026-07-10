import { Header } from "./Header";
import { Footer } from "./Footer";
import { CartDrawer } from "./CartDrawer";
import { PageTransition } from "@/components/effects/PageTransition";

export function StorefrontLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <Header />
      <main className="flex-1">
        <PageTransition />
      </main>
      <Footer />
      <CartDrawer />
    </div>
  );
}
