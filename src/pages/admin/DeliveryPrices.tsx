import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useDeliveryPrices } from "@/hooks/useDeliveryPrices";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { BentoPanel } from "@/components/ui/BentoPanel";
import { Input } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";

export default function AdminDeliveryPrices() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { data: prices = [] } = useDeliveryPrices({ activeOnly: false });
  const [savingId, setSavingId] = useState<string | null>(null);

  async function updateRow(id: string, patch: Record<string, unknown>) {
    setSavingId(id);
    await supabase.from("delivery_prices").update(patch).eq("id", id);
    await queryClient.invalidateQueries({ queryKey: ["delivery-prices"] });
    setSavingId(null);
  }

  return (
    <div>
      <h1 className="mb-6 font-heading text-2xl font-extrabold text-ink">
        {t("admin_delivery_title")}
      </h1>

      {/* min-w keeps the columns at a usable size on a phone: without it the
          table crushes the price cells until the digits are clipped. The panel
          scrolls sideways instead. */}
      <BentoPanel className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-line text-start text-xs text-muted">
              <th className="px-4 py-3 text-start font-semibold">{t("admin_delivery_wilaya")}</th>
              <th className="w-32 px-4 py-3 text-start font-semibold">
                {t("admin_delivery_home_price")}
              </th>
              <th className="w-32 px-4 py-3 text-start font-semibold">
                {t("admin_delivery_office_price")}
              </th>
              <th className="w-24 px-4 py-3 text-start font-semibold">
                {t("admin_delivery_active")}
              </th>
            </tr>
          </thead>
          <tbody>
            {prices.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  "border-b border-line last:border-0",
                  !row.active && "opacity-50"
                )}
              >
                <td className="whitespace-nowrap px-4 py-2 font-medium">{row.wilaya}</td>
                <td className="px-4 py-2">
                  <Input
                    type="number"
                    defaultValue={row.home_price}
                    className="fx-no-spin"
                    disabled={savingId === row.id}
                    onBlur={(e) => updateRow(row.id, { home_price: Number(e.target.value) })}
                  />
                </td>
                <td className="px-4 py-2">
                  <Input
                    type="number"
                    defaultValue={row.office_price}
                    className="fx-no-spin"
                    disabled={savingId === row.id}
                    onBlur={(e) => updateRow(row.id, { office_price: Number(e.target.value) })}
                  />
                </td>
                <td className="px-4 py-2">
                  <Toggle
                    checked={row.active}
                    onChange={() => updateRow(row.id, { active: !row.active })}
                    disabled={savingId === row.id}
                    aria-label={`${row.wilaya}: ${t("admin_delivery_active")}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </BentoPanel>
    </div>
  );
}
