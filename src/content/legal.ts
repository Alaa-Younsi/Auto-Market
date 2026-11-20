/**
 * Built-in text of the legal pages and of the "Livraison & retours" policy.
 *
 * The admin ("Page politique") stores OVERRIDES in legal_pages /
 * legal_sections: an empty field there means "use this text". Fallback is per
 * field and per language: active language → French → this file.
 *
 * Body format (also what the admin editor accepts): paragraphs separated by a
 * blank line, lines starting with "- " become a bullet list, and
 * {store} {phone} {email} {domain} are filled from Admin → Réglages.
 *
 * Legal frame (Algeria): loi 18-05 (commerce électronique), loi 18-07
 * (protection des données personnelles, ANPDP), loi 09-03 (protection du
 * consommateur). This is a sound starting point, not legal advice — the
 * client should have it reviewed.
 */

export type LegalPageKey = "policy" | "mentions" | "cgv" | "privacy" | "cookies";

export const LEGAL_PAGES: { key: LegalPageKey; path: string }[] = [
  { key: "policy", path: "/politique" },
  { key: "mentions", path: "/mentions-legales" },
  { key: "cgv", path: "/cgv" },
  { key: "privacy", path: "/confidentialite" },
  { key: "cookies", path: "/cookies" },
];

interface Bilingual {
  fr: string;
  ar: string;
}

export interface BuiltinSection {
  key: string;
  title: Bilingual;
  body: Bilingual;
}

export interface BuiltinPage {
  title: Bilingual;
  intro: Bilingual;
  updated: Bilingual;
  sections: BuiltinSection[];
}

const UPDATED: Bilingual = {
  fr: "Dernière mise à jour : 20 novembre 2026",
  ar: "آخر تحديث: 20 نوفمبر 2026",
};

export const LEGAL_CONTENT: Record<LegalPageKey, BuiltinPage> = {
  policy: {
    title: { fr: "Livraison, paiement & retours", ar: "التوصيل والدفع والإرجاع" },
    intro: {
      fr: "Tout ce qu'il faut savoir avant de commander sur {store} : comment votre colis arrive, comment vous payez, et ce qui se passe si quelque chose ne va pas.",
      ar: "كل ما تحتاج معرفته قبل الطلب من {store}: كيف يصلك الطرد، كيف تدفع، وماذا يحدث إن كان هناك مشكل.",
    },
    updated: UPDATED,
    sections: [
      {
        key: "policy_delivery",
        title: { fr: "Livraison dans les 69 wilayas", ar: "التوصيل إلى 69 ولاية" },
        body: {
          fr: "Nous livrons partout en Algérie par société de livraison, à domicile ou au bureau de livraison (stop desk) le plus proche.\n\n- Délai indicatif : 24 à 72 h pour la plupart des wilayas, jusqu'à 5 jours ouvrables pour le Sud.\n- Les frais de livraison dépendent de votre wilaya et du mode choisi ; ils sont affichés avant la validation de la commande.\n- Le livreur vous appelle avant de passer : gardez votre téléphone joignable.",
          ar: "نوصّل إلى كامل التراب الوطني عبر شركة توصيل، إلى المنزل أو إلى أقرب مكتب توصيل (ستوب ديسك).\n\n- المدة التقريبية: من 24 إلى 72 ساعة لأغلب الولايات، وحتى 5 أيام عمل لولايات الجنوب.\n- تكلفة التوصيل حسب ولايتك وطريقة الاستلام، وتظهر قبل تأكيد الطلب.\n- يتصل بك عون التوصيل قبل المرور: أبقِ هاتفك متاحًا.",
        },
      },
      {
        key: "policy_payment",
        title: { fr: "Paiement à la livraison", ar: "الدفع عند الاستلام" },
        body: {
          fr: "Vous ne payez rien en ligne. Le montant total (articles + livraison) est réglé en espèces au livreur, à la réception du colis. Le montant à payer est celui affiché lors de la commande et rappelé lors de l'appel de confirmation.",
          ar: "لا تدفع أي شيء عبر الإنترنت. يُدفع المبلغ الإجمالي (المنتجات + التوصيل) نقدًا لعون التوصيل عند استلام الطرد. المبلغ هو نفسه المعروض عند الطلب والذي نؤكّده لك في مكالمة التأكيد.",
        },
      },
      {
        key: "policy_confirmation",
        title: { fr: "Confirmation par téléphone", ar: "التأكيد عبر الهاتف" },
        body: {
          fr: "Après chaque commande, notre équipe vous appelle pour confirmer les articles, l'adresse et le montant. Une commande que nous n'arrivons pas à confirmer après plusieurs tentatives peut être annulée.",
          ar: "بعد كل طلب، يتصل بك فريقنا لتأكيد المنتجات والعنوان والمبلغ. الطلب الذي لا نتمكن من تأكيده بعد عدة محاولات قد يُلغى.",
        },
      },
      {
        key: "policy_returns",
        title: { fr: "Produit non conforme ou défectueux", ar: "منتج غير مطابق أو معيب" },
        body: {
          fr: "Conformément à la loi 18-05, si le produit reçu ne correspond pas à la commande ou présente un défaut, contactez-nous dans un délai de 4 jours ouvrables à compter de la livraison, avec une photo du produit.\n\n- Le produit doit être retourné dans son emballage d'origine, avec ses accessoires.\n- Nous procédons, à votre choix, à l'échange ou au remboursement.\n- Les frais de retour sont à notre charge lorsque l'erreur ou le défaut vient de nous.",
          ar: "طبقًا للقانون 18-05، إذا كان المنتج المستلم غير مطابق للطلب أو به عيب، تواصل معنا خلال 4 أيام عمل من تاريخ الاستلام، مع صورة للمنتج.\n\n- يجب إرجاع المنتج في غلافه الأصلي مع ملحقاته.\n- نقوم، حسب اختيارك، بالاستبدال أو بإرجاع المبلغ.\n- تكاليف الإرجاع على عاتقنا إذا كان الخطأ أو العيب من جهتنا.",
        },
      },
      {
        key: "policy_refusal",
        title: { fr: "Annulation et refus de colis", ar: "الإلغاء ورفض الطرد" },
        body: {
          fr: "Vous pouvez annuler gratuitement tant que la commande n'a pas été expédiée : appelez-nous ou écrivez-nous sur WhatsApp. Un colis refusé sans motif à la livraison nous coûte l'aller-retour ; nous pouvons alors refuser les commandes suivantes du même numéro.",
          ar: "يمكنك إلغاء الطلب مجانًا ما دام لم يُشحن بعد: اتصل بنا أو راسلنا عبر واتساب. رفض الطرد عند التوصيل دون سبب يكلّفنا الذهاب والإياب، وقد نرفض حينها الطلبات القادمة من نفس الرقم.",
        },
      },
      {
        key: "policy_warranty",
        title: { fr: "Garantie", ar: "الضمان" },
        body: {
          fr: "Nos produits bénéficient de la garantie légale de conformité prévue par la loi 09-03 relative à la protection du consommateur. Elle ne couvre pas l'usure normale, une mauvaise installation ou une utilisation non conforme à la notice.",
          ar: "تستفيد منتجاتنا من الضمان القانوني للمطابقة المنصوص عليه في القانون 09-03 المتعلق بحماية المستهلك. لا يشمل الضمان الاهتراء العادي أو التركيب الخاطئ أو الاستعمال المخالف لدليل الاستعمال.",
        },
      },
      {
        key: "policy_contact",
        title: { fr: "Une question ?", ar: "لديك سؤال؟" },
        body: {
          fr: "Appelez-nous au {phone} ou écrivez-nous sur WhatsApp : nous répondons rapidement.",
          ar: "اتصل بنا على {phone} أو راسلنا عبر واتساب: نرد بسرعة.",
        },
      },
    ],
  },

  mentions: {
    title: { fr: "Mentions légales", ar: "الإشعارات القانونية" },
    intro: {
      fr: "Informations publiées conformément à la loi 18-05 relative au commerce électronique.",
      ar: "معلومات منشورة طبقًا للقانون 18-05 المتعلق بالتجارة الإلكترونية.",
    },
    updated: UPDATED,
    sections: [
      {
        key: "mentions_editor",
        title: { fr: "Éditeur du site", ar: "ناشر الموقع" },
        body: {
          fr: "Le site {domain} est édité par {store}. Les informations d'identification du commerçant figurent ci-dessous.",
          ar: "يُنشر الموقع {domain} من طرف {store}. معلومات تعريف التاجر مذكورة أدناه.",
        },
      },
      {
        key: "mentions_hosting",
        title: { fr: "Hébergement", ar: "الاستضافة" },
        body: {
          fr: "- Site web : Vercel Inc. (vercel.com)\n- Base de données et fichiers : Supabase Inc. (supabase.com)",
          ar: "- الموقع: Vercel Inc. (vercel.com)\n- قاعدة البيانات والملفات: Supabase Inc. (supabase.com)",
        },
      },
      {
        key: "mentions_ip",
        title: { fr: "Propriété intellectuelle", ar: "الملكية الفكرية" },
        body: {
          fr: "Les textes, photos, logos et éléments graphiques de ce site appartiennent à {store} ou sont utilisés avec autorisation. Toute reproduction sans accord écrit est interdite. Les marques citées appartiennent à leurs propriétaires respectifs.",
          ar: "النصوص والصور والشعارات والعناصر الرسومية في هذا الموقع ملك لـ {store} أو مستعملة بترخيص. يُمنع أي نسخ دون موافقة كتابية. العلامات المذكورة ملك لأصحابها.",
        },
      },
      {
        key: "mentions_liability",
        title: { fr: "Responsabilité", ar: "المسؤولية" },
        body: {
          fr: "Nous veillons à l'exactitude des informations publiées (descriptions, prix, disponibilité). Une erreur manifeste de prix ou de description ne peut engager la boutique ; elle est corrigée lors de l'appel de confirmation, avant toute expédition.",
          ar: "نحرص على دقة المعلومات المنشورة (الأوصاف، الأسعار، التوفر). الخطأ الواضح في السعر أو الوصف لا يُلزم المتجر، ويُصحَّح أثناء مكالمة التأكيد قبل أي شحن.",
        },
      },
      {
        key: "mentions_contact",
        title: { fr: "Contact", ar: "التواصل" },
        body: {
          fr: "Téléphone : {phone}\n\nE-mail : {email}",
          ar: "الهاتف: {phone}\n\nالبريد الإلكتروني: {email}",
        },
      },
    ],
  },

  cgv: {
    title: { fr: "Conditions générales de vente", ar: "شروط البيع العامة" },
    intro: {
      fr: "Ces conditions s'appliquent à toute commande passée sur {domain}. Valider une commande vaut acceptation de ces conditions.",
      ar: "تُطبَّق هذه الشروط على كل طلب يتم عبر {domain}. تأكيد الطلب يعني قبول هذه الشروط.",
    },
    updated: UPDATED,
    sections: [
      {
        key: "cgv_seller",
        title: { fr: "Vendeur", ar: "البائع" },
        body: {
          fr: "Les produits sont vendus par {store}, dont l'identification complète figure dans les mentions légales.",
          ar: "تُباع المنتجات من طرف {store}، ومعلومات تعريفه الكاملة موجودة في الإشعارات القانونية.",
        },
      },
      {
        key: "cgv_products",
        title: { fr: "Produits et prix", ar: "المنتجات والأسعار" },
        body: {
          fr: "Les prix sont indiqués en dinars algériens (DA). Les frais de livraison s'ajoutent selon la wilaya et le mode de livraison, et sont affichés avant la validation. Les offres et promotions sont valables pendant leur période d'affichage et dans la limite des stocks.",
          ar: "الأسعار معروضة بالدينار الجزائري (دج). تُضاف تكاليف التوصيل حسب الولاية وطريقة الاستلام، وتظهر قبل التأكيد. العروض والتخفيضات صالحة خلال مدة عرضها وفي حدود المخزون.",
        },
      },
      {
        key: "cgv_order",
        title: { fr: "Commande", ar: "الطلب" },
        body: {
          fr: "La commande est enregistrée lorsque vous la validez sur le site ; un numéro de commande vous est alors attribué. Elle devient définitive après l'appel de confirmation. Nous pouvons refuser une commande anormale (quantités inhabituelles, coordonnées invalides, refus répétés).",
          ar: "يُسجَّل الطلب عند تأكيدك له في الموقع، ويُمنح لك رقم طلب. يصبح نهائيًا بعد مكالمة التأكيد. يمكننا رفض طلب غير عادي (كميات غير معتادة، معلومات غير صحيحة، رفض متكرر).",
        },
      },
      {
        key: "cgv_delivery",
        title: { fr: "Livraison", ar: "التوصيل" },
        body: {
          fr: "Les délais et modalités de livraison sont détaillés sur la page « Livraison, paiement & retours ». Les délais sont indicatifs.",
          ar: "مُدد وطرق التوصيل مفصّلة في صفحة «التوصيل والدفع والإرجاع». المدد تقريبية.",
        },
      },
      {
        key: "cgv_payment",
        title: { fr: "Paiement", ar: "الدفع" },
        body: {
          fr: "Le paiement s'effectue exclusivement à la livraison, en espèces, au livreur. Aucun paiement n'est demandé sur le site.",
          ar: "يتم الدفع حصريًا عند الاستلام، نقدًا، لعون التوصيل. لا يُطلب أي دفع عبر الموقع.",
        },
      },
      {
        key: "cgv_returns",
        title: { fr: "Retour d'un produit non conforme", ar: "إرجاع منتج غير مطابق" },
        body: {
          fr: "Conformément à l'article 23 de la loi 18-05, en cas de livraison d'un produit non conforme à la commande ou défectueux, vous disposez de 4 jours ouvrables à compter de la livraison pour nous le signaler et le retourner. Nous procédons alors à la livraison d'un produit conforme, à la réparation ou au remboursement.",
          ar: "طبقًا للمادة 23 من القانون 18-05، في حال تسليم منتج غير مطابق للطلب أو معيب، لديك 4 أيام عمل من تاريخ الاستلام لإبلاغنا وإرجاعه. نقوم حينها بتسليم منتج مطابق أو تصليحه أو إرجاع المبلغ.",
        },
      },
      {
        key: "cgv_warranty",
        title: { fr: "Garantie légale", ar: "الضمان القانوني" },
        body: {
          fr: "Les produits bénéficient de la garantie prévue par la loi 09-03 relative à la protection du consommateur et à la répression des fraudes.",
          ar: "تستفيد المنتجات من الضمان المنصوص عليه في القانون 09-03 المتعلق بحماية المستهلك وقمع الغش.",
        },
      },
      {
        key: "cgv_disputes",
        title: { fr: "Litiges", ar: "النزاعات" },
        body: {
          fr: "Ces conditions sont régies par le droit algérien. En cas de désaccord, contactez-nous d'abord : nous cherchons toujours une solution amiable. À défaut, les juridictions algériennes compétentes peuvent être saisies.",
          ar: "تخضع هذه الشروط للقانون الجزائري. في حال وجود خلاف، تواصل معنا أولًا: نبحث دائمًا عن حل ودي. وإلا يمكن اللجوء إلى الجهات القضائية الجزائرية المختصة.",
        },
      },
    ],
  },

  privacy: {
    title: { fr: "Politique de confidentialité", ar: "سياسة الخصوصية" },
    intro: {
      fr: "Comment {store} traite vos données personnelles, conformément à la loi 18-07 relative à la protection des personnes physiques dans le traitement des données à caractère personnel.",
      ar: "كيف يعالج {store} معطياتك الشخصية، طبقًا للقانون 18-07 المتعلق بحماية الأشخاص الطبيعيين في مجال معالجة المعطيات ذات الطابع الشخصي.",
    },
    updated: UPDATED,
    sections: [
      {
        key: "privacy_data",
        title: { fr: "Données collectées", ar: "المعطيات المجمّعة" },
        body: {
          fr: "Lors d'une commande : nom, numéro de téléphone, wilaya, commune, mode de livraison, langue et contenu de la commande. Nous ne créons pas de compte client et ne collectons aucune donnée bancaire.",
          ar: "عند الطلب: الاسم، رقم الهاتف، الولاية، البلدية، طريقة التوصيل، اللغة ومحتوى الطلب. لا ننشئ حسابات زبائن ولا نجمع أي معطيات بنكية.",
        },
      },
      {
        key: "privacy_purpose",
        title: { fr: "Pourquoi", ar: "لماذا" },
        body: {
          fr: "- Traiter et confirmer votre commande, puis la livrer.\n- Vous contacter au sujet de cette commande (appel, WhatsApp).\n- Avec votre accord uniquement : mesurer l'efficacité de nos publicités (pixels Meta et TikTok).",
          ar: "- معالجة طلبك وتأكيده ثم توصيله.\n- التواصل معك بخصوص هذا الطلب (مكالمة، واتساب).\n- بموافقتك فقط: قياس فعالية إعلاناتنا (بكسلات ميتا وتيك توك).",
        },
      },
      {
        key: "privacy_recipients",
        title: { fr: "Destinataires", ar: "المستلمون" },
        body: {
          fr: "Vos données sont accessibles à notre équipe et transmises à la société de livraison pour acheminer le colis. Elles sont hébergées par nos prestataires techniques (Vercel, Supabase). Nous ne vendons jamais vos données.",
          ar: "يطّلع على معطياتك فريقنا، وتُرسل إلى شركة التوصيل لإيصال الطرد. تُستضاف لدى مزوّدينا التقنيين (Vercel وSupabase). لا نبيع معطياتك أبدًا.",
        },
      },
      {
        key: "privacy_retention",
        title: { fr: "Durée de conservation", ar: "مدة الحفظ" },
        body: {
          fr: "Les données de commande sont conservées le temps nécessaire au suivi de la commande, au service après-vente et à nos obligations légales et comptables, puis supprimées.",
          ar: "تُحفظ معطيات الطلب المدة اللازمة لمتابعة الطلب وخدمة ما بعد البيع والتزاماتنا القانونية والمحاسبية، ثم تُحذف.",
        },
      },
      {
        key: "privacy_rights",
        title: { fr: "Vos droits", ar: "حقوقك" },
        body: {
          fr: "Vous disposez d'un droit d'accès, de rectification, d'opposition et de suppression de vos données (loi 18-07). Pour l'exercer, contactez-nous au {phone} ou à {email}. Vous pouvez aussi saisir l'Autorité nationale de protection des données à caractère personnel (ANPDP).",
          ar: "لك حق الاطلاع على معطياتك وتصحيحها والاعتراض على معالجتها وحذفها (القانون 18-07). لممارسة هذا الحق، تواصل معنا على {phone} أو {email}. ويمكنك أيضًا اللجوء إلى السلطة الوطنية لحماية المعطيات ذات الطابع الشخصي.",
        },
      },
      {
        key: "privacy_security",
        title: { fr: "Sécurité", ar: "الأمان" },
        body: {
          fr: "Le site est servi en HTTPS ; l'accès aux commandes est réservé à l'équipe de la boutique, protégé par mot de passe et par des règles d'accès au niveau de la base de données.",
          ar: "يعمل الموقع عبر HTTPS، والاطلاع على الطلبات مقتصر على فريق المتجر، محمي بكلمة سر وبقواعد وصول على مستوى قاعدة البيانات.",
        },
      },
    ],
  },

  cookies: {
    title: { fr: "Cookies et stockage", ar: "ملفات تعريف الارتباط والتخزين" },
    intro: {
      fr: "Ce site utilise le stockage de votre navigateur pour fonctionner et, uniquement avec votre accord, des traceurs publicitaires.",
      ar: "يستعمل هذا الموقع تخزين متصفحك ليعمل، ويستعمل متتبعات إعلانية فقط بموافقتك.",
    },
    updated: UPDATED,
    sections: [
      {
        key: "cookies_essential",
        title: { fr: "Indispensables (toujours actifs)", ar: "ضرورية (مفعّلة دائمًا)" },
        body: {
          fr: "- auto-market-cart : le contenu de votre panier.\n- auto-market-lang : la langue choisie.\n- auto-market-theme : le thème clair ou sombre.\n- auto-market-consent : votre choix concernant les cookies.\n\nCes données restent dans votre navigateur et ne servent qu'au fonctionnement du site.",
          ar: "- auto-market-cart: محتوى سلتك.\n- auto-market-lang: اللغة المختارة.\n- auto-market-theme: المظهر الفاتح أو الداكن.\n- auto-market-consent: اختيارك بخصوص ملفات تعريف الارتباط.\n\nتبقى هذه المعطيات في متصفحك ولا تُستعمل إلا لتشغيل الموقع.",
        },
      },
      {
        key: "cookies_ads",
        title: { fr: "Mesure publicitaire (avec votre accord)", ar: "قياس الإعلانات (بموافقتك)" },
        body: {
          fr: "Si vous l'acceptez, les pixels Meta (Facebook, Instagram) et TikTok déposent des cookies (_fbp, _ttp…) pour mesurer les visites et commandes issues de nos publicités. Sans votre accord, aucun de ces scripts n'est chargé.",
          ar: "إذا وافقت، تضع بكسلات ميتا (فيسبوك، إنستغرام) وتيك توك ملفات تعريف الارتباط (_fbp، _ttp…) لقياس الزيارات والطلبات القادمة من إعلاناتنا. دون موافقتك، لا يُحمَّل أي من هذه البرامج.",
        },
      },
      {
        key: "cookies_manage",
        title: { fr: "Changer d'avis", ar: "تغيير اختيارك" },
        body: {
          fr: "Vous pouvez modifier votre choix à tout moment avec le lien « Gérer les cookies » en bas de chaque page, ou effacer les données du site dans les réglages de votre navigateur.",
          ar: "يمكنك تغيير اختيارك في أي وقت عبر رابط «إدارة ملفات تعريف الارتباط» أسفل كل صفحة، أو بحذف بيانات الموقع من إعدادات متصفحك.",
        },
      },
    ],
  },
};
