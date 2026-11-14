import type { FieldErrors, UseFormRegister, UseFormSetValue } from "react-hook-form";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useCommunes } from "@/hooks/useCommunes";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import type { CheckoutFormValues } from "@/lib/checkoutSchema";
import type { DeliveryPrice } from "@/types/db";
import type { TranslationKey } from "@/i18n/translations";

interface CheckoutFieldsProps {
  register: UseFormRegister<CheckoutFormValues>;
  setValue: UseFormSetValue<CheckoutFormValues>;
  /** The currently selected wilaya (watched by the parent form). */
  wilaya: string | undefined;
  errors: FieldErrors<CheckoutFormValues>;
  deliveryPrices: DeliveryPrice[];
  deliveryType: "home" | "office";
  onDeliveryTypeChange: (type: "home" | "office") => void;
}

export function CheckoutFields({
  register,
  setValue,
  wilaya,
  errors,
  deliveryPrices,
  deliveryType,
  onDeliveryTypeChange,
}: CheckoutFieldsProps) {
  const { t, lang } = useLanguage();
  // Communes are per wilaya and never change the price — delivery is priced
  // per wilaya only. The list just gives the courier a real commune name.
  const { communes, isLoading: communesLoading } = useCommunes(wilaya);

  function errText(key?: keyof CheckoutFormValues) {
    const err = key ? errors[key] : undefined;
    if (!err?.message) return undefined;
    return t(err.message as TranslationKey);
  }

  return (
    <div className="space-y-4">
      {/* Honeypot: real users never see or fill this */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
      </div>

      <Input
        placeholder={t("checkout_full_name")}
        error={errText("customer_name")}
        {...register("customer_name")}
      />
      <Input
        placeholder={t("checkout_phone")}
        type="tel"
        error={errText("customer_phone")}
        {...register("customer_phone")}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          error={errText("wilaya")}
          aria-label={t("checkout_select_wilaya")}
          {...register("wilaya", {
            // A commune from the previous wilaya must not survive the switch.
            onChange: () => setValue("city", "", { shouldValidate: false }),
          })}
        >
          <option value="">{t("checkout_select_wilaya")}</option>
          {deliveryPrices.map((dp) => (
            <option key={dp.id} value={dp.wilaya}>
              {dp.wilaya}
            </option>
          ))}
        </Select>
        {communes ? (
          // The stored value is always the French name (what couriers and the
          // Excel export use); the label follows the shopper's language.
          <Select
            error={errText("city")}
            aria-label={t("checkout_select_commune")}
            {...register("city")}
          >
            <option value="">{t("checkout_select_commune")}</option>
            {[...communes]
              .sort((a, b) =>
                lang === "ar" ? a.ar.localeCompare(b.ar, "ar") : a.fr.localeCompare(b.fr, "fr")
              )
              .map((c) => (
                <option key={c.fr} value={c.fr}>
                  {lang === "ar" ? `${c.ar} — ${c.fr}` : c.fr}
                </option>
              ))}
          </Select>
        ) : wilaya && communesLoading ? (
          <Select disabled aria-label={t("checkout_select_commune")}>
            <option>{t("loading")}</option>
          </Select>
        ) : !wilaya ? (
          <Select disabled aria-label={t("checkout_select_commune")}>
            <option>{t("checkout_commune_pick_wilaya")}</option>
          </Select>
        ) : (
          // Wilaya missing from the dataset: never block the order, let them type it.
          <Input placeholder={t("checkout_city")} error={errText("city")} {...register("city")} />
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-ink">{t("checkout_delivery_type")}</p>
        <div className="grid grid-cols-2 gap-3">
          {(["home", "office"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onDeliveryTypeChange(type)}
              className={cn(
                "rounded-xl border px-4 py-3 text-sm font-semibold transition-colors",
                deliveryType === type
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-line text-muted hover:bg-panel-2"
              )}
            >
              {type === "home" ? t("checkout_delivery_home") : t("checkout_delivery_office")}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
