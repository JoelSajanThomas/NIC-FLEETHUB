(()=>{
const $ = s => document.querySelector(s), $$ = s => document.querySelectorAll(s);
const R = $("#root");
const API_BASE = window.FLEETHUB_API_BASE || (document.querySelector('meta[name="fleethub-api-base"]')?.content) || "";
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const rs = (n, cur = "KWD") => {
  const num = Number(n || 0);
  if (cur === "KWD") {
    const formatted = num.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    return CUR_LANG === "ar" ? `${formatted} د.ك` : `${formatted} KWD`;
  }
  const formatted = num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${formatted} ${cur}`;
};

let ME = null, HIST = [], LIVE_ALERTS = { total: 0 };
let CUR_LANG = localStorage.getItem("fleethub_lang") || "en";

// ---------------- 1. MULTILINGUAL TRANSLATIONS (EN, HI, AR ONLY) ----------------
const I18N = {
  en: {
    app_title: "NIC FleetHub",
    app_subtitle: "Enterprise Fleet, Workshop & Inventory Management Console",
    global_search: "Global Search: Reg No, Asset ID, VIN, Chassis, Engine, Serial, Model, Operator...",
    alerts: "Alerts",
    sign_out: "Sign Out",
    sign_in: "Sign In",
    username: "Username",
    password: "Password",
    back_to_site: "Back to Website",
    back: "← Back",
    submit: "Submit",
    cancel: "Cancel",
    close: "Close",
    edit: "Edit",
    archive: "Archive Asset",
    restore: "Restore Asset",
    print_history: "Print Full History",
    actions: "Actions",
    status: "Status",
    priority: "Priority",
    date: "Date",
    details: "Details",
    all_healthy: "All healthy",
    cards_view: "Cards",
    table_view: "Table",
    more_details: "More Details ▾",
    hide_details: "Hide Details ▴",
    all_kpis: "Show All Metrics ▾",
    collapse_kpis: "Show Fewer Metrics ▴",
    quick_search: "Search fleet or inventory...",
    menu: "Menu",
    more_modules: "More Modules",
    install_app: "📱 Install FleetHub App",
    // Nav items
    nav_dash: "Dashboard",
    nav_assets: "Assets",
    nav_comp: "Complaints",
    nav_wo: "Work Orders",
    nav_parts: "Inventory",
    nav_pur: "Purchases",
    nav_sup: "Suppliers",
    nav_exp: "Expenses",
    nav_hist: "Historical Records",
    nav_reports: "Reports",
    nav_ws: "Worksites",
    nav_admin: "Users & Backups",
    // Dashboard KPIs
    kpi_reg_fleet: "Total Registered Fleet",
    kpi_active: "Active In Service",
    kpi_repair: "Under Repair",
    kpi_out_service: "Out of Service",
    kpi_open_wo: "Open Work Orders",
    kpi_waiting_parts: "Waiting for Parts / Purchase",
    kpi_pending_insp: "Pending Inspection",
    kpi_new_comp: "New Complaints",
    kpi_low_stock: "Low Stock Alerts",
    kpi_pending_pur: "Pending Purchases",
    kpi_exp_docs: "Expiring Documents",
    kpi_suppliers: "Registered Suppliers",
    kpi_hist_records: "Digitized Historical Records",
    monthly_trend: "Maintenance Expenses (Monthly Trend)",
    total_maint_spend: "Total Recorded Maintenance Expenditure:",
    cat_distribution: "Fleet Category Distribution",
    recent_operations: "Recent Maintenance Operations",
    view_alert_center: "View Alert Center →",
    attention_req: "Attention Required:",
    // Voice - Strictly English, Hindi, Arabic -> English
    voice_rec: "🎙️ Multilingual Voice Recognition (English / हिन्दी / العربية)",
    voice_start: "🎙️ Start Voice Recording",
    voice_stop: "⏹️ Stop & Process",
    voice_pause: "⏸️ Pause",
    voice_resume: "▶️ Resume",
    voice_rerecord: "🔄 Re-record",
    voice_discard: "✕ Discard",
    voice_apply: "✓ Apply English to Form",
    voice_upload: "📁 Upload Audio",
    voice_instruction: "Speak in English, Hindi, or Arabic. The system automatically detects the language and converts Hindi & Arabic into clear English.",
    voice_rec_active: "🔴 Recording in progress... Speak now in English, Hindi or Arabic",
    voice_processing: "Processing speech & detecting language...",
    voice_translating: "Translating to English...",
    voice_success: "Transcription & English translation completed.",
    voice_failed: "Speech recognition failed. Please try again.",
    voice_orig: "Spoken Original Transcript:",
    voice_trans: "English Translation (Editable Review):",
    voice_detected_lang: "Detected Language:",
    // AI Document Scanner & Auto-Fill
    doc_ai_title: "AI Multilingual Document Detection & Auto-Fill",
    doc_ai_step_uploaded: "📄 Uploaded",
    doc_ai_step_lang: "🌐 Language",
    doc_ai_step_ocr: "🔍 Read & OCR",
    doc_ai_step_fill: "⚡ Auto-Fill",
    doc_ai_detecting: "Detecting language & extracting fields...",
    doc_ai_ready: "Fields auto-filled. Please review and edit before saving.",
    doc_ai_verified: "✓ Calculations Verified",
    // Status Chips
    st_active: "Active",
    st_under_repair: "Under Repair",
    st_out_of_service: "Out of Service",
    st_new: "New",
    st_approved: "Approved",
    st_rejected: "Rejected",
    st_in_progress: "In Progress",
    st_completed: "Completed",
    st_released: "Released",
    st_verified: "Verified",
    st_unverified: "Unverified",
    // Kuwait Specific
    plate_category: "Kuwait Plate Category",
    daftar_expiry: "Traffic Reg Expiry (Daftar)",
    fahs_expiry: "Technical Inspection (Fahs Fanni)",
    governorate: "Kuwait Governorate",
    paci_no: "Kuwait PACI Number",
    civil_id: "Civil ID",
    transfer_asset: "Transfer Worksite",
    curr_kwd: "Kuwaiti Dinar (KWD)",
    demo_mgmt: "Demo Data Management",
    demo_load: "Load Demo Data",
    demo_view: "View Demo Data",
    demo_clear: "CLEAR ALL DEMO DATA",
    demo_active: "Demo Data Loaded",
    demo_none: "No Demo Data Loaded"
  },
  hi: {
    app_title: "एनआईसी फ्लीटहब",
    app_subtitle: "फ्लीट, वर्कशॉप, स्पेयर पार्ट्स एवं मेंटेनेंस प्रबंधन कंसोल",
    global_search: "ग्लोबल सर्च: वाहन नंबर, आईडी, चेसिस, इंजन, सीरियल, मॉडल...",
    alerts: "अलर्ट्स",
    sign_out: "साइन आउट",
    sign_in: "साइन इन",
    username: "यूज़रनेम",
    password: "पासवर्ड",
    back_to_site: "वेबसाइट पर वापस जाएं",
    back: "← पीछे",
    submit: "सबमिट करें",
    cancel: "रद्द करें",
    close: "बंद करें",
    edit: "संपादित करें",
    archive: "आर्काइव करें",
    restore: "पुनर्स्थापित करें",
    print_history: "पूरा इतिहास प्रिंट करें",
    actions: "कार्रवाई",
    status: "स्थिति",
    priority: "प्राथमिकता",
    date: "दिनांक",
    details: "विवरण",
    all_healthy: "सब सामान्य है",
    cards_view: "कार्ड्स",
    table_view: "तालिका",
    more_details: "अधिक विवरण ▾",
    hide_details: "कम विवरण ▴",
    all_kpis: "सभी मेट्रिक्स देखें ▾",
    collapse_kpis: "कम मेट्रिक्स देखें ▴",
    quick_search: "खोजें...",
    menu: "मेनू",
    more_modules: "अन्य मॉड्यूल",
    install_app: "📱 ऐप इंस्टॉल करें",
    nav_dash: "डैशबोर्ड",
    nav_assets: "वाहन एवं मशीनरी",
    nav_comp: "शिकायतें व ब्रेकडाउन",
    nav_wo: "वर्क ऑर्डर्स",
    nav_parts: "इन्वेंट्री व पार्ट्स",
    nav_pur: "बाहरी खरीद",
    nav_sup: "आपूर्तिकर्ता",
    nav_exp: "रखरखाव खर्च",
    nav_hist: "पुराने कागजी रिकॉर्ड",
    nav_reports: "रिपोर्ट्स",
    nav_ws: "कार्यस्थल",
    nav_admin: "यूज़र्स व बैकअप",
    kpi_reg_fleet: "कुल पंजीकृत फ्लीट",
    kpi_active: "सक्रिय वाहन",
    kpi_repair: "मरम्मत अधीन",
    kpi_out_service: "सेवा से बाहर",
    kpi_open_wo: "खुले वर्क ऑर्डर्स",
    kpi_waiting_parts: "पार्ट्स हेतु प्रतीक्षारत",
    kpi_pending_insp: "निरीक्षण हेतु लंबित",
    kpi_new_comp: "नई शिकायतें",
    kpi_low_stock: "कम स्टॉक चेतावनी",
    kpi_pending_pur: "लंबित खरीद अनुरोध",
    kpi_exp_docs: "समाप्त होने वाले दस्तावेज",
    kpi_suppliers: "पंजीकृत सप्लायर्स",
    kpi_hist_records: "डिजिटाइज्ड पुराने रिकॉर्ड",
    monthly_trend: "मासिक रखरखाव व्यय रुझान",
    total_maint_spend: "कुल दर्ज रखरखाव व्यय:",
    cat_distribution: "फ्लीट श्रेणी वितरण",
    recent_operations: "हालिया रखरखाव गतिविधियां",
    view_alert_center: "अलर्ट केंद्र देखें →",
    attention_req: "ध्यान देने योग्य:",
    voice_rec: "🎙️ बहुभाषी वॉइस पहचान (English / हिन्दी / العربية)",
    voice_start: "🎙️ रिकॉर्डिंग शुरू करें",
    voice_stop: "⏹️ रोकें एवं अनुवाद करें",
    voice_pause: "⏸️ रोकें",
    voice_resume: "▶️ जारी रखें",
    voice_rerecord: "🔄 पुनः रिकॉर्ड करें",
    voice_discard: "✕ रद्द करें",
    voice_apply: "✓ अंग्रेजी अनुवाद फॉर्म में लागू करें",
    voice_upload: "📁 ऑडियो अपलोड करें",
    voice_instruction: "हिन्दी, अरबी या अंग्रेजी में बोलें। सॉफ्टवेयर आपकी आवाज का स्वतः अंग्रेजी में अनुवाद करेगा।",
    voice_rec_active: "🔴 रिकॉर्डिंग चालू... बोलें",
    voice_processing: "भाषा की पहचान की जा रही है...",
    voice_translating: "अंग्रेजी में अनुवाद हो रहा है...",
    voice_success: "ट्रांसक्रिप्शन एवं अंग्रेजी अनुवाद पूर्ण।",
    voice_failed: "पहचान विफल रही। कृपया पुनः प्रयास करें।",
    voice_orig: "बोला गया मूल विवरण:",
    voice_trans: "अंग्रेजी अनुवाद (समीक्षा एवं संपादन):",
    voice_detected_lang: "पहचानी गई भाषा:",
    doc_ai_title: "एआई बहुभाषी दस्तावेज पहचान एवं स्वतः फॉर्म-भरण",
    doc_ai_step_uploaded: "📄 अपलोड हुआ",
    doc_ai_step_lang: "🌐 भाषा",
    doc_ai_step_ocr: "🔍 ओसीआर एवं वाचन",
    doc_ai_step_fill: "⚡ स्वतः भरें",
    doc_ai_detecting: "भाषा की पहचान एवं डेटा निकाला जा रहा है...",
    doc_ai_ready: "फॉर्म फ़ील्ड स्वतः भर गए हैं। कृपया समीक्षा करें।",
    doc_ai_verified: "✓ गणनाएं सत्यापित (मात्रा × दर = कुल)",
    st_active: "सक्रिय",
    st_under_repair: "मरम्मत में",
    st_out_of_service: "बंद",
    st_new: "नया",
    st_approved: "स्वीकृत",
    st_rejected: "अस्वीकृत",
    st_in_progress: "प्रगति पर",
    st_completed: "पूर्ण",
    st_released: "रिलीज्ड",
    st_verified: "सत्यापित",
    st_unverified: "असत्यापित",
    // Kuwait Specific
    plate_category: "कुवैत नंबर प्लेट श्रेणी",
    daftar_expiry: "पंजीकरण समाप्ति (दफ्तर)",
    fahs_expiry: "तकनीकी निरीक्षण (फहस फन्नी)",
    governorate: "कुवैत प्रान्त (गवर्नरेट)",
    paci_no: "कुवैत पाकी (PACI) नंबर",
    civil_id: "सिविल आईडी",
    transfer_asset: "कार्यस्थल स्थानांतरण",
    curr_kwd: "कुवैती दिनार (KWD)",
    demo_mgmt: "डेमो डेटा प्रबंधन",
    demo_load: "डेमो डेटा लोड करें",
    demo_view: "डेमो डेटा देखें",
    demo_clear: "सभी डेमो डेटा हटाएं",
    demo_active: "डेमो डेटा सक्रिय",
    demo_none: "कोई डेमो डेटा नहीं है"
  },
  ar: {
    app_title: "إن آي سي فليت هب",
    app_subtitle: "نظام إدارة الأسطول والمعدات الثقيلة والورشة والمخزون",
    global_search: "البحث الشامل: رقم اللوحة، رمز المعدة، رقم الشاسيه، المحرك، الرقم التسلسلي...",
    alerts: "التنبيهات",
    sign_out: "تسجيل الخروج",
    sign_in: "تسجيل الدخول",
    username: "اسم المستخدم",
    password: "كلمة المرور",
    back_to_site: "العودة للموقع",
    back: "→ رجوع",
    submit: "حفظ وإرسال",
    cancel: "إلغاء",
    close: "إغلاق",
    edit: "تعديل",
    archive: "أرشفة",
    restore: "استعادة",
    print_history: "طباعة السجل الكامل",
    actions: "الإجراءات",
    status: "الحالة",
    priority: "الأولوية",
    date: "التاريخ",
    details: "التفاصيل",
    all_healthy: "الوضع ممتاز",
    cards_view: "بطاقات",
    table_view: "جدول",
    more_details: "تفاصيل إضافية ▾",
    hide_details: "إخفاء التفاصيل ▴",
    all_kpis: "عرض كافة المؤشرات ▾",
    collapse_kpis: "عرض أقل ▴",
    quick_search: "بحث في الأسطول...",
    menu: "القائمة",
    more_modules: "المزيد من الأقسام",
    install_app: "📱 تثبيت التطبيق",
    nav_dash: "لوحة التحكم",
    nav_assets: "الأسطول والمعدات",
    nav_comp: "البلاغات والأعطال",
    nav_wo: "أوامر العمل",
    nav_parts: "المستودع وقطع الغيار",
    nav_pur: "المشتريات الخارجية",
    nav_sup: "الموردين والورش",
    nav_exp: "تكاليف الصيانة",
    nav_hist: "السجلات الورقية السابقة",
    nav_reports: "التقارير",
    nav_ws: "مواقع العمل",
    nav_admin: "المستخدمين والنسخ الاحتياطي",
    kpi_reg_fleet: "إجمالي الأسطول المسجل",
    kpi_active: "معدات في الخدمة",
    kpi_repair: "تحت الصيانة",
    kpi_out_service: "خارج الخدمة",
    kpi_open_wo: "أوامر العمل المفتوحة",
    kpi_waiting_parts: "في انتظار قطع الغيار",
    kpi_pending_insp: "في انتظار الفحص النهائي",
    kpi_new_comp: "شكاوى وأعطال جديدة",
    kpi_low_stock: "تنبيهات نقص المخزون",
    kpi_pending_pur: "طلبات شراء معلقة",
    kpi_exp_docs: "وثائق قاربت على الانتهاء",
    kpi_suppliers: "الموردين المعتمدين",
    kpi_hist_records: "سجلات ورقية مرقمنة",
    monthly_trend: "المصروفات الشهرية للصيانة",
    total_maint_spend: "إجمالي مصروفات الصيانة المسجلة:",
    cat_distribution: "توزيع فئات الأسطول",
    recent_operations: "أحدث عمليات الورشة",
    view_alert_center: "عرض مركز التنبيهات ←",
    attention_req: "ملاحظات هامة تتطلب تدخلاً:",
    voice_rec: "🎙️ التعرف الصوتي الذكي (English / العربية / हिन्दी)",
    voice_start: "🎙️ بدء التسجيل الصوتي",
    voice_stop: "⏹️ إنهاء ومعالجة الصوت",
    voice_pause: "⏸️ إيقاف مؤقت",
    voice_resume: "▶️ استئناف",
    voice_rerecord: "🔄 إعادة التسجيل",
    voice_discard: "✕ إلغاء",
    voice_apply: "✓ تطبيق النص الإنجليزي في النموذج",
    voice_upload: "📁 رفع ملف صوتي",
    voice_instruction: "تحدث بالعربية أو الإنجليزية أو الهندية. يتعرف النظام تلقائياً على اللغة ويترجم العربية والهندية مباشرة إلى إنجليزية واضحة.",
    voice_rec_active: "🔴 جاري التسجيل الصوتي... تحدث الآن",
    voice_processing: "جاري تحليل الصوت وتحديد اللغة...",
    voice_translating: "جاري الترجمة الفورية إلى الإنجليزية...",
    voice_success: "اكتمل التعرف والترجمة إلى الإنجليزية بنجاح.",
    voice_failed: "فشل التعرف على الصوت. يرجى المحاولة مجدداً.",
    voice_orig: "النص المنطوق الأصلي:",
    voice_trans: "الترجمة الإنجليزية (مراجعة وتعديل):",
    voice_detected_lang: "اللغة المكتشفة تلقائياً:",
    doc_ai_title: "التعرف الذكي على الوثائق والتعبئة التلقائية",
    doc_ai_step_uploaded: "📄 تم الرفع",
    doc_ai_step_lang: "🌐 لغة المستند",
    doc_ai_step_ocr: "🔍 قراءة وتحليل",
    doc_ai_step_fill: "⚡ تعبئة تلقائية",
    doc_ai_detecting: "جاري اكتشاف اللغة واستخراج حقول الفاتورة...",
    doc_ai_ready: "تمت تعبئة الحقول تلقائياً. يرجى المراجعة والاعتماد.",
    doc_ai_verified: "✓ الحسابات الرياضية مدققة ومطابقة",
    st_active: "نشط بالخدمة",
    st_under_repair: "تحت الإصلاح",
    st_out_of_service: "متوقف",
    st_new: "جديد",
    st_approved: "معتمد",
    st_rejected: "مرفوض",
    st_in_progress: "قيد التنفيذ",
    st_completed: "مكتمل",
    st_released: "تم الإفراج",
    st_verified: "موثق بالكامل",
    st_unverified: "بيانات غير مكتملة",
    // Kuwait Specific
    plate_category: "نوع لوحة المركبة (الكويت)",
    daftar_expiry: "انتهاء دفتر المركبة (المرور)",
    fahs_expiry: "الفحص الفني الدوري",
    governorate: "المحافظة",
    paci_no: "الرقم الآلي للعنوان (PACI)",
    civil_id: "الرقم المدني",
    transfer_asset: "نقل موقع العمل",
    curr_kwd: "دينار كويتي (د.ك)",
    demo_mgmt: "إدارة البيانات التجريبية",
    demo_load: "تحميل البيانات التجريبية",
    demo_view: "عرض البيانات التجريبية",
    demo_clear: "مسح كافة البيانات التجريبية",
    demo_active: "البيانات التجريبية نشطة",
    demo_none: "لا توجد بيانات تجريبية"
  }
};

const t = (k, fallback = "") => (I18N[CUR_LANG] && I18N[CUR_LANG][k]) || (I18N.en && I18N.en[k]) || fallback || k;

function applyLanguageLayout() {
  document.documentElement.lang = CUR_LANG;
  if (CUR_LANG === "ar") {
    document.documentElement.dir = "rtl";
    document.body.classList.add("rtl-mode");
  } else {
    document.documentElement.dir = "ltr";
    document.body.classList.remove("rtl-mode");
  }
}
applyLanguageLayout();

const can = p => !ME ? false : (ME.perms.includes("*") || ME.perms.includes(p));
const any = (...p) => p.some(can);

const toast = msg => {
  const e = $("#t");
  e.textContent = msg;
  e.classList.add("on");
  clearTimeout(toast.i);
  toast.i = setTimeout(() => e.classList.remove("on"), 3200);
};

async function api(p, o) {
  let cleanPath = p.startsWith("/api/") ? p.substring(4) : (p.startsWith("/api") ? p.substring(4) : p);
  if (!cleanPath.startsWith("/")) cleanPath = "/" + cleanPath;
  const token = localStorage.getItem("fleethub_token");
  const headers = { ...(o?.headers || {}) };
  if (token && cleanPath !== "/login") headers["Authorization"] = "Bearer " + token;
  const r = await fetch(API_BASE + "/api" + cleanPath, { credentials: "include", ...o, headers });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 401) {
      localStorage.removeItem("fleethub_token");
      if (ME) {
        ME = null;
        boot();
      }
    }
    throw Error(j.error || r.statusText || "Request failed");
  }
  return j;
}

const send = (m, p, o) => api(p, o instanceof FormData ? { method: m, body: o } : { method: m, headers: { "Content-Type": "application/json" }, body: JSON.stringify(o || {}) });
const post = (p, o) => send("POST", p, o);
const put = (p, o) => send("PUT", p, o);
const fj = fd => {
  const o = {};
  fd.forEach((v, k) => { if (!(v instanceof File)) o[k] = v; });
  return o;
};

const chip = s => {
  const m = {
    New: "c-reported", "Info Requested": "c-assigned", Approved: "c-verified", Rejected: "c-reported",
    Active: "c-done", "Under Repair": "c-assigned", "Out of Service": "c-reported", Retired: "c-reported",
    Released: "c-done", "In Progress": "c-in-progress", Completed: "c-done", Purchased: "c-done",
    Requested: "c-assigned", "Waiting for Spare Parts": "c-assigned", "Waiting for External Purchase": "c-assigned",
    "Pending Inspection": "c-verified", "Inspection Approved": "c-done", Verified: "c-done", Unverified: "c-reported"
  };
  const labelMap = {
    Active: t("st_active"), "Under Repair": t("st_under_repair"), "Out of Service": t("st_out_of_service"),
    New: t("st_new"), Approved: t("st_approved"), Rejected: t("st_rejected"), "In Progress": t("st_in_progress"),
    Completed: t("st_completed"), Released: t("st_released"), Verified: t("st_verified"), Unverified: t("st_unverified")
  };
  return `<span class="chip ${m[s] || "c-verified"}">${esc(labelMap[s] || s)}</span>`;
};

// ---------------- 2. VOICE RECORDER & AUTOMATIC TRANSLATION MODULE ----------------
let VOICE_STATE = {
  mediaRecorder: null,
  audioChunks: [],
  recognition: null,
  isRecording: false,
  isPaused: false,
  timerInterval: null,
  seconds: 0,
  targetInput: null,
  transcript: "",
  audioBlob: null
};

function setupVoiceRecorder(targetName, container) {
  if (!container) return;
  let activeLang = "auto"; // "auto", "en", "hi", "ar"

  const widget = document.createElement("div");
  widget.className = "voice-box";
  widget.innerHTML = `
    <div class="voice-hdr">
      <span style="font-size:.85rem;font-weight:600">🎙️ ${t("voice_rec")}</span>
      <div style="display:flex;align-items:center;gap:.4rem;flex-wrap:wrap">
        <span class="voice-timer" id="vTimer" style="display:none">00:00</span>
        <button type="button" class="voice-btn-mic" id="vBtnRec">🎙️ ${t("voice_start")}</button>
        <button type="button" class="voice-btn-mic" id="vBtnPause" style="display:none">⏸️ ${t("voice_pause")}</button>
        <label class="voice-btn-mic" style="margin:0;cursor:pointer" id="vLblUpload" title="Upload audio file (.webm, .wav, .mp3, .ogg, .m4a)">
          ${t("voice_upload")}
          <input type="file" id="vFileInput" accept="audio/*,.webm,.wav,.mp3,.ogg,.m4a" style="display:none">
        </label>
      </div>
    </div>
    
    <div class="voice-lang-tuner">
      <span style="font-size:.75rem;font-weight:600;color:var(--mu);margin-right:.25rem">Language:</span>
      <button type="button" class="voice-lang-pill active" data-lang="auto">⚡ Auto-Detect</button>
      <button type="button" class="voice-lang-pill" data-lang="en">English</button>
      <button type="button" class="voice-lang-pill" data-lang="hi">हिन्दी (Hindi)</button>
      <button type="button" class="voice-lang-pill" data-lang="ar">العربية (Arabic)</button>
    </div>

    <div id="vStatus" style="font-size:.8rem;color:var(--mu)">${t("voice_instruction")}</div>

    <div id="vPreview" style="display:none;margin-top:.5rem" class="voice-preview-card">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.4rem">
        <div style="display:flex;align-items:center;gap:.35rem">
          <span id="vLangBadge" class="voice-status-badge" style="background:#e0f2fe;color:#0369a1">Detected: English</span>
          <span id="vDurationBadge" class="chip" style="font-size:.7rem;padding:.1rem .4rem;display:none"></span>
        </div>
        <span style="font-size:.75rem;color:var(--mu)">AI description generated · Review and edit</span>
      </div>
      <audio id="vAudioPlayer" controls style="width:100%;height:2.25rem"></audio>
      <div id="vOrigBox">
        <b>${t("voice_orig")}</b>
        <div id="vOrigText" style="padding:.4rem .6rem;background:#f8fafc;border-radius:.4rem;border:1px solid #e2e8f0;color:#333;font-size:.85rem"></div>
      </div>
      <div id="vTransBox" style="display:none">
        <b style="color:#1e40af">English Translation:</b>
        <div id="vTransText" style="padding:.4rem .6rem;background:#eff6ff;border-radius:.4rem;border:1px solid #bfdbfe;color:#1e3a8a;font-size:.85rem"></div>
      </div>
      <div id="vDescBox">
        <b style="color:#15803d">🤖 AI-Generated Description / Note:</b>
        <textarea id="vTransInput" class="voice-review-edit" rows="3" placeholder="AI professional description will appear here..."></textarea>
      </div>
      <div class="voice-actions">
        <button type="button" class="voice-btn-apply" id="vBtnApply">✓ Apply to Form</button>
        <button type="button" class="btn g sm" id="vBtnReRec">${t("voice_rerecord")}</button>
        <button type="button" class="btn g sm" id="vBtnDiscard">${t("voice_discard")}</button>
      </div>
    </div>
  `;
  container.append(widget);

  const btnRec = widget.querySelector("#vBtnRec");
  const btnPause = widget.querySelector("#vBtnPause");
  const btnReRec = widget.querySelector("#vBtnReRec");
  const btnDiscard = widget.querySelector("#vBtnDiscard");
  const btnApply = widget.querySelector("#vBtnApply");
  const fileInput = widget.querySelector("#vFileInput");
  const vTimer = widget.querySelector("#vTimer");
  const vStatus = widget.querySelector("#vStatus");
  const vPreview = widget.querySelector("#vPreview");
  const vAudio = widget.querySelector("#vAudioPlayer");
  const vLangBadge = widget.querySelector("#vLangBadge");
  const vDurationBadge = widget.querySelector("#vDurationBadge");
  const vOrigText = widget.querySelector("#vOrigText");
  const vTransBox = widget.querySelector("#vTransBox");
  const vTransText = widget.querySelector("#vTransText");
  const vTransInput = widget.querySelector("#vTransInput");

  // Language pill selector
  widget.querySelectorAll(".voice-lang-pill").forEach(pill => {
    pill.onclick = () => {
      widget.querySelectorAll(".voice-lang-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      activeLang = pill.getAttribute("data-lang");
    };
  });

  async function processAudio(blob, initialTranscript = "") {
    if (blob) {
      vAudio.src = URL.createObjectURL(blob);
    }
    vStatus.textContent = t("voice_processing");

    const fd = new FormData();
    if (blob) {
      fd.append("audio", blob, blob.name || "voice_recording.webm");
    }
    fd.append("transcript", initialTranscript);
    fd.append("lang", activeLang === "auto" ? CUR_LANG : activeLang);
    fd.append("duration", VOICE_STATE.seconds || 0);
    fd.append("module", targetName === "remarks" ? "asset" : (targetName === "note" ? "work_order" : "complaint"));
    fd.append("field_name", targetName);

    try {
      vStatus.textContent = t("voice_translating");
      const res = await post("/voice/process", fd);
      vStatus.textContent = t("voice_success");
      vPreview.style.display = "grid";

      const origText = res.original_transcript || initialTranscript || "(Spoken audio captured)";
      const engText = res.english_translation || res.original_transcript || "";
      const aiDesc = res.ai_description || engText;
      const detLang = res.detected_lang || "en";
      const detLangName = res.detected_lang_name || (detLang === "hi" ? "Hindi" : (detLang === "ar" ? "Arabic" : "English"));

      vOrigText.textContent = origText;
      if (detLang !== "en" && engText && engText !== origText) {
        vTransBox.style.display = "block";
        vTransText.textContent = engText;
      } else {
        vTransBox.style.display = "none";
      }
      vTransInput.value = aiDesc;

      if (res.duration && res.duration > 0) {
        vDurationBadge.style.display = "inline-flex";
        vDurationBadge.textContent = `⏱️ ${Math.round(res.duration)}s`;
      }

      vLangBadge.textContent = `Detected: ${detLangName} (${detLang.toUpperCase()})`;
      if (detLang === "hi") {
        vLangBadge.style.background = "#fef3c7";
        vLangBadge.style.color = "#92400e";
      } else if (detLang === "ar") {
        vLangBadge.style.background = "#dbeafe";
        vLangBadge.style.color = "#1e40af";
      } else {
        vLangBadge.style.background = "#dcfce7";
        vLangBadge.style.color = "#166534";
      }

      // Automatically fill the target input with AI description
      const formInput = container.closest("form").querySelector(`[name="${targetName}"]`);
      if (formInput && aiDesc) {
        formInput.value = aiDesc;
        formInput.dispatchEvent(new Event("input", { bubbles: true }));
      }

      // Save hidden fields
      let hLang = container.querySelector('input[name="original_lang"]');
      if (!hLang) {
        hLang = document.createElement("input");
        hLang.type = "hidden";
        hLang.name = "original_lang";
        container.append(hLang);
      }
      hLang.value = detLang;

      let hTrans = container.querySelector('input[name="original_transcript"]');
      if (!hTrans) {
        hTrans = document.createElement("input");
        hTrans.type = "hidden";
        hTrans.name = "original_transcript";
        container.append(hTrans);
      }
      hTrans.value = origText;

      let hDesc = container.querySelector('input[name="ai_description"]');
      if (!hDesc) {
        hDesc = document.createElement("input");
        hDesc.type = "hidden";
        hDesc.name = "ai_description";
        container.append(hDesc);
      }
      hDesc.value = aiDesc;

      let hVoice = container.querySelector('input[name="voice_doc_id"]');
      if (!hVoice) {
        hVoice = document.createElement("input");
        hVoice.type = "hidden";
        hVoice.name = "voice_doc_id";
        container.append(hVoice);
      }
      if (res.audio_id) hVoice.value = res.audio_id;

    } catch (err) {
      vStatus.textContent = t("voice_failed") + " (" + err.message + ")";
    }
  }

  // Apply button handler
  btnApply.onclick = () => {
    const formInput = container.closest("form").querySelector(`[name="${targetName}"]`);
    if (formInput) {
      formInput.value = vTransInput.value;
      formInput.focus();
      formInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
    let hDesc = container.querySelector('input[name="ai_description"]');
    if (hDesc) hDesc.value = vTransInput.value;
    vStatus.textContent = "✓ Applied description to form.";
  };

  // Discard button handler
  btnDiscard.onclick = () => {
    vPreview.style.display = "none";
    vAudio.src = "";
    vOrigText.textContent = "";
    vTransInput.value = "";
    vStatus.textContent = t("voice_instruction");
  };

  // Re-record handler
  btnReRec.onclick = () => {
    vPreview.style.display = "none";
    vAudio.src = "";
    vOrigText.textContent = "";
    vTransInput.value = "";
    vStatus.textContent = t("voice_instruction");
    vTimer.style.display = "none";
    vTimer.textContent = "00:00";
    VOICE_STATE.seconds = 0;
  };

  // Upload file handler
  fileInput.onchange = async () => {
    if (fileInput.files && fileInput.files[0]) {
      const f = fileInput.files[0];
      await processAudio(f, "");
    }
  };

  // Pause / Resume handler
  btnPause.onclick = () => {
    if (!VOICE_STATE.isRecording || !VOICE_STATE.mediaRecorder) return;
    if (!VOICE_STATE.isPaused) {
      try {
        VOICE_STATE.mediaRecorder.pause();
        VOICE_STATE.isPaused = true;
        clearInterval(VOICE_STATE.timerInterval);
        btnPause.innerHTML = `▶️ ${t("voice_resume")}`;
        vStatus.textContent = "Recording paused.";
      } catch (e) {}
    } else {
      try {
        VOICE_STATE.mediaRecorder.resume();
        VOICE_STATE.isPaused = false;
        btnPause.innerHTML = `⏸️ ${t("voice_pause")}`;
        vStatus.textContent = t("voice_rec_active");
        VOICE_STATE.timerInterval = setInterval(() => {
          VOICE_STATE.seconds++;
          const mins = String(Math.floor(VOICE_STATE.seconds / 60)).padStart(2, "0");
          const secs = String(VOICE_STATE.seconds % 60).padStart(2, "0");
          vTimer.textContent = `${mins}:${secs}`;
        }, 1000);
      } catch (e) {}
    }
  };

  // Record button handler
  btnRec.onclick = async () => {
    if (VOICE_STATE.isRecording) {
      // STOP RECORDING
      VOICE_STATE.isRecording = false;
      VOICE_STATE.isPaused = false;
      btnRec.classList.remove("recording");
      btnRec.innerHTML = `🎙️ ${t("voice_start")}`;
      btnPause.style.display = "none";
      clearInterval(VOICE_STATE.timerInterval);
      vStatus.textContent = t("voice_processing");

      if (VOICE_STATE.mediaRecorder && VOICE_STATE.mediaRecorder.state !== "inactive") {
        VOICE_STATE.mediaRecorder.stop();
      }
      if (VOICE_STATE.recognition) {
        try { VOICE_STATE.recognition.stop(); } catch (e) {}
      }
    } else {
      // START RECORDING
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        VOICE_STATE.audioChunks = [];
        VOICE_STATE.transcript = "";
        VOICE_STATE.mediaRecorder = new MediaRecorder(stream);

        VOICE_STATE.mediaRecorder.ondataavailable = e => {
          if (e.data.size > 0) VOICE_STATE.audioChunks.push(e.data);
        };

        VOICE_STATE.mediaRecorder.onstop = async () => {
          stream.getTracks().forEach(track => track.stop());
          const audioBlob = new Blob(VOICE_STATE.audioChunks, { type: "audio/webm" });
          VOICE_STATE.audioBlob = audioBlob;
          await processAudio(audioBlob, VOICE_STATE.transcript);
        };

        // Browser speech recognition
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRec) {
          VOICE_STATE.recognition = new SpeechRec();
          VOICE_STATE.recognition.continuous = true;
          VOICE_STATE.recognition.interimResults = true;
          
          let targetLangCode = "en-US";
          if (activeLang === "hi") targetLangCode = "hi-IN";
          else if (activeLang === "ar") targetLangCode = "ar-SA";
          else if (activeLang === "en") targetLangCode = "en-US";
          else if (CUR_LANG === "hi") targetLangCode = "hi-IN";
          else if (CUR_LANG === "ar") targetLangCode = "ar-SA";

          VOICE_STATE.recognition.lang = targetLangCode;
          VOICE_STATE.recognition.onresult = event => {
            let finalStr = "";
            for (let i = 0; i < event.results.length; i++) {
              finalStr += event.results[i][0].transcript + " ";
            }
            VOICE_STATE.transcript = finalStr.trim();
            vStatus.textContent = "Listening (" + targetLangCode + "): " + VOICE_STATE.transcript;
          };
          try { VOICE_STATE.recognition.start(); } catch (e) {}
        }

        VOICE_STATE.mediaRecorder.start();
        VOICE_STATE.isRecording = true;
        VOICE_STATE.isPaused = false;
        VOICE_STATE.seconds = 0;
        vTimer.style.display = "inline-block";
        vTimer.textContent = "00:00";
        btnRec.classList.add("recording");
        btnRec.innerHTML = `<span class="voice-rec-dot"></span>${t("voice_stop")}`;
        btnPause.style.display = "inline-flex";
        btnPause.innerHTML = `⏸️ ${t("voice_pause")}`;
        vStatus.textContent = t("voice_rec_active");

        VOICE_STATE.timerInterval = setInterval(() => {
          VOICE_STATE.seconds++;
          const mins = String(Math.floor(VOICE_STATE.seconds / 60)).padStart(2, "0");
          const secs = String(VOICE_STATE.seconds % 60).padStart(2, "0");
          vTimer.textContent = `${mins}:${secs}`;
        }, 1000);

      } catch (err) {
        vStatus.textContent = "Microphone access error: " + err.message;
      }
    }
  };
}

// ---------------- 3. AI-POWERED MULTILINGUAL DOCUMENT AUTO-FILL MODULE ----------------
function setupDocumentAutoFill(formContainer, fileInput, docContext = "purchase") {
  if (!formContainer || !fileInput) return;
  if (fileInput._hasAutoFill) return;
  fileInput._hasAutoFill = true;

  const banner = document.createElement("div");
  banner.className = "doc-ai-banner";
  banner.style.display = "none";
  banner.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center">
      <span style="font-weight:700;font-size:.825rem;color:#1e3a8a">🤖 ${t("doc_ai_title")}</span>
      <span class="doc-ai-badge" id="aiDocBadge" style="display:none"></span>
    </div>
    <div class="doc-ai-steps">
      <span class="doc-ai-step active" id="aiStepUpload">${t("doc_ai_step_uploaded")}</span>
      <span class="doc-ai-arrow">→</span>
      <span class="doc-ai-step" id="aiStepLang">${t("doc_ai_step_lang")}</span>
      <span class="doc-ai-arrow">→</span>
      <span class="doc-ai-step" id="aiStepOcr">${t("doc_ai_step_ocr")}</span>
      <span class="doc-ai-arrow">→</span>
      <span class="doc-ai-step" id="aiStepFill">${t("doc_ai_step_fill")}</span>
    </div>
    <div class="doc-ai-status" id="aiDocStatus">
      <span class="voice-rec-dot" style="background:#2563eb"></span>
      ${t("doc_ai_detecting")}
    </div>
    <div id="aiDocReview" style="display:none;font-size:.78rem;margin-top:.25rem"></div>
  `;

  const fieldWrapper = fileInput.closest("div") || fileInput.parentElement;
  if (fieldWrapper) fieldWrapper.after(banner);

  const stepUpload = banner.querySelector("#aiStepUpload");
  const stepLang = banner.querySelector("#aiStepLang");
  const stepOcr = banner.querySelector("#aiStepOcr");
  const stepFill = banner.querySelector("#aiStepFill");
  const aiBadge = banner.querySelector("#aiDocBadge");
  const aiStatus = banner.querySelector("#aiDocStatus");

  fileInput.addEventListener("change", async () => {
    if (!fileInput.files || !fileInput.files[0]) return;
    const file = fileInput.files[0];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!["pdf", "jpg", "jpeg", "png", "webp"].includes(ext)) return;

    banner.style.display = "grid";
    banner.className = "doc-ai-banner scanning";
    stepUpload.className = "doc-ai-step done";
    stepUpload.textContent = `📄 ${file.name.slice(0, 20)}`;
    stepLang.className = "doc-ai-step active";
    stepOcr.className = "doc-ai-step";
    stepFill.className = "doc-ai-step";
    aiBadge.style.display = "none";
    aiStatus.innerHTML = `<span class="voice-rec-dot" style="background:#2563eb"></span> ${t("doc_ai_detecting")}`;

    const fd = new FormData();
    fd.append("file", file);
    fd.append("context", docContext);

    try {
      stepOcr.className = "doc-ai-step active";
      const res = await post("/documents/scan-autofill", fd);

      // Language step
      stepLang.className = "doc-ai-step done";
      aiBadge.style.display = "inline-flex";
      aiBadge.className = `doc-ai-badge ${res.detected_lang || 'en'}`;
      const langLabels = { en: "English", hi: "हिन्दी (Hindi)", ar: "العربية (Arabic)" };
      aiBadge.textContent = `Detected: ${langLabels[res.detected_lang] || res.detected_lang_name} (${res.overall_confidence}% conf)`;

      // OCR & Fill steps
      stepOcr.className = "doc-ai-step done";
      stepFill.className = "doc-ai-step done";
      banner.className = "doc-ai-banner ready";

      const f = res.fields || {};
      let filledCount = 0;

      function populate(inputNames, fieldKey) {
        if (!f[fieldKey] || f[fieldKey].value === undefined || f[fieldKey].value === null || f[fieldKey].value === "") return;
        const fieldData = f[fieldKey];
        const val = fieldData.value;
        for (const name of inputNames) {
          const inp = formContainer.querySelector(`[name="${name}"]`);
          if (inp) {
            inp.value = val;
            inp.classList.add("ai-populated");
            inp.dispatchEvent(new Event("input", { bubbles: true }));
            inp.dispatchEvent(new Event("change", { bubbles: true }));
            filledCount++;

            const parentLabel = inp.closest("label");
            if (parentLabel && !parentLabel.querySelector(".ai-field-tag")) {
              const tag = document.createElement("span");
              tag.className = "ai-field-tag";
              tag.textContent = `✓ AI ${Math.round((fieldData.confidence || 0.9) * 100)}%`;
              parentLabel.append(tag);
            }

            if (fieldData.original_value && fieldData.original_value !== val) {
              const parentDiv = inp.closest("div");
              if (parentDiv && !parentDiv.querySelector(".ai-orig-label")) {
                const origSub = document.createElement("small");
                origSub.className = "ai-orig-label";
                origSub.textContent = `Original: "${fieldData.original_value}" → Translated to English`;
                parentDiv.append(origSub);
              }
            }
            break;
          }
        }
      }

      populate(["invoice_no", "ref_no", "bill_no", "doc_no"], "invoice_no");
      populate(["supplier", "supplier_name", "vendor"], "supplier");
      populate(["date", "purchased_at", "record_date", "issue_date"], "date");
      populate(["part_name", "name", "description", "title"], "part_name");
      populate(["qty", "quantity"], "qty");
      populate(["unit_price", "est_price", "price", "unit_cost"], "unit_price");
      populate(["amount", "cost", "total", "total_spent"], "total_amount");
      populate(["tax", "vat"], "tax");
      populate(["reg_no", "plate_no"], "reg_no");
      populate(["vin", "serial_no", "vin_or_serial"], "vin");
      populate(["insurance_company"], "insurance_company");
      populate(["insurance_policy"], "insurance_policy");

      if (f.currency && f.currency.value) {
        const curSelect = formContainer.querySelector('select[name="currency"]');
        if (curSelect) {
          for (let opt of curSelect.options) {
            if (opt.value === f.currency.value) {
              curSelect.value = f.currency.value;
              curSelect.dispatchEvent(new Event("change", { bubbles: true }));
              filledCount++;
              break;
            }
          }
        }
      }

      let statusHtml = `<b>✓ ${t("doc_ai_ready")}</b> (${filledCount} fields populated).`;
      if (res.calculations_verified) {
        statusHtml += ` <span style="color:#15803d;font-weight:600;margin-left:.35rem">${t("doc_ai_verified")}</span>`;
      }
      aiStatus.innerHTML = statusHtml;

    } catch (err) {
      stepOcr.className = "doc-ai-step active";
      aiStatus.textContent = "AI scan skipped: " + err.message;
      banner.className = "doc-ai-banner";
    }
  });
}

function renderFormField(f) {
  return `
    <div id="field_${f.n}">
      <label>
        ${esc(f.l)}
        ${f.t === "select" ? `
          <select name="${f.n}" ${f.r ? "required" : ""}>
            ${(f.o || []).map(o => `<option value="${esc(o[0])}" ${String(o[0]) === String(f.v ?? "") ? "selected" : ""}>${esc(o[1])}</option>`).join("")}
          </select>
        ` : f.t === "textarea" ? `
          <textarea name="${f.n}" rows="3" ${f.r ? "required" : ""}>${esc(f.v ?? "")}</textarea>
        ` : `
          <input name="${f.n}" type="${f.t || "text"}" ${f.t === "number" ? 'step="any" inputmode="decimal"' : ""} ${f.t === "file" ? 'accept=".pdf,.jpg,.jpeg,.png,.webp"' : ""} ${f.r ? "required" : ""} ${f.t === "file" ? "" : `value="${esc(f.v ?? "")}"`}>
        `}
      </label>
    </div>
  `;
}

function ask(title, fs, voiceField = null) {
  return new Promise(res => {
    const d = document.createElement("dialog");
    d.className = "dlg";

    let fieldsHtml = "";
    if (fs.length > 6) {
      const groups = [
        { title: "General Identification", icon: "📋", fields: [] },
        { title: "Machinery Specifications", icon: "⚙️", fields: [] },
        { title: "Assignment & Location", icon: "📍", fields: [] },
        { title: "Kuwait Compliance & Insurance", icon: "🛡️", fields: [] },
        { title: "Technical Details & Remarks", icon: "📝", fields: [] }
      ];

      fs.forEach(f => {
        const n = f.n;
        if (["name", "category", "plate_category", "reg_no", "equipment_type"].includes(n)) {
          groups[0].fields.push(f);
        } else if (["manufacturer", "brand", "model", "year", "vin", "engine_no", "serial_no", "ownership_type"].includes(n)) {
          groups[1].fields.push(f);
        } else if (["country", "governorate", "paci_no", "operator", "civil_id_operator", "department", "worksite_id", "status"].includes(n)) {
          groups[2].fields.push(f);
        } else if (["purchase_date", "purchase_cost", "insurance_company", "insurance_policy", "insurance_expiry", "inspection_expiry", "reg_expiry"].includes(n)) {
          groups[3].fields.push(f);
        } else {
          groups[4].fields.push(f);
        }
      });

      fieldsHtml = groups.filter(g => g.fields.length > 0).map(g => `
        <div class="form-section-title">
          <span>${g.icon}</span> ${esc(g.title)}
        </div>
        <div class="form-fields-grid" style="display:grid;gap:.75rem">
          ${g.fields.map(f => renderFormField(f)).join("")}
        </div>
      `).join("");
    } else {
      fieldsHtml = `<div style="display:grid;gap:.75rem">${fs.map(f => renderFormField(f)).join("")}</div>`;
    }

    d.innerHTML = `
      <form method="dialog" style="display:flex;flex-direction:column;height:100%">
        <div class="dlg-header">
          <h3 class="d" style="margin:0">${esc(title)}</h3>
          <button type="button" class="dlg-close-btn" data-c aria-label="Close dialog">✕</button>
        </div>
        <div class="dlg-body">
          ${fieldsHtml}
          <div id="voiceAnchor"></div>
          <p class="err" id="dlgErr"></p>
        </div>
        <div class="dlg-footer">
          <button class="btn">${t("submit")}</button>
          <button type="button" class="btn g" data-c>${t("cancel")}</button>
        </div>
      </form>
    `;
    document.body.append(d);

    // Attach voice recorder if requested
    if (voiceField) {
      const fieldContainer = d.querySelector(`#field_${voiceField}`) || d.querySelector("#voiceAnchor");
      setupVoiceRecorder(voiceField, fieldContainer);
    }

    // Auto-detect file inputs and attach Document AI Auto-Fill
    const form = d.querySelector("form");
    const fileInputs = d.querySelectorAll('input[type="file"]');
    fileInputs.forEach(fileInput => {
      let ctx = "purchase";
      const lowerTitle = title.toLowerCase();
      if (lowerTitle.includes("expense") || lowerTitle.includes("maintenance expense")) ctx = "expense";
      else if (lowerTitle.includes("equipment") || lowerTitle.includes("vehicle") || lowerTitle.includes("relocate") || lowerTitle.includes("specification")) ctx = "vehicle";
      else if (lowerTitle.includes("historical") || lowerTitle.includes("paper record")) ctx = "historical";
      else if (lowerTitle.includes("stock") || lowerTitle.includes("part") || lowerTitle.includes("catalogue")) ctx = "part";

      setupDocumentAutoFill(form, fileInput, ctx);
    });

    d.showModal();
    d.querySelectorAll("[data-c]").forEach(b => b.onclick = () => d.close());
    d.onclose = () => { d.remove(); res(null); };
    d.querySelector("form").onsubmit = e => {
      e.preventDefault();
      res(new FormData(e.target));
      d.close();
    };
  });
}

function show(title, html) {
  const d = document.createElement("dialog");
  d.className = "dlg";
  d.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%">
      <div class="dlg-header">
        <h3 class="d" style="margin:0">${esc(title)}</h3>
        <button type="button" class="dlg-close-btn" data-c aria-label="Close dialog">✕</button>
      </div>
      <div class="dlg-body">
        ${html}
      </div>
      <div class="dlg-footer">
        <button type="button" class="btn g" data-c>${t("close")}</button>
      </div>
    </div>
  `;
  document.body.append(d);
  d.showModal();
  d.querySelectorAll("[data-c]").forEach(b => b.onclick = () => d.close());
  d.onclose = () => d.remove();
}

let CURRENT_TABLE_VIEW_MODE = localStorage.getItem("fleethub_table_view_mode") || "cards";

const tbl = (cols, data, act) => {
  if (!data || !data.length) {
    return `<p class="mu" style="padding:1.5rem 0">No records found.</p>`;
  }

  const tid = "tbl_" + Math.random().toString(36).slice(2, 9);
  const totalCount = data.length;

  // 1. Build Desktop Table View
  const desktopTableHtml = `
    <div class="table-desktop-view tw card">
      <table>
        <thead>
          <tr>
            ${cols.map(c => `<th>${c[1]}</th>`).join("")}
            ${act ? `<th>${t("actions")}</th>` : ""}
          </tr>
        </thead>
        <tbody>
          ${data.map(r => `
            <tr>
              ${cols.map(c => `<td>${c[2] ? c[2](r) : esc(r[c[0]] ?? "")}</td>`).join("")}
              ${act ? `<td style="white-space:nowrap">${act(r)}</td>` : ""}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;

  // 2. Build Mobile Cards View
  const mobileCardsHtml = `
    <div class="table-mobile-cards">
      ${data.map((r, rowIdx) => {
        const rowVals = cols.map(c => ({
          key: c[0],
          label: c[1],
          val: c[2] ? c[2](r) : esc(r[c[0]] ?? "")
        }));

        const codeItem = rowVals[0] || { val: "-" };
        const titleItem = rowVals[1] || { val: "-" };

        let statusIdx = cols.findIndex(c => c[0] === "status" || c[1].toLowerCase().includes("status"));
        let statusItem = statusIdx >= 0 ? rowVals[statusIdx] : null;

        const primaryKVs = [];
        const secondaryKVs = [];

        rowVals.forEach((item, idx) => {
          if (idx === 0 || idx === 1 || idx === statusIdx) return;
          if (primaryKVs.length < 4) {
            primaryKVs.push(item);
          } else {
            secondaryKVs.push(item);
          }
        });

        const cardDetailsId = `${tid}_det_${rowIdx}`;

        return `
          <div class="data-card">
            <div class="card-top-row">
              <span class="card-code-badge">${codeItem.val}</span>
              ${statusItem ? `<div class="card-status-chip">${statusItem.val}</div>` : ""}
            </div>

            <div class="card-title">${titleItem.val}</div>

            ${primaryKVs.length ? `
              <div class="card-kv-grid">
                ${primaryKVs.map(kv => `
                  <div class="card-kv-item">
                    <small>${kv.label}</small>
                    <span>${kv.val || "-"}</span>
                  </div>
                `).join("")}
              </div>
            ` : ""}

            ${secondaryKVs.length ? `
              <button type="button" class="card-expand-toggle" data-toggle="${cardDetailsId}">
                <span>${t("more_details") || "More Details ▾"}</span>
              </button>
              <div id="${cardDetailsId}" class="card-details-drawer hidden">
                ${secondaryKVs.map(kv => `
                  <div class="card-kv-item">
                    <small>${kv.label}</small>
                    <span>${kv.val || "-"}</span>
                  </div>
                `).join("")}
              </div>
            ` : ""}

            ${act ? `
              <div class="card-actions-bar">
                ${act(r)}
              </div>
            ` : ""}
          </div>
        `;
      }).join("")}
    </div>
  `;

  return `
    <div class="responsive-data-system" id="${tid}">
      <div class="view-toggle-bar">
        <span class="m" style="color:var(--mu);font-size:.8rem">${totalCount} item(s)</span>
        <div class="view-toggle-pills noprint">
          <button type="button" class="view-toggle-btn ${CURRENT_TABLE_VIEW_MODE === "cards" ? "active" : ""}" data-viewmode="cards" data-target="${tid}">
            📱 ${t("cards_view") || "Cards"}
          </button>
          <button type="button" class="view-toggle-btn ${CURRENT_TABLE_VIEW_MODE === "table" ? "active" : ""}" data-viewmode="table" data-target="${tid}">
            📋 ${t("table_view") || "Table"}
          </button>
        </div>
      </div>

      <div class="responsive-view-wrapper ${CURRENT_TABLE_VIEW_MODE}">
        ${mobileCardsHtml}
        ${desktopTableHtml}
      </div>
    </div>
  `;
};

const fileUrl = (id, extra = "") => {
  if (!id) return "";
  const token = localStorage.getItem("fleethub_token");
  const base = (window.FLEETHUB_API_BASE || "") + "/api/files/" + id;
  const params = [];
  if (token) params.push("token=" + encodeURIComponent(token));
  if (extra) params.push(extra.startsWith("&") || extra.startsWith("?") ? extra.substring(1) : extra);
  return base + (params.length ? "?" + params.join("&") : "");
};

const B = (a, id, l, x = "") => `<button class="btn g sm" data-a="${a}" data-id="${id}" ${x}>${l}</button>`;
const bill = id => id ? `<a href="${fileUrl(id)}" target="_blank" rel="noopener" class="chip c-verified">View Bill</a>` : `<span class="mu">-</span>`;
const docLink = id => id ? `<a href="${fileUrl(id)}" target="_blank" rel="noopener" class="chip c-verified">View Doc</a>` : `<span class="mu">-</span>`;
const audioPlayer = id => id ? `<div style="display:inline-flex;align-items:center;gap:.3rem"><audio src="${fileUrl(id)}" controls style="height:1.75rem;max-width:11rem;vertical-align:middle"></audio><a href="${fileUrl(id, "dl=1")}" title="Download audio recording" download class="chip" style="font-size:.7rem;padding:.15rem .35rem;text-decoration:none">💾</a></div>` : `<span class="mu">-</span>`;
const opts = (a, v, l, none) => (none ? [["", none]] : []).concat(a.map(r => [r[v], l(r)]));
const aOpts = async (mine) => opts(await api(mine ? "/my-assets" : "/assets"), "id", a => `${a.code} · ${a.name}${a.reg_no ? " · " + a.reg_no : ""}`);
const woOpts = async none => opts(await api("/work-orders?open=1"), "id", w => `${w.code} · ${w.asset_code} · ${w.description.slice(0, 40)}`, none);
const supOpts = async none => opts(await api("/suppliers"), "id", s => `${s.code} · ${s.name}`, none);

const AFS = (a = {}, ws = [], cats = []) => [
  { n: "name", l: "Equipment / Vehicle Name", v: a.name, r: 1 },
  { n: "category", l: "Category (e.g. Heavy Truck, Mobile Crane, Excavator, Generator)", v: a.category || "Heavy Truck", r: 1 },
  { n: "plate_category", l: "Kuwait Plate Category", t: "select", o: [
    ["Commercial / تجاري", "Commercial / تجاري"],
    ["Construction & Heavy Equipment / إنشائية ومعدات ثقيلة", "Construction & Heavy Equipment / إنشائية ومعدات ثقيلة"],
    ["Private / خصوصي", "Private / خصوصي"],
    ["Public Transport / نقل عام", "Public Transport / نقل عام"],
    ["Government / حكومي", "Government / حكومي"],
    ["Temporary / مؤقت", "Temporary / مؤقت"],
    ["Machinery (Internal ID Only)", "Machinery (Internal ID Only)"]
  ], v: a.plate_category || "Commercial / تجاري" },
  { n: "reg_no", l: "Kuwait Plate No. / Traffic Reg", v: a.reg_no },
  { n: "equipment_type", l: "Equipment Type", v: a.equipment_type },
  { n: "manufacturer", l: "Manufacturer (e.g. Hyundai, Komatsu, CAT, Mercedes-Benz)", v: a.manufacturer },
  { n: "brand", l: "Brand", v: a.brand },
  { n: "model", l: "Model", v: a.model },
  { n: "year", l: "Manufacturing Year", t: "number", v: a.year },
  { n: "vin", l: "VIN / Chassis Number", v: a.vin },
  { n: "engine_no", l: "Engine Number", v: a.engine_no },
  { n: "serial_no", l: "Permanent Serial Number", v: a.serial_no },
  { n: "ownership_type", l: "Ownership / Lease Type", t: "select", o: [
    ["Company Owned / ملك الشركة", "Company Owned / ملك الشركة"],
    ["Finance Lease / تأجير تمويلي", "Finance Lease / تأجير تمويلي"],
    ["Operating Lease / إيجار تشغيلي", "Operating Lease / إيجار تشغيلي"],
    ["Rented / مستأجر", "Rented / مستأجر"]
  ], v: a.ownership_type || "Company Owned / ملك الشركة" },
  { n: "country", l: "Country / Business Region", v: a.country || "Kuwait" },
  { n: "governorate", l: "Kuwait Governorate", t: "select", o: [
    ["Ahmadi", "Ahmadi / الأحمدي"],
    ["Capital", "Capital / العاصمة"],
    ["Farwaniya", "Farwaniya / الفروانية"],
    ["Jahra", "Jahra / الجهراء"],
    ["Hawalli", "Hawalli / حولي"],
    ["Mubarak Al-Kabeer", "Mubarak Al-Kabeer / مبارك الكبير"]
  ], v: a.governorate || "Ahmadi" },
  { n: "paci_no", l: "Kuwait PACI Building/Plot No (الرقم الآلي للعنوان)", v: a.paci_no },
  { n: "operator", l: "Assigned Driver / Operator Name", v: a.operator },
  { n: "civil_id_operator", l: "Operator Kuwait Civil ID (12 Digits)", v: a.civil_id_operator },
  { n: "department", l: "Department", v: a.department },
  { n: "worksite_id", l: "Current Worksite / Depot", t: "select", o: opts(ws, "id", w => `${w.name} (${w.governorate || 'Kuwait'})`, "(None assigned)"), v: a.worksite_id },
  { n: "status", l: "Operational Status", t: "select", o: ["Active", "Under Repair", "Out of Service"].map(s => [s, s]), v: a.status || "Active" },
  { n: "purchase_date", l: "Purchase Date", t: "date", v: a.purchase_date },
  { n: "purchase_cost", l: "Purchase Cost (KWD)", t: "number", v: a.purchase_cost },
  { n: "insurance_company", l: "Insurance Company", t: "select", o: [
    ["Gulf Insurance Group (GIG)", "Gulf Insurance Group (GIG)"],
    ["Kuwait Insurance Company (KIC)", "Kuwait Insurance Company (KIC)"],
    ["Warba Insurance", "Warba Insurance"],
    ["Al-Ahleia Insurance", "Al-Ahleia Insurance"],
    ["Boubyan Takaful", "Boubyan Takaful"],
    ["Enaya Insurance", "Enaya Insurance"],
    ["Other Approved Insurer", "Other Approved Insurer"]
  ], v: a.insurance_company || "Gulf Insurance Group (GIG)" },
  { n: "insurance_policy", l: "Insurance Policy No.", v: a.insurance_policy },
  { n: "insurance_expiry", l: "Insurance Expiry Date", t: "date", v: a.insurance_expiry },
  { n: "inspection_expiry", l: "Technical Inspection (Fahs Fanni) Expiry", t: "date", v: a.inspection_expiry },
  { n: "reg_expiry", l: "Traffic Registration (Daftar) Expiry Date", t: "date", v: a.reg_expiry },
  { n: "warranty_details", l: "Warranty Details", v: a.warranty_details },
  { n: "remarks", l: "Technical Specs / Remarks", t: "textarea", v: a.remarks }
];

async function updateAlertBadge() {
  if (!ME || !can("asset.view")) return;
  try {
    LIVE_ALERTS = await api("/alerts");
    
    // 1. Desktop alert button
    const b = $("#notifBadge");
    if (b) {
      if (LIVE_ALERTS.total > 0) {
        b.innerHTML = `<span class="dot"></span>🔔 ${t("alerts")} <span class="badge-count">${LIVE_ALERTS.total}</span>`;
      } else {
        b.innerHTML = `🔔 ${t("alerts")}`;
      }
    }

    // 2. Mobile header alert button
    const mbAlerts = $("#btnMobileAlerts");
    if (mbAlerts) {
      const existingBadge = mbAlerts.querySelector(".badge-count");
      if (LIVE_ALERTS.total > 0) {
        if (existingBadge) {
          existingBadge.textContent = LIVE_ALERTS.total;
        } else {
          mbAlerts.insertAdjacentHTML("beforeend", `<span class="badge-count" style="position:absolute;top:2px;right:2px">${LIVE_ALERTS.total}</span>`);
        }
      } else if (existingBadge) {
        existingBadge.remove();
      }
    }

    // 3. Mobile bottom nav tab for complaints
    const compTab = document.querySelector('.bottom-nav-btn[data-id="comp"]');
    if (compTab) {
      const pendingCount = LIVE_ALERTS.pending_complaints || 0;
      let badge = compTab.querySelector(".bottom-nav-badge");
      if (pendingCount > 0) {
        if (!badge) {
          compTab.querySelector(".bottom-nav-icon")?.insertAdjacentHTML("beforeend", `<span class="bottom-nav-badge">${pendingCount}</span>`);
        } else {
          badge.textContent = pendingCount;
        }
      } else if (badge) {
        badge.remove();
      }
    }
  } catch (e) {}
}

const V = {}, ACT = {};

// ---------------- VIEWS ----------------
V.dash = async () => {
  const d = await api("/dashboard");
  const alerts = await api("/alerts").catch(() => ({ total: 0 }));

  // Primary operational KPIs
  const primaryK = [
    [t("kpi_reg_fleet"), d.assets],
    [t("kpi_active"), d.active],
    [t("kpi_repair"), d.under_repair],
    [t("kpi_open_wo"), d.wo_open]
  ];

  // Secondary metrics
  const secondaryK = [
    [t("kpi_out_service"), d.out_of_service],
    [t("kpi_waiting_parts"), d.wo_waiting],
    [t("kpi_pending_insp"), d.pending_inspection],
    [t("kpi_new_comp"), d.complaints_new],
    [t("kpi_low_stock"), d.low_stock],
    [t("kpi_pending_pur"), d.pending_purchases],
    [t("kpi_exp_docs"), d.expiring_docs],
    [t("kpi_suppliers"), d.suppliers_count],
    [t("kpi_hist_records"), d.historical_records]
  ];

  return `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.75rem">
      <div>
        <h2 class="d" style="margin:0">${t("nav_dash")}</h2>
        <p class="mu">${t("app_subtitle")}</p>
      </div>
      <div class="noprint" style="display:flex;gap:.5rem;flex-wrap:wrap">
        <button class="btn g sm" data-a="nav" data-id="reports">📊 Reports</button>
        <button class="btn sm" data-a="nav" data-id="alerts">🔔 ${t("alerts")} ${alerts.total ? `(${alerts.total})` : ""}</button>
      </div>
    </div>

    ${alerts.total > 0 ? `
      <div class="alert-banner">
        <b>${t("attention_req")}</b>
        <span>${alerts.total} active alerts (${alerts.low_stock.length} low-stock parts, ${(alerts.insurance_expiring?.length || 0) + (alerts.reg_expiring?.length || 0) + (alerts.inspection_expiring?.length || 0)} document expiries, ${alerts.pending_complaints} pending complaints).</span>
        <button class="btn sm" data-a="nav" data-id="alerts">${t("view_alert_center")}</button>
      </div>
    ` : ""}

    <!-- Primary 4 KPIs -->
    <div class="dash-kpis-grid">
      ${primaryK.map(([l, v]) => `
        <div class="stat-box primary-kpi">
          <div class="kpi">${v ?? 0}</div>
          <div class="kpi-label">${l}</div>
        </div>
      `).join("")}
    </div>

    <!-- Secondary KPIs Toggle on Mobile -->
    <button type="button" class="dash-accordion-btn noprint" id="btnToggleMoreKpis">
      <span>${t("all_kpis") || "Show All Fleet & Store Metrics (9 more) ▾"}</span>
    </button>
    <div class="dash-kpis-grid" id="secondaryKpisContainer" style="display:none">
      ${secondaryK.map(([l, v]) => `
        <div class="stat-box">
          <div class="kpi">${v ?? 0}</div>
          <div class="kpi-label">${l}</div>
        </div>
      `).join("")}
    </div>

    ${d.monthly ? `
      <h3 class="d" style="margin-top:2rem">${t("monthly_trend")}</h3>
      <div class="card">
        ${d.monthly.length ? d.monthly.map(m => `
          <div class="row" style="gap:.75rem">
            <span style="min-width:4.5rem;font-size:.85rem;font-weight:500">${m.month}</span>
            <div class="bt"><i style="width:${Math.max(2, m.total / Math.max(...d.monthly.map(x => x.total), 1) * 100)}%"></i></div>
            <b style="min-width:5.5rem;text-align:right;font-size:.85rem">${rs(m.total)}</b>
          </div>
        `).join("") : "<p class='mu'>No expenses recorded yet.</p>"}
        <div style="margin-top:1rem;display:flex;justify-content:space-between;border-top:1px solid var(--ln);padding-top:.75rem;flex-wrap:wrap;gap:.5rem">
          <span><b>${t("total_maint_spend")}</b></span>
          <b style="color:var(--ac);font-size:1.05rem">${rs(d.total_spend)}</b>
        </div>
      </div>
    ` : ""}

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(18rem,1fr));gap:1.25rem;margin-top:1.5rem">
      <div class="card">
        <h4 style="margin-bottom:1rem">${t("cat_distribution")}</h4>
        ${(d.categories || []).map(c => `
          <div class="row" style="justify-content:space-between">
            <span style="font-size:.875rem">${esc(c.category)}</span>
            <b>${c.count} units</b>
          </div>
        `).join("") || "<p class='mu'>No category data yet.</p>"}
      </div>

      <div class="card">
        <h4 style="margin-bottom:1rem">${t("recent_operations")}</h4>
        ${(d.recent_wo || []).map(w => `
          <div style="margin-bottom:.75rem;padding-bottom:.5rem;border-bottom:1px solid var(--ln)">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem;flex-wrap:wrap">
              <b style="font-size:.9rem">${esc(w.code)} · ${esc(w.asset_code)}</b>
              ${chip(w.status)}
            </div>
            <p style="font-size:.85rem;color:#444;margin:.25rem 0">${esc(w.description)}</p>
            <small class="mu">${esc(w.created_at)}</small>
          </div>
        `).join("") || "<p class='mu'>No work orders recorded yet.</p>"}
      </div>
    </div>
  `;
};

V.search = async q => {
  const d = await api("/search?q=" + encodeURIComponent(q || ""));
  return `
    <h2 class="d">Search Results</h2>
    <p class="mu">${d.length} asset(s) matching “${esc(q)}”</p>
    ${tbl([
      ["code", "Asset ID"],
      ["name", "Equipment / Vehicle"],
      ["category", "Category"],
      ["equipment_type", "Type"],
      ["manufacturer", "Manufacturer"],
      ["model", "Model"],
      ["reg_no", "Registration"],
      ["serial_no", "Serial No"],
      ["operator", "Operator"],
      ["worksite", "Worksite"],
      ["status", t("status"), r => chip(r.status) + (r.archived ? ' <span class="chip c-reported">Archived</span>' : "")]
    ], d, r => B("open", r.id, "Open Full History"))}
  `;
};

V.asset = async id => {
  const d = await api(`/assets/${id}/history`);
  const a = d.asset;
  const kv = [
    ["Internal Asset ID", a.code],
    ["Kuwait Reg / Plate No.", a.reg_no || "(Unregistered machinery)"],
    ["Kuwait Plate Category", a.plate_category || "Commercial / تجاري"],
    ["Equipment Name", a.name],
    ["Category", a.category],
    ["Equipment Type", a.equipment_type || "-"],
    ["Manufacturer", a.manufacturer || "-"],
    ["Brand", a.brand || "-"],
    ["Model", a.model || "-"],
    ["Manufacturing Year", a.year || "-"],
    ["VIN / Chassis No.", a.vin || "-"],
    ["Engine No.", a.engine_no || "-"],
    ["Permanent Serial No.", a.serial_no || "-"],
    ["Ownership / Lease", a.ownership_type || "Company Owned / ملك الشركة"],
    ["Country / Region", a.country || "Kuwait"],
    ["Kuwait Governorate", a.governorate || "Ahmadi"],
    ["PACI Number (العنوان الآلي)", a.paci_no || "-"],
    ["Assigned Operator", a.operator || "(Unassigned)"],
    ["Operator Civil ID", a.civil_id_operator || "-"],
    ["Department", a.department || "-"],
    ["Current Worksite", a.worksite || "(None assigned)"],
    ["Purchase Date", a.purchase_date || "-"],
    ["Purchase Cost", a.purchase_cost ? rs(a.purchase_cost) : "-"],
    ["Insurance Company", a.insurance_company || "-"],
    ["Insurance Policy", a.insurance_policy || "-"],
    ["Insurance Expiry", a.insurance_expiry ? `${a.insurance_expiry} ${a.insurance_expiry < new Date().toISOString().slice(0,10) ? '<span class="chip c-reported">Expired</span>' : '<span class="chip c-done">Valid</span>'}` : "-"],
    ["Technical Inspection (Fahs Fanni)", a.inspection_expiry ? `${a.inspection_expiry} ${a.inspection_expiry < new Date().toISOString().slice(0,10) ? '<span class="chip c-reported">Expired</span>' : '<span class="chip c-done">Valid</span>'}` : "-"],
    ["Registration Expiry (Daftar)", a.reg_expiry ? `${a.reg_expiry} ${a.reg_expiry < new Date().toISOString().slice(0,10) ? '<span class="chip c-reported">Expired</span>' : '<span class="chip c-done">Valid</span>'}` : "-"],
    ["Warranty Details", a.warranty_details || "-"],
    ["Remarks / Specs", a.remarks || "-"]
  ];

  return `
    <div class="noprint" style="margin-bottom:1rem">
      <button class="btn g sm" data-a="back">${t("back")}</button>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem">
      <div>
        <h2 class="d">${esc(a.name)}</h2>
        <p style="margin-top:.25rem">
          <b class="m" style="font-size:1.1rem">${a.code}</b>
          ${chip(a.status)}
          ${a.archived ? '<span class="chip c-reported">Archived</span>' : ""}
          <span class="chip c-verified">${esc(a.category)}</span>
        </p>
      </div>

      <div class="bar2 noprint">
        ${can("asset.edit") ? `
          <button class="btn sm" data-a="editA" data-id="${a.id}">${t("edit")}</button>
          <button class="btn g sm" data-a="transferA" data-id="${a.id}">🚚 Transfer Site</button>
          <button class="btn g sm" data-a="upDoc" data-id="${a.id}">Upload Document</button>
          <button class="btn g sm" data-a="arch" data-id="${a.id}">${a.archived ? t("restore") : t("archive")}</button>
        ` : ""}
        <button class="btn g sm" onclick="window.print()">${t("print_history")}</button>
      </div>
    </div>

    <h3 class="d" style="margin-top:1.5rem">Specifications & Registry Profile</h3>
    <div class="card kv">
      ${kv.map(([k, v]) => `<div><small>${k}</small><span>${v}</span></div>`).join("")}
    </div>

    ${d.cost ? `
      <h3 class="d" style="margin-top:2rem">Lifetime Maintenance Cost Account</h3>
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;border-bottom:1px solid var(--ln);padding-bottom:1rem;margin-bottom:1rem">
          <div>
            <div style="font-size:.85rem;color:var(--mu);text-transform:uppercase;letter-spacing:.05em">Total Lifetime Maintenance Spend</div>
            <div class="kpi">${rs(d.cost.total)}</div>
          </div>
          <div class="mu" style="max-width:32rem;font-size:.825rem">
            <b>Accounting Integrity Rules:</b> Company-employed mechanics are paid permanent monthly salaries. Their labour charges are never added to repair costs. Parts purchased for inventory are accounted only upon issue, strictly preventing duplicate expenses.
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(14rem,1fr));gap:1rem">
          <div>
            <h4 style="margin-bottom:.5rem;font-size:.85rem;color:var(--mu)">Cost Breakdown by Type</h4>
            ${d.cost.by_kind.map(k => `
              <div class="row" style="justify-content:space-between">
                <span>${esc(k.kind.replace(/_/g, " "))}</span>
                <b>${rs(k.total)}</b>
              </div>
            `).join("") || "<p class='mu'>No expenses incurred.</p>"}
          </div>

          <div>
            <h4 style="margin-bottom:.5rem;font-size:.85rem;color:var(--mu)">Annual Breakdown</h4>
            ${d.cost.by_year.map(y => `
              <div class="row" style="justify-content:space-between">
                <span>Year ${y.year}</span>
                <b>${rs(y.total)}</b>
              </div>
            `).join("") || "<p class='mu'>No yearly history.</p>"}
          </div>
        </div>
      </div>
    ` : ""}

    <h3 class="d" style="margin-top:2rem">Documents, Certificates & Audio Records</h3>
    ${d.documents.length ? `
      <div class="doc-grid">
        ${d.documents.map(x => `
          <div class="doc-card">
            <b>${esc(x.kind || "Document")}</b>
            <span style="font-size:.85rem;word-break:break-all">${esc(x.filename)}</span>
            <small class="mu">${esc(x.at)} · By ${esc(x.by)}</small>
            <div style="margin-top:.25rem">
              ${x.mime && x.mime.startsWith("audio/") ? `
                <audio src="${fileUrl(x.id)}" controls style="width:100%;height:2rem"></audio>
              ` : `
                <a href="${fileUrl(x.id)}" target="_blank" rel="noopener" class="btn g sm" style="display:inline-block">View / Download</a>
              `}
            </div>
          </div>
        `).join("")}
      </div>
    ` : `<p class="mu">No documents uploaded for this asset.</p>`}

    <h3 class="d" style="margin-top:2.5rem">Complete Chronological History Timeline</h3>
    <ul class="tl card" style="margin-top:1rem">
      ${d.timeline.slice().reverse().map(e => `
        <li>
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem">
            <div>
              <span class="chip c-verified">${esc(e.type)}</span>
              ${e.ref ? `<b class="m" style="margin-left:.35rem">${esc(e.ref)}</b>` : ""}
            </div>
            <small class="mu">${esc(e.at)}</small>
          </div>
          <div style="margin-top:.4rem;line-height:1.45;color:#222">${esc(e.text)}</div>
          <div style="margin-top:.25rem;display:flex;justify-content:space-between;align-items:center;font-size:.85rem">
            <span class="mu">${e.by ? "Responsible: " + esc(e.by) : ""}</span>
            ${e.amount != null ? `<b style="color:var(--ink)">${rs(e.amount)}</b>` : ""}
          </div>
        </li>
      `).join("")}
    </ul>
  `;
};

V.assets = async () => {
  const d = await api("/assets");
  return `
    <h2 class="d">${t("nav_assets")}</h2>
    <div class="bar2">
      ${can("asset.edit") ? `
        <button class="btn" data-a="addA">+ Register Equipment</button>
        <button class="btn g" data-a="impA">Import CSV</button>
        <a href="/api/assets/template" class="btn g" download style="display:inline-block">Download CSV Template</a>
      ` : ""}
    </div>
    ${tbl([
      ["code", "Asset ID"],
      ["name", "Equipment Name"],
      ["category", "Category"],
      ["equipment_type", "Type"],
      ["manufacturer", "Manufacturer"],
      ["model", "Model"],
      ["reg_no", "Registration"],
      ["serial_no", "Serial No"],
      ["operator", "Operator"],
      ["worksite", "Worksite"],
      ["status", t("status"), r => chip(r.status) + (r.archived ? ' <span class="chip c-reported">Archived</span>' : "")]
    ], d, r => B("open", r.id, "Open History"))}
  `;
};

V.comp = async () => {
  const d = await api("/complaints");
  return `
    <h2 class="d">${t("nav_comp")}</h2>
    <div class="bar2">
      ${can("complaint.create") ? `<button class="btn" data-a="newC">+ Report Breakdown / Problem</button>` : ""}
    </div>
    ${tbl([
      ["code", "Complaint ID"],
      ["asset_code", "Asset"],
      ["category", "Type"],
      ["description", "Description (English)", r => `
        <div>${esc(r.description || "")}</div>
        ${r.ai_description && r.ai_description !== r.description ? `<div style="font-size:.78rem;color:#15803d;margin-top:.2rem"><b>AI Note:</b> ${esc(r.ai_description)}</div>` : ""}
        ${r.original_transcript ? `<div style="font-size:.78rem;color:var(--mu);margin-top:.25rem"><span class="chip c-verified" style="font-size:.7rem;padding:.05rem .35rem">${esc((r.original_lang || "Voice").toUpperCase())}</span> <i>${esc(r.original_transcript)}</i></div>` : ""}
      `],
      ["location", "Location"],
      ["driver", "Reported By"],
      ["priority", t("priority"), r => chip(r.priority)],
      ["status", t("status"), r => chip(r.status)],
      ["created_at", "Reported Date"],
      ["audio_id", "Voice Note", r => audioPlayer(r.audio_id)],
      ["photo_id", "Photo", r => docLink(r.photo_id)],
      ["decision_note", "Decision Note"]
    ], d, r => (
      (can("complaint.review") && ["New", "Info Requested"].includes(r.status) ?
        B("decide", r.id, "Approve", 'data-d="approve"') +
        B("decide", r.id, "Reject", 'data-d="reject"') +
        B("decide", r.id, "Request Info", 'data-d="info"') : "") +
      (can("wo.manage") && r.status === "Approved" ? B("mkWo", r.id, "Create Work Order") : "")
    ))}
  `;
};

V.wo = async () => {
  const d = await api("/work-orders");
  return `
    <h2 class="d">${t("nav_wo")}</h2>
    <div class="bar2">
      ${can("wo.manage") ? `<button class="btn" data-a="newW">+ New Work Order</button>` : ""}
    </div>
    ${tbl([
      ["code", "Work Order ID"],
      ["asset_code", "Asset"],
      ["category", "Category"],
      ["description", "Work Description (English)", r => `
        <div>${esc(r.description || "")}</div>
        ${r.ai_description && r.ai_description !== r.description ? `<div style="font-size:.78rem;color:#15803d;margin-top:.2rem"><b>AI Note:</b> ${esc(r.ai_description)}</div>` : ""}
        ${r.original_transcript ? `<div style="font-size:.78rem;color:var(--mu);margin-top:.25rem"><span class="chip c-verified" style="font-size:.7rem;padding:.05rem .35rem">${esc((r.original_lang || "Voice").toUpperCase())}</span> <i>${esc(r.original_transcript)}</i></div>` : ""}
      `],
      ["priority", t("priority"), r => chip(r.priority)],
      ["assignee", "Assigned Mechanic"],
      ["status", t("status"), r => chip(r.status)],
      ["audio_id", "Voice Note", r => audioPlayer(r.audio_id)],
      ["findings", "Findings / Notes"]
    ], d, r => `
      ${(r.next || []).map(s => B("woNext", r.id, s, `data-s="${esc(s)}"`)).join(" ")}
      ${can("wo.update") ? B("upWoDoc", r.id, "Upload Doc / Voice") : ""}
    `)}
  `;
};

V.parts = async q => {
  const d = await api("/parts" + (q ? "?q=" + encodeURIComponent(q) : ""));
  return `
    <h2 class="d">${t("nav_parts")}</h2>
    <div class="bar2">
      ${can("inventory.manage") ? `<button class="btn" data-a="newP">+ Add Spare Part</button>` : ""}
      <form id="pq" style="display:flex;gap:.5rem">
        <input placeholder="Search Stock ID, OEM No., Part Name..." value="${esc(q || "")}" style="min-width:18rem">
        <button class="btn g">Search</button>
      </form>
    </div>
    ${tbl([
      ["stock_id", "Stock ID"],
      ["name", "Part Name"],
      ["category", "Category"],
      ["manufacturer", "Manufacturer"],
      ["oem_no", "OEM Part No"],
      ["qty", "In Stock", r => `<span class="${r.min_qty > 0 && r.qty <= r.min_qty ? 'low' : ''}">${r.qty} ${esc(r.unit || "")}</span>`],
      ["min_qty", "Min Level"],
      ["unit_cost", "Avg Unit Cost", r => rs(r.unit_cost)],
      ["location", "Storage Bin"],
      ["supplier_name", "Supplier"]
    ], d, r => (
      (can("inventory.manage") ? B("stockIn", r.id, "Stock In") + B("adjust", r.id, "Adjust") : "") +
      (can("inventory.issue") ? B("issue", r.id, "Issue") + B("ret", r.id, "Return") : "") +
      B("phist", r.id, "History")
    ))}
  `;
};

V.pur = async () => {
  const d = await api("/purchases");
  return `
    <h2 class="d">${t("nav_pur")}</h2>
    <div class="bar2">
      ${can("purchase.create") ? `<button class="btn" data-a="newU">+ External Purchase Request</button>` : ""}
    </div>
    ${tbl([
      ["code", "Purchase ID"],
      ["part_name", "Part Name"],
      ["qty", "Qty"],
      ["asset_code", "Asset"],
      ["wo_code", "Work Order"],
      ["supplier", "Supplier / Shop"],
      ["status", t("status"), r => chip(r.status) + (r.to_stock ? ' <span class="chip c-verified">For Stock</span>' : "")],
      ["unit_price", "Unit Price", r => r.unit_price ? `${rs(r.unit_price)}${r.currency && r.currency !== 'KWD' ? ` <small class="mu">(${r.original_price} ${r.currency})</small>` : ''}` : "-"],
      ["invoice_no", "Invoice No"],
      ["bill_id", "Documents", r => `<button class="btn sm" data-a="purDocs" data-id="${r.id}" style="padding:.2rem .5rem">📎 Docs (${r.doc_count || (r.bill_id ? 1 : 0)})</button>`]
    ], d, r => (
      (can("purchase.approve") && r.status === "Requested" ?
        B("pdec", r.id, "Approve", 'data-d="approve"') +
        B("pdec", r.id, "Reject", 'data-d="reject"') : "") +
      (can("purchase.record") && r.status === "Approved" ? B("prec", r.id, "Record Bill & Payment") : "") +
      B("purDocs", r.id, "📎 Docs (" + (r.doc_count || (r.bill_id ? 1 : 0)) + ")")
    ))}
  `;
};

V.sup = async () => {
  const d = await api("/suppliers?all=1");
  return `
    <h2 class="d">${t("nav_sup")}</h2>
    <div class="bar2">
      ${can("supplier.manage") ? `<button class="btn" data-a="addSup">+ Add Supplier</button>` : ""}
    </div>
    ${tbl([
      ["code", "Supplier ID"],
      ["name", "Supplier / Shop Name"],
      ["contact_person", "Contact Person"],
      ["phone", "Phone"],
      ["email", "Email"],
      ["categories", "Products / Categories"],
      ["purchase_count", "Purchases Made"],
      ["total_spent", "Total Spend", r => rs(r.total_spent)],
      ["active", t("status"), r => r.active ? '<span class="chip c-done">Active</span>' : '<span class="chip c-reported">Inactive</span>']
    ], d, r => `
      ${B("viewSup", r.id, "View Profile")}
      ${can("supplier.manage") ? B("editSup", r.id, "Edit") + B("toggleSup", r.id, r.active ? "Deactivate" : "Activate") : ""}
    `)}
  `;
};

V.exp = async () => {
  const d = await api("/expenses");
  return `
    <h2 class="d">${t("nav_exp")}</h2>
    <div class="bar2">
      ${can("expense.manage") ? `<button class="btn" data-a="newE">+ Record External Expense</button>` : ""}
    </div>
    ${tbl([
      ["at", t("date")],
      ["asset_code", "Asset ID"],
      ["asset_name", "Equipment Name"],
      ["kind", "Expense Type", r => esc(r.kind.replace(/_/g, " "))],
      ["note", t("details")],
      ["amount", "Amount Paid", r => `${rs(r.amount)}${r.currency && r.currency !== 'KWD' ? ` <small class="mu">(${r.original_amount} ${r.currency})</small>` : ''}`],
      ["bill_id", "Original Receipt", r => bill(r.bill_id)]
    ], d)}
  `;
};

V.hist = async () => {
  const d = await api("/historical");
  return `
    <h2 class="d">${t("nav_hist")}</h2>
    <div class="bar2">
      ${can("asset.edit") ? `
        <button class="btn" data-a="addH">+ Digitize Paper Record</button>
        <button class="btn g" data-a="impH">Import Historical CSV</button>
        <a href="/api/historical/template" class="btn g" download style="display:inline-block">Download CSV Template</a>
      ` : ""}
    </div>
    ${tbl([
      ["code", "Record ID"],
      ["record_date", "Historical Date"],
      ["asset_code", "Asset"],
      ["record_type", "Type", r => esc(r.record_type.toUpperCase())],
      ["title", "Record Title"],
      ["work_order_ref", "Old Ref / Job Card"],
      ["supplier_vendor", "Vendor / Performed By"],
      ["cost", "Historical Cost", r => r.cost ? rs(r.cost) : "-"],
      ["verified", t("status"), r => r.verified ? '<span class="chip c-done">Verified</span>' : '<span class="chip c-reported">Unverified</span>'],
      ["doc_id", "Scanned Paper", r => docLink(r.doc_id)]
    ], d, r => B("open", r.asset_id, "View Asset"))}
  `;
};

V.reports = async () => {
  const rtype = $("#repType") ? $("#repType").value : "assets";
  const repData = await api(`/reports/export?type=${rtype}&format=json`).catch(() => ({ headers: [], rows: [] }));
  return `
    <h2 class="d">${t("nav_reports")}</h2>
    <div class="report-toolbar card">
      <label class="report-select-group">
        <span>Select Report:</span>
        <select id="repType" class="report-select">
          <option value="assets" ${rtype === "assets" ? "selected" : ""}>Fleet & Heavy Equipment Register</option>
          <option value="complaints" ${rtype === "complaints" ? "selected" : ""}>Complaints & Breakdowns Summary</option>
          <option value="work_orders" ${rtype === "work_orders" ? "selected" : ""}>Work Orders & Maintenance Log</option>
          <option value="inventory" ${rtype === "inventory" ? "selected" : ""}>Spare Parts Stock & Valuation</option>
          <option value="purchases" ${rtype === "purchases" ? "selected" : ""}>External Parts Purchases</option>
          <option value="transfers" ${rtype === "transfers" ? "selected" : ""}>Kuwait Fleet Worksite Relocations & Transfers</option>
          <option value="compliance" ${rtype === "compliance" ? "selected" : ""}>Kuwait Fleet Compliance (Fahs Fanni, Daftar & Insurance)</option>
          ${can("expense.view") ? `<option value="expenses" ${rtype === "expenses" ? "selected" : ""}>Maintenance Expenses & Payments</option>` : ""}
          <option value="historical" ${rtype === "historical" ? "selected" : ""}>Digitized Historical Paper Records</option>
          ${can("expense.view") ? `<option value="lifetime_cost" ${rtype === "lifetime_cost" ? "selected" : ""}>Asset Lifetime Maintenance Cost Breakdown</option>` : ""}
        </select>
      </label>
      <div class="report-actions">
        <button class="btn sm" id="btnGenRep">Generate View</button>
        <a id="btnCsvRep" href="/api/reports/export?type=${rtype}&format=csv${localStorage.getItem("fleethub_token") ? "&token=" + encodeURIComponent(localStorage.getItem("fleethub_token")) : ""}" class="btn g sm" download>Download CSV</a>
        <button class="btn g sm" onclick="window.print()">Print</button>
      </div>
    </div>

    <div class="rep-sheet card">
      <div class="report-scroll-helper">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/></svg>
        <span>Swipe horizontally to inspect all ${repData.headers.length || 0} columns</span>
      </div>
      <div class="tw">
        <table>
          <thead>
            <tr>${repData.headers.map(h => `<th>${esc(h)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${repData.rows.map(r => `
              <tr>${r.map(cell => `<td>${cell != null ? esc(cell) : "-"}</td>`).join("")}</tr>
            `).join("") || `<tr><td colspan="${repData.headers.length || 1}" class="mu">No records found for this report.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

V.alerts = async () => {
  const [al, notifs] = await Promise.all([api("/alerts"), api("/notifications")]);
  const unreadNotifs = (notifs || []).filter(n => !n.read);
  const compCount = (al.complaints_list || []).length;
  const regCount = (al.insurance_expiring?.length || 0) + (al.reg_expiring?.length || 0);
  const inspCount = (al.inspection_expiring || []).length;
  const partsCount = (al.low_stock || []).length;
  const woCount = (al.wo_inspections_list || []).length;
  const purCount = (al.purchases_list || []).length;

  return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.5rem">
      <div>
        <h2 class="d" style="margin:0">${t("alerts")}</h2>
        <p class="mu" style="margin:.25rem 0 0;font-size:.9rem">${al.total} operational alert items requiring attention</p>
      </div>
      <div class="bar2" style="margin:0">
        <button class="btn g sm" data-a="notifAll">Mark All Notifications Read</button>
      </div>
    </div>

    <!-- Live Breakdown Pill Bar directly explaining the badge count -->
    <div style="display:flex;gap:.75rem;flex-wrap:wrap;margin:1rem 0;padding:.85rem;background:var(--sf);border-radius:var(--r);border:1px solid var(--ln);align-items:center">
      <div style="display:flex;align-items:center;gap:.4rem;font-size:.85rem"><span class="chip ${al.total > 0 ? 'c-crit' : 'c-done'}" style="font-weight:700">${al.total}</span> <b>Total Alert Items</b></div>
      <div style="display:flex;align-items:center;gap:.4rem;font-size:.85rem"><span class="chip ${compCount > 0 ? 'c-crit' : 'c-done'}">${compCount}</span> Complaints</div>
      <div style="display:flex;align-items:center;gap:.4rem;font-size:.85rem"><span class="chip ${regCount > 0 ? 'c-crit' : 'c-done'}">${regCount}</span> Traffic Reg & Ins</div>
      <div style="display:flex;align-items:center;gap:.4rem;font-size:.85rem"><span class="chip ${inspCount > 0 ? 'c-crit' : 'c-done'}">${inspCount}</span> Fahs Fanni</div>
      <div style="display:flex;align-items:center;gap:.4rem;font-size:.85rem"><span class="chip ${partsCount > 0 ? 'c-crit' : 'c-done'}">${partsCount}</span> Low Stock Parts</div>
      <div style="display:flex;align-items:center;gap:.4rem;font-size:.85rem"><span class="chip ${woCount > 0 ? 'c-crit' : 'c-done'}">${woCount}</span> WO Inspections</div>
      <div style="display:flex;align-items:center;gap:.4rem;font-size:.85rem"><span class="chip ${purCount > 0 ? 'c-crit' : 'c-done'}">${purCount}</span> Pending Purchases</div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(22rem,1fr));gap:1.5rem;margin-top:1rem">
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
          <h4 style="margin:0">📢 Pending Complaints Awaiting Review (${compCount})</h4>
          ${compCount ? `<button class="btn sm" data-a="nav" data-id="comp">Go to Complaints →</button>` : ""}
        </div>
        ${(al.complaints_list || []).map(c => `
          <div class="row" style="justify-content:space-between;border-bottom:1px solid var(--ln);padding-bottom:.5rem">
            <div style="flex:1;padding-right:.75rem">
              <b>${esc(c.code)} · ${esc(c.asset_code)}</b> <small class="mu">(${esc(c.asset_name)})</small>
              <div style="margin-top:.2rem;display:flex;gap:.35rem;align-items:center">
                <span class="chip ${c.priority === 'Critical' ? 'c-crit' : (c.priority === 'High' ? 'c-high' : 'c-reported')}">${esc(c.priority)}</span>
                <span class="chip c-reported">${esc(c.status)}</span>
              </div>
              <small class="mu" style="display:block;margin-top:.25rem">${esc(c.description.slice(0, 75))}${c.description.length > 75 ? '...' : ''}</small>
            </div>
            <button class="btn sm" data-a="nav" data-id="comp">Review →</button>
          </div>
        `).join("") || `<p class='mu'>${t("all_healthy")}</p>`}
      </div>

      <div class="card">
        <h4 style="margin-bottom:1rem">📄 Expiring Kuwait Traffic Reg & Insurance (${regCount})</h4>
        ${(al.insurance_expiring || []).map(a => `
          <div class="row" style="justify-content:space-between;border-bottom:1px solid var(--ln);padding-bottom:.5rem">
            <div>
              <b>${esc(a.code)} · ${esc(a.name)}</b>
              <small style="display:block;color:${a.expired ? 'var(--er)' : 'var(--wn)'}">Insurance: ${esc(a.insurance_expiry)} ${a.expired ? '(EXPIRED)' : '(Expiring Soon)'}</small>
            </div>
            <button class="btn g sm" data-a="open" data-id="${a.id}">Open</button>
          </div>
        `).join("")}
        ${(al.reg_expiring || []).map(a => `
          <div class="row" style="justify-content:space-between;border-bottom:1px solid var(--ln);padding-bottom:.5rem">
            <div>
              <b>${esc(a.code)} · ${esc(a.name)}</b>
              <small style="display:block;color:${a.expired ? 'var(--er)' : 'var(--wn)'}">Traffic Daftar: ${esc(a.reg_expiry)} ${a.expired ? '(EXPIRED)' : '(Expiring Soon)'}</small>
            </div>
            <button class="btn g sm" data-a="open" data-id="${a.id}">Open</button>
          </div>
        `).join("")}
        ${!al.insurance_expiring?.length && !al.reg_expiring?.length ? `<p class='mu'>${t("all_healthy")}</p>` : ""}
      </div>

      <div class="card">
        <h4 style="margin-bottom:1rem">🛠️ Expiring Technical Inspection / Fahs Fanni (${inspCount})</h4>
        ${(al.inspection_expiring || []).map(a => `
          <div class="row" style="justify-content:space-between;border-bottom:1px solid var(--ln);padding-bottom:.5rem">
            <div>
              <b>${esc(a.code)} · ${esc(a.name)}</b>
              <small style="display:block;color:${a.expired ? 'var(--er)' : 'var(--wn)'}">Fahs Fanni (الفحص الفني): ${esc(a.inspection_expiry)} ${a.expired ? '(EXPIRED)' : '(Expiring Soon)'}</small>
            </div>
            <button class="btn g sm" data-a="open" data-id="${a.id}">Open</button>
          </div>
        `).join("") || `<p class='mu'>${t("all_healthy")}</p>`}
      </div>

      <div class="card">
        <h4 style="margin-bottom:1rem">⚠️ Low Stock Spare Parts (${partsCount})</h4>
        ${(al.low_stock || []).map(p => `
          <div class="row" style="justify-content:space-between;border-bottom:1px solid var(--ln);padding-bottom:.5rem">
            <div>
              <b>${esc(p.stock_id)} · ${esc(p.name)}</b>
              <small class="mu" style="display:block">Current: <b class="low">${p.qty}</b> (Min: ${p.min_qty} ${esc(p.unit)})</small>
            </div>
            <button class="btn sm" data-a="nav" data-id="parts">Restock →</button>
          </div>
        `).join("") || `<p class='mu'>${t("all_healthy")}</p>`}
      </div>

      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
          <h4 style="margin:0">🔍 Work Orders Pending Inspection (${woCount})</h4>
          ${woCount ? `<button class="btn sm" data-a="nav" data-id="wo">Go to Work Orders →</button>` : ""}
        </div>
        ${(al.wo_inspections_list || []).map(w => `
          <div class="row" style="justify-content:space-between;border-bottom:1px solid var(--ln);padding-bottom:.5rem">
            <div style="flex:1;padding-right:.75rem">
              <b>${esc(w.code)} · ${esc(w.asset_code)}</b>
              <p style="margin:.2rem 0;font-size:.85rem">${esc(w.description.slice(0, 70))}</p>
              <span class="chip c-assigned">${esc(w.status)}</span>
            </div>
            <button class="btn sm" data-a="nav" data-id="wo">Inspect →</button>
          </div>
        `).join("") || `<p class='mu'>${t("all_healthy")}</p>`}
      </div>

      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
          <h4 style="margin:0">🛒 Purchases Awaiting Approval (${purCount})</h4>
          ${purCount ? `<button class="btn sm" data-a="nav" data-id="pur">Go to Purchases →</button>` : ""}
        </div>
        ${(al.purchases_list || []).map(p => `
          <div class="row" style="justify-content:space-between;border-bottom:1px solid var(--ln);padding-bottom:.5rem">
            <div style="flex:1;padding-right:.75rem">
              <b>${esc(p.code)} · ${esc(p.part_name)}</b>
              <p style="margin:.2rem 0;font-size:.85rem">Qty: ${p.qty} · Est: ${p.est_price || 0} ${esc(p.currency || 'KWD')}</p>
            </div>
            <button class="btn sm" data-a="nav" data-id="pur">Approve →</button>
          </div>
        `).join("") || `<p class='mu'>${t("all_healthy")}</p>`}
      </div>

      <div class="card" style="grid-column:1/-1">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
          <h4 style="margin:0">🔔 Activity & System Notifications (${unreadNotifs.length} Unread)</h4>
          ${unreadNotifs.length ? `<button class="btn g sm" data-a="notifAll">Mark All Read</button>` : ""}
        </div>
        ${(notifs || []).slice(0, 15).map(n => `
          <div class="row" style="justify-content:space-between;border-bottom:1px solid var(--ln);padding-bottom:.5rem;opacity:${n.read ? 0.65 : 1}">
            <div>
              <div style="display:flex;align-items:center;gap:.5rem">
                ${!n.read ? `<span class="dot" style="display:inline-block;width:8px;height:8px;background:var(--er,#c0392b);border-radius:50%"></span>` : ""}
                <b>${esc(n.title)}</b>
                <small class="chip ${n.read ? 'c-done' : 'c-crit'}">${n.read ? 'Read' : 'New'}</small>
              </div>
              <p style="margin:.25rem 0;font-size:.85rem;color:var(--ink)">${esc(n.message)}</p>
              <small class="mu">${esc(n.created_at)}</small>
            </div>
            ${!n.read ? `<button class="btn sm" onclick="api('/notifications/${n.id}/read', {method:'POST'}).then(() => refresh())">Mark Read</button>` : ""}
          </div>
        `).join("") || `<p class='mu'>No recent notifications.</p>`}
      </div>
    </div>
  `;
};

V.ws = async () => {
  const d = await api("/worksites?all=1");
  return `
    <h2 class="d">${t("nav_ws")}</h2>
    <div class="bar2">
      ${can("asset.edit") ? `<button class="btn" data-a="addWs">+ Add Kuwait Worksite</button>` : ""}
    </div>
    ${tbl([
      ["name", "Worksite / Location", r => `<b>${esc(r.name)}</b>${r.site_type ? `<div style="font-size:.78rem;color:var(--mu)">${esc(r.site_type)}</div>` : ""}`],
      ["governorate", "Governorate / Area", r => `${esc(r.governorate || "Kuwait")}${r.area ? ` · ${esc(r.area)}` : ""}`],
      ["paci_no", "PACI Civil No", r => r.paci_no ? `<span class="m">${esc(r.paci_no)}</span>` : "-"],
      ["asset_count", "Stationed Fleet", r => `<span class="chip c-verified">🚚 ${r.asset_count || 0} Assets</span>`],
      ["contact_person", "Site Supervisor", r => r.contact_person ? `${esc(r.contact_person)}${r.phone ? ` (${esc(r.phone)})` : ""}` : "-"],
      ["active", t("status"), r => r.active ? '<span class="chip c-done">Active</span>' : '<span class="chip c-reported">Inactive</span>']
    ], d, r => can("asset.edit") ? B("editWs", r.id, "Edit Details") : "")}
  `;
};

V.admin = async () => {
  const [uList, bList, audList, demoInfo] = await Promise.all([
    api("/users"),
    can("settings") ? api("/admin/backups") : [],
    api("/audit"),
    can("user.manage") ? api("/admin/demo/status").catch(() => null) : null
  ]);

  return `
    <h2 class="d">${t("nav_admin")}</h2>
    <div class="bar2">
      <button class="btn" data-a="addU">+ Create User</button>
    </div>
    ${tbl([
      ["username", "Username"],
      ["name", "Full Name"],
      ["role", "Role", r => esc(r.role.replace("_", " "))],
      ["preferred_lang", "Lang", r => (r.preferred_lang || "en").toUpperCase()],
      ["active", t("status"), r => r.active ? '<span class="chip c-done">Active</span>' : '<span class="chip c-reported">Deactivated</span>']
    ], uList, r => `
      ${B("editUser", r.id, "Edit / Password")}
      ${B("toggleUser", r.id, r.active ? "Deactivate" : "Activate")}
    `)}

    ${demoInfo ? `
      <h3 class="d" style="margin-top:2.5rem;display:flex;align-items:center;gap:.75rem;flex-wrap:wrap">
        <span>${t("demo_mgmt", "Demo Data Management")}</span>
        ${demoInfo.loaded ? `
          <span class="chip c-assigned" style="font-weight:700">● ${t("demo_active", "Demo Data Loaded")} (${demoInfo.total} records)</span>
        ` : `
          <span class="chip c-done">○ ${t("demo_none", "No Demo Data Loaded")}</span>
        `}
      </h3>
      <p class="mu" style="margin-bottom:1rem">
        Populate realistic Kuwait fleet demo records (CAT excavators, Actros tippers, Liebherr cranes, work orders, spare parts) for demonstrations and training, or completely remove all demo records and attached files without touching genuine company assets or user accounts.
      </p>

      <div class="card" style="padding:1.25rem;margin-bottom:1.25rem;background:var(--sf);border:1px solid var(--ln);border-radius:1rem">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(12rem,1fr));gap:1rem;margin-bottom:1.25rem">
          <div style="background:#fff;padding:1rem;border-radius:.75rem;border:1px solid var(--ln)">
            <small style="color:var(--mu);text-transform:uppercase;font-size:.7rem;font-weight:700">Total Demo Records</small>
            <div style="font-size:2rem;font-weight:700;color:${demoInfo.total > 0 ? 'var(--ac,#2B6CB0)' : 'var(--mu)'}">${demoInfo.total}</div>
            <small class="mu">Across all 12 modules</small>
          </div>
          <div style="background:#fff;padding:1rem;border-radius:.75rem;border:1px solid var(--ln)">
            <small style="color:var(--mu);text-transform:uppercase;font-size:.7rem;font-weight:700">Vehicles & Heavy Equipment</small>
            <div style="font-size:2rem;font-weight:700;color:var(--ink)">${demoInfo.counts.assets || 0}</div>
            <small class="mu">Kuwait registered units</small>
          </div>
          <div style="background:#fff;padding:1rem;border-radius:.75rem;border:1px solid var(--ln)">
            <small style="color:var(--mu);text-transform:uppercase;font-size:.7rem;font-weight:700">Complaints & Work Orders</small>
            <div style="font-size:2rem;font-weight:700;color:var(--ink)">${(demoInfo.counts.complaints || 0) + (demoInfo.counts.work_orders || 0)}</div>
            <small class="mu">${demoInfo.counts.complaints || 0} complaints · ${demoInfo.counts.work_orders || 0} WOs</small>
          </div>
          <div style="background:#fff;padding:1rem;border-radius:.75rem;border:1px solid var(--ln)">
            <small style="color:var(--mu);text-transform:uppercase;font-size:.7rem;font-weight:700">Spare Parts & Stock Tx</small>
            <div style="font-size:2rem;font-weight:700;color:var(--ink)">${(demoInfo.counts.parts || 0) + (demoInfo.counts.stock_tx || 0)}</div>
            <small class="mu">${demoInfo.counts.parts || 0} catalog · ${demoInfo.counts.stock_tx || 0} moves</small>
          </div>
          <div style="background:#fff;padding:1rem;border-radius:.75rem;border:1px solid var(--ln)">
            <small style="color:var(--mu);text-transform:uppercase;font-size:.7rem;font-weight:700">Purchases & Invoices</small>
            <div style="font-size:2rem;font-weight:700;color:var(--ink)">${demoInfo.counts.purchases || 0}</div>
            <small class="mu">Orders in KWD</small>
          </div>
          <div style="background:#fff;padding:1rem;border-radius:.75rem;border:1px solid var(--ln)">
            <small style="color:var(--mu);text-transform:uppercase;font-size:.7rem;font-weight:700">Maintenance Expenses</small>
            <div style="font-size:2rem;font-weight:700;color:var(--ink)">${demoInfo.counts.expenses || 0}</div>
            <small class="mu">Parts, inspection & cert</small>
          </div>
          <div style="background:#fff;padding:1rem;border-radius:.75rem;border:1px solid var(--ln)">
            <small style="color:var(--mu);text-transform:uppercase;font-size:.7rem;font-weight:700">Demo Files & Attachments</small>
            <div style="font-size:2rem;font-weight:700;color:var(--ink)">${demoInfo.counts.documents || 0}</div>
            <small class="mu">${((demoInfo.file_storage_bytes || 0) / 1024).toFixed(1)} KB on disk</small>
          </div>
          <div style="background:#fff;padding:1rem;border-radius:.75rem;border:1px solid var(--ln)">
            <small style="color:var(--mu);text-transform:uppercase;font-size:.7rem;font-weight:700">Other Demo Records</small>
            <div style="font-size:2rem;font-weight:700;color:var(--ink)">${(demoInfo.counts.transfers || 0) + (demoInfo.counts.historical_records || 0) + (demoInfo.counts.suppliers || 0) + (demoInfo.counts.notifications || 0)}</div>
            <small class="mu">History, transfers, suppliers</small>
          </div>
        </div>

        <div style="display:flex;gap:.75rem;flex-wrap:wrap;align-items:center;padding-top:.75rem;border-top:1px solid var(--ln)">
          <button class="btn" data-a="loadDemo" ${demoInfo.loaded ? 'style="opacity:0.6"' : ''}>
            📥 ${t("demo_load", "Load Demo Data")}
          </button>
          <button class="btn g" data-a="viewDemo" ${!demoInfo.loaded ? 'disabled style="opacity:0.5"' : ''}>
            👁️ ${t("demo_view", "View Demo Data")}
          </button>
          <button class="btn" data-a="clearDemo" style="background:#c0392b;color:#fff;border-color:#a93226;font-weight:700;margin-left:auto" ${demoInfo.total === 0 ? 'disabled style="background:#d98880;border-color:#d98880;cursor:not-allowed"' : ''}>
            🗑️ ${t("demo_clear", "CLEAR ALL DEMO DATA")}
          </button>
        </div>
        ${demoInfo.last_cleanup ? `
          <div style="margin-top:.75rem;font-size:.75rem;color:var(--mu)">
            Last demo cleanup performed at: <b>${esc(demoInfo.last_cleanup)}</b> (Automatic pre-cleanup database backup snapshot preserved).
          </div>
        ` : ""}
      </div>
    ` : ""}

    ${can("settings") ? `
      <h3 class="d" style="margin-top:2.5rem">Kuwait Base Currency & Multi-Currency Exchange Rates</h3>
      <div class="bar2">
        <button class="btn" data-a="viewRates">Manage KWD Exchange Rates & Sync</button>
      </div>
      <p class="mu">Primary Base Currency: <b>Kuwaiti Dinar (KWD)</b> · 3 Decimal Places (Fils). Supports live automatic conversion and admin manual overrides.</p>

      <h3 class="d" style="margin-top:2.5rem">SQLite Database Backups</h3>
      <div class="bar2">
        <button class="btn" data-a="bk">Create Database Backup</button>
      </div>
      <p class="mu">${bList.length ? "Available snapshots: " + bList.slice(0, 5).join(", ") : "No snapshots created."}</p>
    ` : ""}

    <h3 class="d" style="margin-top:2.5rem">System Audit Log</h3>
    ${tbl([
      ["at", "Timestamp"],
      ["user", "User"],
      ["action", "Action"],
      ["entity", "Entity"],
      ["entity_id", "Record ID"],
      ["detail", "Details"]
    ], audList)}
  `;
};

// ---------------- NAVIGATION CONFIG ----------------
const NAV = [
  ["dash", () => t("nav_dash"), () => can("asset.view")],
  ["assets", () => t("nav_assets"), () => can("asset.view")],
  ["comp", () => t("nav_comp"), () => any("complaint.create", "complaint.review", "asset.view")],
  ["wo", () => t("nav_wo"), () => can("wo.view")],
  ["parts", () => t("nav_parts"), () => can("inventory.view")],
  ["pur", () => t("nav_pur"), () => any("purchase.create", "purchase.approve", "purchase.record")],
  ["sup", () => t("nav_sup"), () => can("supplier.view")],
  ["exp", () => t("nav_exp"), () => can("expense.view")],
  ["hist", () => t("nav_hist"), () => can("historical.view")],
  ["reports", () => t("nav_reports"), () => can("report.view")],
  ["ws", () => t("nav_ws"), () => can("asset.view")],
  ["admin", () => t("nav_admin"), () => can("user.manage")]
];

function toggleMobileDrawer(force) {
  const overlay = $("#drawerOverlay");
  if (!overlay) return;
  const isOpen = force !== undefined ? force : !overlay.classList.contains("open");
  overlay.classList.toggle("open", isOpen);
  document.body.style.overflow = isOpen ? "hidden" : "";
}

function toggleMobileSearch(force) {
  const bar = $("#mobileSearchBar");
  if (!bar) return;
  const isOpen = force !== undefined ? force : !bar.classList.contains("open");
  bar.classList.toggle("open", isOpen);
  if (isOpen) {
    const inp = $("#mobileQueryInput");
    if (inp) setTimeout(() => inp.focus(), 100);
  }
}

async function go(v, a, back) {
  if (!back) HIST.push([v, a]);

  // 1. Desktop Nav
  const dNav = $("#nav");
  if (dNav) {
    dNav.innerHTML = NAV.filter(n => n[2]()).map(n => `<button data-a="nav" data-id="${n[0]}" class="${n[0] === v ? "on" : ""}">${n[1]()}</button>`).join("");
  }

  // 2. Mobile Bottom Nav active state
  $$(".bottom-nav-btn").forEach(btn => {
    const bid = btn.dataset.id;
    if (bid === v) {
      btn.classList.add("active");
    } else if (bid === "menu-drawer" && !["dash", "assets", "comp", "wo"].includes(v)) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // 3. Mobile Drawer active state
  $$(".drawer-item").forEach(item => {
    item.classList.toggle("active", item.dataset.id === v);
  });

  // 4. Auto-close drawer & search
  toggleMobileDrawer(false);
  toggleMobileSearch(false);

  // 5. Reset scroll
  window.scrollTo({ top: 0, behavior: "instant" });
  const mainEl = $("#main");
  if (mainEl) {
    mainEl.innerHTML = `<p class="mu" style="padding:2rem 0">Loading...</p>`;
    mainEl.scrollTop = 0;
  }

  try {
    if (V[v]) {
      mainEl.innerHTML = await V[v](a);
    } else {
      mainEl.innerHTML = `<p class="err">View not found: ${esc(v)}</p>`;
    }
    const pq = $("#pq");
    if (pq) pq.onsubmit = e => { e.preventDefault(); go("parts", pq.querySelector("input").value); };
    const btnGen = $("#btnGenRep");
    if (btnGen) {
      btnGen.onclick = () => go("reports");
      $("#repType").onchange = () => {
        const tok = localStorage.getItem("fleethub_token");
        $("#btnCsvRep").href = `/api/reports/export?type=${$("#repType").value}&format=csv` + (tok ? `&token=${encodeURIComponent(tok)}` : "");
      };
    }

    // Attach secondary KPIs accordion toggle on dashboard
    const btnToggleKpis = $("#btnToggleMoreKpis");
    if (btnToggleKpis) {
      btnToggleKpis.onclick = () => {
        const sec = $("#secondaryKpisContainer");
        if (sec) {
          const isHidden = sec.style.display === "none";
          sec.style.display = isHidden ? "grid" : "none";
          btnToggleKpis.querySelector("span").textContent = isHidden ? (t("collapse_kpis") || "Show Fewer Metrics ▴") : (t("all_kpis") || "Show All Fleet & Store Metrics (9 more) ▾");
        }
      };
    }

    updateAlertBadge();
  } catch (e) {
    mainEl.innerHTML = `<p class="err">${esc(e.message)}</p>`;
  }
}

const refresh = () => {
  const active = document.activeElement;
  if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.tagName === "SELECT") && $("#main")?.contains(active)) {
    return;
  }
  const h = HIST.pop() || ["dash"];
  return go(h[0], h[1]);
};

const run = async f => {
  try { await f(); } catch (e) { toast(e.message); }
};

const SYNC_BUS = window.BroadcastChannel ? new BroadcastChannel("fleethub_sync") : null;

const done = m => {
  toast(m);
  if (SYNC_BUS) SYNC_BUS.postMessage({ type: "mutation", at: Date.now() });
  return refresh();
};

// ---------------- ACTIONS ----------------
ACT.nav = d => go(d.id);
ACT.toggleDrawer = () => toggleMobileDrawer();
ACT.toggleSearch = () => toggleMobileSearch();
ACT.open = d => go("asset", d.id);
ACT.back = () => {
  HIST.pop();
  const h = HIST.pop() || ["dash"];
  go(h[0], h[1]);
};
ACT.out = async () => {
  localStorage.removeItem("fleethub_token");
  await post("/logout");
  ME = null;
  boot();
};

ACT.addA = async () => {
  const [ws, cats] = await Promise.all([api("/worksites"), api("/categories?kind=asset")]);
  const f = await ask("Register Equipment / Vehicle", AFS({}, ws, cats), "remarks");
  if (!f) return;
  const r = await post("/assets", fj(f));
  await done("Registered " + r.code);
};

ACT.editA = async d => {
  const [h, ws, cats] = await Promise.all([api(`/assets/${d.id}/history`), api("/worksites"), api("/categories?kind=asset")]);
  const f = await ask("Edit Equipment Specifications", AFS(h.asset, ws, cats), "remarks");
  if (!f) return;
  await put(`/assets/${d.id}`, fj(f));
  await done("Asset information updated.");
};

ACT.transferA = async d => {
  const wsList = await api("/worksites");
  const f = await ask("Relocate Asset / Transfer Worksite", [
    { n: "to_site_id", l: "Destination Kuwait Worksite", t: "select", o: opts(wsList, "id", w => `${w.name} (${w.governorate || 'Kuwait'})`), r: 1 },
    { n: "reason", l: "Transfer Reason / Project Deployment Ref", r: 1 },
    { n: "odometer_hours", l: "Current Odometer (km) or Operating Hours", t: "number" },
    { n: "transporter", l: "Transporter / Lowbed Carrier / Driver Name" }
  ]);
  if (!f) return;
  await post(`/assets/${d.id}/transfer`, fj(f));
  await done("Asset worksite transfer logged successfully.");
  go("asset", d.id);
};

ACT.arch = async d => {
  if (!confirm("Toggle active/archive state for this asset?")) return;
  await post(`/assets/${d.id}/archive`);
  await done("Status updated.");
};

ACT.upDoc = async d => {
  const f = await ask("Upload Document or Photo", [
    { n: "kind", l: "Document Type", t: "select", o: ["Registration", "Insurance Certificate", "Inspection Certificate", "Photograph", "Job Card", "Technical Spec", "Other"].map(x => [x, x]) },
    { n: "file", l: "Document / Image (PDF, JPG, JPEG, PNG, WEBP)", t: "file", r: 1 }
  ]);
  if (!f) return;
  await post(`/assets/${d.id}/documents`, f);
  await done("Document uploaded.");
};

ACT.impA = async () => {
  const f = await ask("Bulk Import Equipment (CSV)", [
    { n: "file", l: "CSV File (UTF-8)", t: "file", r: 1 }
  ]);
  if (!f) return;
  const r = await post("/assets/import", f);
  await done(`Import complete: ${r.imported} added.`);
};

// Complaint with Voice Recorder & Translation
ACT.newC = async () => {
  const f = await ask("Report Breakdown or Equipment Problem", [
    { n: "asset_id", l: "Vehicle / Equipment", t: "select", o: await aOpts(!can("asset.view")), r: 1 },
    { n: "location", l: "Current Location / Worksite" },
    { n: "category", l: "Problem Category", t: "select", o: ["Breakdown", "Unusual Sound", "Hydraulic Leak", "Brake Problem", "Engine Overheating", "Damage", "Electrical", "Performance Issue", "Other"].map(x => [x, x]) },
    { n: "description", l: "Detailed Problem Description (English Translation will appear here)", t: "textarea", r: 1 },
    { n: "priority", l: t("priority"), t: "select", o: ["Low", "Normal", "High", "Critical"].map(x => [x, x]), v: "Normal" },
    { n: "photo", l: "Attachment / Photo (Optional)", t: "file" }
  ], "description");
  if (!f) return;
  const r = await post("/complaints", f);
  await done("Complaint " + r.code + " registered and forwarded to Transport.");
};

ACT.decide = async d => {
  const f = await ask(d.d === "approve" ? "Approve Complaint" : (d.d === "reject" ? "Reject Complaint" : "Request More Information"), [
    { n: "note", l: d.d === "approve" ? "Approval Note (Optional)" : "Reason / Information Requested", t: "textarea", r: d.d !== "approve" },
    { n: "priority", l: t("priority"), t: "select", o: ["Low", "Normal", "High", "Critical"].map(x => [x, x]), v: "Normal" }
  ]);
  if (!f) return;
  await post(`/complaints/${d.id}/decide`, { ...fj(f), decision: d.d });
  await done("Complaint decision recorded.");
};

ACT.mkWo = async d => {
  const f = await ask("Generate Work Order from Complaint", [
    { n: "category", l: "Maintenance Category", v: "Repair" },
    { n: "assignee", l: "Assign Mechanic (Full Name)" }
  ]);
  if (!f) return;
  const r = await post("/work-orders", { ...fj(f), complaint_id: d.id });
  await done("Work order " + r.code + " created.");
};

ACT.newW = async () => {
  const f = await ask("Create Standalone Work Order", [
    { n: "asset_id", l: "Select Equipment / Vehicle", t: "select", o: await aOpts(), r: 1 },
    { n: "category", l: "Work Category", v: "Routine Service" },
    { n: "description", l: "Work Order Description (English)", t: "textarea", r: 1 },
    { n: "priority", l: t("priority"), t: "select", o: ["Low", "Normal", "High", "Critical"].map(x => [x, x]), v: "Normal" },
    { n: "assignee", l: "Assigned Mechanic / Lead" }
  ], "description");
  if (!f) return;
  const r = await post("/work-orders", fj(f));
  await done("Work order " + r.code + " created.");
};

ACT.woNext = async d => {
  const f = await ask("Advance Work Order Status to: " + d.s, [
    ...(d.s === "Assigned" ? [{ n: "assignee", l: "Assign Mechanic (Full Name)", r: 1 }] : []),
    { n: "note", l: "Inspection Findings / Completion Note", t: "textarea" }
  ], "note");
  if (!f) return;
  await post(`/work-orders/${d.id}/status`, { ...fj(f), status: d.s });
  await done("Status updated.");
};

ACT.upWoDoc = async d => {
  const f = await ask("Upload Work Order Attachment / Voice Note", [
    { n: "kind", l: "Attachment Type", t: "select", o: ["Repair photograph", "Voice recording", "Inspection Sheet", "Job Card", "Other"].map(x => [x, x]) },
    { n: "file", l: "Document / Image / Audio (PDF, JPG, PNG, WebM, WAV)", t: "file", r: 1 }
  ]);
  if (!f) return;
  await post(`/work-orders/${d.id}/documents`, f);
  await done("Work order attachment uploaded.");
};

ACT.newP = async () => {
  const [supList, catList] = await Promise.all([api("/suppliers"), api("/categories?kind=part")]);
  const f = await ask("Add Spare Part to Catalogue", [
    { n: "name", l: "Part Name", r: 1 },
    { n: "stock_id", l: "Stock ID (Leave blank to generate)" },
    { n: "category", l: "Category", t: "select", o: catList.map(c => [c.name, c.name]) },
    { n: "manufacturer", l: "Manufacturer" },
    { n: "oem_no", l: "OEM Part Number" },
    { n: "compat", l: "Compatible Makes / Models" },
    { n: "unit", l: "Unit of Measure", v: "pcs" },
    { n: "min_qty", l: "Minimum Level", t: "number", v: 1 },
    { n: "unit_cost", l: "Unit Cost (KWD)", t: "number", v: 0 },
    { n: "location", l: "Storage Location" },
    { n: "supplier_id", l: "Preferred Supplier", t: "select", o: opts(supList, "id", s => s.name, "(None)") }
  ]);
  if (!f) return;
  const r = await post("/parts", fj(f));
  await done("Added part: " + r.stock_id);
};

ACT.stockIn = async d => {
  const f = await ask("Stock In (Receive Inventory)", [
    { n: "qty", l: "Quantity Received", t: "number", r: 1 },
    { n: "unit_cost", l: "Unit Purchase Cost (KWD)", t: "number" },
    { n: "note", l: "Delivery Note Ref" }
  ]);
  if (!f) return;
  await post(`/parts/${d.id}/stock`, { ...fj(f), kind: "in" });
  await done("Inventory updated.");
};

ACT.adjust = async d => {
  const f = await ask("Reconcile Stock Count", [
    { n: "qty", l: "Counted Quantity", t: "number", r: 1 },
    { n: "note", l: "Reason (Required)", r: 1 }
  ], "note");
  if (!f) return;
  await post(`/parts/${d.id}/stock`, { ...fj(f), kind: "adjust" });
  await done("Stock adjusted.");
};

ACT.issue = async d => {
  const f = await ask("Issue Spare Part to Work Order", [
    { n: "wo_id", l: "Select Work Order", t: "select", o: await woOpts(), r: 1 },
    { n: "qty", l: "Quantity", t: "number", r: 1 }
  ]);
  if (!f) return;
  await post(`/parts/${d.id}/issue`, fj(f));
  await done("Part issued to work order.");
};

ACT.ret = async d => {
  const f = await ask("Return Part from Work Order", [
    { n: "wo_id", l: "Select Work Order", t: "select", o: await woOpts(), r: 1 },
    { n: "qty", l: "Quantity", t: "number", r: 1 }
  ]);
  if (!f) return;
  await post(`/parts/${d.id}/return`, fj(f));
  await done("Part returned to stock.");
};

ACT.phist = async d => {
  const h = await api(`/parts/${d.id}/history`);
  show("Stock Movement History", tbl([
    ["at", "Timestamp"],
    ["kind", "Action", r => chip(r.kind.toUpperCase())],
    ["qty", "Qty"],
    ["prev_qty", "Before"],
    ["new_qty", "After"],
    ["asset_code", "Asset"],
    ["wo_code", "Work Order"],
    ["by", "Handled By"]
  ], h));
};

const CURR_OPTS = [
  ["KWD", "KWD - Kuwaiti Dinar (Default Base)"],
  ["USD", "USD - US Dollar"],
  ["EUR", "EUR - Euro"],
  ["GBP", "GBP - British Pound"],
  ["AED", "AED - UAE Dirham"],
  ["SAR", "SAR - Saudi Riyal"],
  ["QAR", "QAR - Qatari Riyal"],
  ["BHD", "BHD - Bahraini Dinar"],
  ["OMR", "OMR - Omani Rial"],
  ["INR", "INR - Indian Rupee"],
  ["JPY", "JPY - Japanese Yen"],
  ["CNY", "CNY - Chinese Yuan"]
];

ACT.newU = async () => {
  const [partsList, supList] = await Promise.all([api("/parts"), api("/suppliers")]);
  const f = await ask("Request External Purchase", [
    { n: "bill", l: "📄 Upload Quotation / Invoice / Bill (Optional - AI Auto-Fills Form)", t: "file" },
    { n: "part_name", l: "Part Name / Description", r: 1 },
    { n: "qty", l: "Quantity", t: "number", r: 1 },
    { n: "part_id", l: "Catalogue Match", t: "select", o: opts(partsList, "id", p => `${p.stock_id} · ${p.name} (${p.qty} in stock)`, "(Not in catalogue)") },
    { n: "wo_id", l: "Work Order", t: "select", o: await woOpts("(None, stock purchase)") },
    { n: "to_stock", l: "Destination", t: "select", o: [["0", "Direct to Work Order"], ["1", "Add to Inventory"]] },
    { n: "currency", l: "Currency", t: "select", o: CURR_OPTS, v: "KWD" },
    { n: "est_price", l: "Estimated Unit Price", t: "number" },
    { n: "exchange_rate", l: "Manual Exchange Rate to KWD (Optional; leave blank for automatic live rate)", t: "number" },
    { n: "supplier_id", l: "Supplier", t: "select", o: opts(supList, "id", s => s.name, "(Other)") },
    { n: "supplier", l: "Supplier / Outside Shop Name" }
  ]);
  if (!f) return;
  const r = await post("/purchases", fj(f));
  await done("Purchase request " + r.code + " submitted.");
};

ACT.pdec = async d => {
  const act = d.d === "approve" ? "Approve" : "Reject";
  if (!confirm(`${act} this external purchase request?`)) return;
  await post(`/purchases/${d.id}/decide`, { decision: d.d });
  await done(`Purchase request ${act.toLowerCase()}d.`);
};

ACT.prec = async d => {
  const f = await ask("Record Actual Purchase & Upload Original Bill", [
    { n: "bill", l: "Original Bill / Invoice / Receipt (PDF, JPG, JPEG, PNG, WEBP)", t: "file", r: 1 },
    { n: "currency", l: "Currency", t: "select", o: CURR_OPTS, v: "KWD" },
    { n: "unit_price", l: "Actual Unit Price", t: "number", r: 1 },
    { n: "exchange_rate", l: "Manual Exchange Rate to KWD (Optional; leave blank for automatic live rate)", t: "number" },
    { n: "invoice_no", l: "Invoice / Bill Number", r: 1 },
    { n: "supplier", l: "Supplier Name" },
    { n: "doc_kind", l: "Document Type", t: "select", o: [
      ["External Purchase Bill", "External Purchase Bill"],
      ["Supplier Invoice", "Supplier Invoice"],
      ["Purchase Receipt", "Purchase Receipt"],
      ["Supporting Document", "Supporting Document"]
    ], v: "External Purchase Bill" }
  ]);
  if (!f) return;
  await post(`/purchases/${d.id}/record`, f);
  await done("Purchase recorded and bill saved.");
};

ACT.purDocs = async d => {
  const purchaseId = d.id;
  async function renderModal() {
    let res = { documents: [], purchase: {} };
    try {
      res = await api(`/purchases/${purchaseId}/documents`);
    } catch (e) {
      alert("Failed to load documents: " + e.message);
      return;
    }
    const docs = res.documents || [];
    const p = res.purchase || {};

    const dlg = document.createElement("dialog");
    dlg.className = "dlg pur-doc-modal";
    dlg.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem">
        <h3 class="d" style="margin:0">📎 Purchase Documents: ${esc(p.code || '')} - ${esc(p.part_name || '')}</h3>
        <button type="button" class="btn sm g" id="purCloseBtn">✕</button>
      </div>
      <p class="mu" style="font-size:.85rem;margin-top:0">Upload and manage bills, supplier invoices, receipts, and supporting documents.</p>
      
      <div class="pur-doc-list">
        ${docs.length === 0 ? `<div style="text-align:center;padding:1.5rem;color:var(--mu);background:#f8fafc;border-radius:.5rem">No documents uploaded yet for this purchase.</div>` : ''}
        ${docs.map(doc => `
          <div class="pur-doc-item">
            <div style="display:flex;align-items:center;gap:.65rem">
              <span style="font-size:1.3rem">${(doc.filename || '').endsWith('.pdf') ? '📄' : '🖼️'}</span>
              <div>
                <div style="font-weight:600;color:#111">${esc(doc.filename)}</div>
                <div style="font-size:.75rem;color:var(--mu)">
                  <span class="chip" style="background:#e0f2fe;color:#0369a1;padding:.1rem .4rem">${esc(doc.kind || 'Document')}</span>
                  · ${(doc.bytes / 1024).toFixed(1)} KB · ${esc(doc.created_at || '')}
                </div>
              </div>
            </div>
            <div style="display:flex;gap:.35rem">
              <a href="${fileUrl(doc.id)}" target="_blank" class="btn sm" style="text-decoration:none">👁️ View</a>
              <a href="${fileUrl(doc.id, "dl=1")}" download="${esc(doc.filename)}" class="btn sm g" style="text-decoration:none">⬇️ Download</a>
              <button type="button" class="btn sm er" data-doc-id="${doc.id}">🗑️</button>
            </div>
          </div>
        `).join('')}
      </div>

      <div style="border-top:1px solid var(--ln);padding-top:.85rem;margin-top:.75rem">
        <h4 style="margin:0 0 .5rem 0;font-size:.9rem">Upload New Purchase Document</h4>
        <form id="purDocUploadForm" style="display:grid;gap:.65rem">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem">
            <div>
              <label style="font-size:.75rem;font-weight:600;color:var(--mu);display:block;margin-bottom:.25rem">DOCUMENT TYPE</label>
              <select name="kind" class="inp" style="width:100%" required>
                <option value="External Purchase Bill">External Purchase Bill</option>
                <option value="Supplier Invoice">Supplier Invoice</option>
                <option value="Purchase Receipt">Purchase Receipt</option>
                <option value="Supporting Document">Supporting Document</option>
              </select>
            </div>
            <div>
              <label style="font-size:.75rem;font-weight:600;color:var(--mu);display:block;margin-bottom:.25rem">CHOOSE FILE (PDF, JPG, JPEG, PNG, WEBP)</label>
              <input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png,.webp" class="inp" style="width:100%" required>
            </div>
          </div>
          <div id="purUploadProg" class="pur-upload-progress" style="display:none">
            <div id="purUploadBar" class="pur-upload-bar"></div>
          </div>
          <div style="display:flex;justify-content:flex-end;gap:.5rem">
            <button type="submit" class="btn" id="purSubmitBtn">⬆️ Upload Document</button>
          </div>
        </form>
      </div>
    `;

    document.body.append(dlg);
    dlg.showModal();

    dlg.querySelector("#purCloseBtn").onclick = () => {
      dlg.close();
      dlg.remove();
      // Reload current view to update doc counter
      if (typeof V.pur === "function") nav("pur");
    };

    // Delete document handler
    dlg.querySelectorAll(".btn.sm.er").forEach(btn => {
      btn.onclick = async () => {
        const docId = btn.getAttribute("data-doc-id");
        if (!confirm("Are you sure you want to delete this purchase document?")) return;
        try {
          await api(`/purchases/${purchaseId}/documents/${docId}`, { method: "DELETE" });
          dlg.close();
          dlg.remove();
          await renderModal();
        } catch (e) {
          alert("Error deleting document: " + e.message);
        }
      };
    });

    // Upload form handler
    const form = dlg.querySelector("#purDocUploadForm");
    const purFileInput = form.querySelector('input[type="file"]');
    setupDocumentAutoFill(form, purFileInput, "purchase");

    form.onsubmit = async (e) => {
      e.preventDefault();
      const fileInput = form.querySelector('input[type="file"]');
      if (!fileInput.files || !fileInput.files[0]) {
        alert("Please select a file to upload.");
        return;
      }
      const file = fileInput.files[0];
      const ext = file.name.split('.').pop().toLowerCase();
      if (!["pdf", "jpg", "jpeg", "png", "webp"].includes(ext)) {
        alert("Invalid file format. Allowed: PDF, JPG, JPEG, PNG, WEBP.");
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        alert("File size exceeds 25 MB limit.");
        return;
      }

      const prog = dlg.querySelector("#purUploadProg");
      const bar = dlg.querySelector("#purUploadBar");
      const submitBtn = dlg.querySelector("#purSubmitBtn");

      prog.style.display = "block";
      bar.style.width = "40%";
      submitBtn.disabled = true;

      try {
        const fd = new FormData(form);
        bar.style.width = "75%";
        await post(`/purchases/${purchaseId}/documents`, fd);
        bar.style.width = "100%";
        setTimeout(async () => {
          dlg.close();
          dlg.remove();
          await renderModal();
        }, 300);
      } catch (err) {
        prog.style.display = "none";
        submitBtn.disabled = false;
        alert("Upload failed: " + err.message);
      }
    };
  }

  await renderModal();
};

ACT.addSup = async () => {
  const f = await ask("Add New Supplier / Vendor", [
    { n: "name", l: "Supplier / Workshop Name", r: 1 },
    { n: "country", l: "Country / Business Region", v: "Kuwait" },
    { n: "civil_id_cr", l: "Commercial Registration (CR) / Civil ID No." },
    { n: "paci_no", l: "PACI Building / Plot No (الرقم الآلي للعنوان)" },
    { n: "contact_person", l: "Contact Person" },
    { n: "phone", l: "Phone Number" },
    { n: "email", l: "Email Address" },
    { n: "address", l: "Address / Area in Kuwait" },
    { n: "tax_no", l: "Tax / Commercial Reg No" },
    { n: "categories", l: "Products / Categories Supplied" },
    { n: "notes", l: "Remarks / Notes", t: "textarea" }
  ], "notes");
  if (!f) return;
  const r = await post("/suppliers", fj(f));
  await done("Supplier " + r.code + " registered.");
};

ACT.viewSup = async d => {
  const res = await api(`/suppliers/${d.id}`);
  const s = res.supplier;
  show(`Supplier Profile: ${s.name}`, `
    <div class="kv">
      <div><small>Code</small><b>${s.code}</b></div>
      <div><small>Country</small><span>${esc(s.country || "Kuwait")}</span></div>
      <div><small>CR / Civil ID</small><span>${esc(s.civil_id_cr || "-")}</span></div>
      <div><small>PACI Number</small><span>${esc(s.paci_no || "-")}</span></div>
      <div><small>Contact Person</small><span>${esc(s.contact_person || "-")}</span></div>
      <div><small>Phone</small><span>${esc(s.phone || "-")}</span></div>
      <div><small>Email</small><span>${esc(s.email || "-")}</span></div>
      <div><small>Address</small><span>${esc(s.address || "-")}</span></div>
      <div><small>Supplies</small><span>${esc(s.categories || "-")}</span></div>
    </div>
    <h4 style="margin:1.5rem 0 .5rem">Purchases (${res.purchases.length})</h4>
    ${tbl([
      ["code", "Purchase ID"],
      ["part_name", "Part"],
      ["qty", "Qty"],
      ["unit_price", "Unit Price", r => r.unit_price ? `${rs(r.unit_price)}${r.currency && r.currency !== 'KWD' ? ` <small class="mu">(${r.original_price} ${r.currency})</small>` : ''}` : "-"],
      ["invoice_no", "Invoice"],
      ["status", t("status"), r => chip(r.status)],
      ["bill_id", "Bill", r => bill(r.bill_id)]
    ], res.purchases)}
  `);
};

ACT.editSup = async d => {
  const res = await api(`/suppliers/${d.id}`);
  const s = res.supplier;
  const f = await ask("Edit Supplier Details", [
    { n: "name", l: "Supplier Name", v: s.name, r: 1 },
    { n: "country", l: "Country / Business Region", v: s.country || "Kuwait" },
    { n: "civil_id_cr", l: "Commercial Registration (CR) / Civil ID No.", v: s.civil_id_cr },
    { n: "paci_no", l: "PACI Building / Plot No", v: s.paci_no },
    { n: "contact_person", l: "Contact Person", v: s.contact_person },
    { n: "phone", l: "Phone", v: s.phone },
    { n: "email", l: "Email", v: s.email },
    { n: "address", l: "Address", v: s.address },
    { n: "tax_no", l: "Tax No", v: s.tax_no },
    { n: "categories", l: "Categories", v: s.categories },
    { n: "notes", l: "Notes", t: "textarea", v: s.notes }
  ], "notes");
  if (!f) return;
  await put(`/suppliers/${d.id}`, fj(f));
  await done("Supplier updated.");
};

ACT.toggleSup = async d => {
  await post(`/suppliers/${d.id}/toggle`);
  await done("Supplier status updated.");
};

ACT.newE = async () => {
  const f = await ask("Record External Maintenance Expense", [
    { n: "bill", l: "Invoice / Receipt (PDF, JPG, PNG, WEBP)", t: "file", r: 1 },
    { n: "asset_id", l: "Equipment / Vehicle", t: "select", o: await aOpts(), r: 1 },
    { n: "wo_id", l: "Work Order (Optional)", t: "select", o: await woOpts("(None)") },
    { n: "kind", l: "Expense Type", t: "select", o: [
      ["external_labour", "External Labour (Authorized outside mechanic)"],
      ["outsourced_service", "Outsourced Specialist Service"],
      ["towing", "Towing / Transport Expense"],
      ["external_inspection", "External Inspection Fee"],
      ["other_approved", "Other Approved Maintenance Expense"]
    ] },
    { n: "currency", l: "Currency", t: "select", o: CURR_OPTS, v: "KWD" },
    { n: "amount", l: "Amount Paid", t: "number", r: 1 },
    { n: "exchange_rate", l: "Manual Exchange Rate to KWD (Optional; leave blank for automatic live rate)", t: "number" },
    { n: "note", l: "Payment Note / Work Done", r: 1 }
  ]);
  if (!f) return;
  await post("/expenses", f);
  await done("Expense recorded.");
};

ACT.addH = async () => {
  const f = await ask("Digitize Historical Paper Record", [
    { n: "document", l: "Scanned Paperwork / Bill (PDF, JPG, PNG, WEBP)", t: "file" },
    { n: "asset_id", l: "Vehicle / Equipment", t: "select", o: await aOpts(), r: 1 },
    { n: "record_type", l: "Record Type", t: "select", o: ["service", "repair", "complaint", "parts_replacement", "expense", "inspection", "job_card", "other"].map(x => [x, x.toUpperCase()]) },
    { n: "record_date", l: "Historical Date", t: "date", r: 1 },
    { n: "title", l: "Record Title", r: 1 },
    { n: "description", l: "Description of Work", t: "textarea" },
    { n: "work_order_ref", l: "Old Work Order / Job Card Ref" },
    { n: "invoice_no", l: "Legacy Invoice No" },
    { n: "supplier_vendor", l: "Workshop / Vendor" },
    { n: "performed_by", l: "Technician" },
    { n: "cost", l: "Historical Cost (KWD)", t: "number" },
    { n: "verified", l: "Verification Status", t: "select", o: [["1", "Verified"], ["0", "Unverified / Incomplete"]] }
  ]);
  if (!f) return;
  const r = await post("/historical", f);
  await done("Historical paper record digitized: " + r.code);
};

ACT.impH = async () => {
  const f = await ask("Bulk Import Historical Records (CSV)", [
    { n: "file", l: "CSV File (UTF-8)", t: "file", r: 1 }
  ]);
  if (!f) return;
  const r = await post("/historical/import", f);
  await done(`Import complete: ${r.imported} digitized records.`);
};

ACT.addWs = async () => {
  const f = await ask("Add Kuwait Worksite / Operational Yard", [
    { n: "name", l: "Worksite / Location Name", r: 1 },
    { n: "site_type", l: "Site Type", t: "select", o: [
      ["Central Workshop / Yard", "Central Workshop / Yard"],
      ["Project Site", "Project Site / Construction Location"],
      ["Operational Base", "Operational Base / Depot"],
      ["Client Site", "Client Site / Contract Assignment"]
    ] },
    { n: "governorate", l: "Kuwait Governorate", t: "select", o: [
      ["Ahmadi", "Ahmadi / الأحمدي"],
      ["Capital", "Capital / العاصمة"],
      ["Farwaniya", "Farwaniya / الفروانية"],
      ["Jahra", "Jahra / الجهراء"],
      ["Hawalli", "Hawalli / حولي"],
      ["Mubarak Al-Kabeer", "Mubarak Al-Kabeer / مبارك الكبير"]
    ] },
    { n: "area", l: "Area / Industrial Zone (e.g. Shuwaikh, Sulaibiya)" },
    { n: "paci_no", l: "Kuwait PACI Number (الرقم الآلي للعنوان)" },
    { n: "gps_lat", l: "GPS Latitude", t: "number" },
    { n: "gps_lng", l: "GPS Longitude", t: "number" },
    { n: "contact_person", l: "Site Supervisor / Contact Person" },
    { n: "phone", l: "Site Contact Phone Number" }
  ]);
  if (!f) return;
  await post("/worksites", fj(f));
  await done("Worksite registered.");
};

ACT.editWs = async d => {
  const s = await api(`/worksites/${d.id}`);
  const f = await ask("Edit Kuwait Worksite", [
    { n: "name", l: "Worksite / Location Name", v: s.name, r: 1 },
    { n: "site_type", l: "Site Type", t: "select", o: [
      ["Central Workshop / Yard", "Central Workshop / Yard"],
      ["Project Site", "Project Site / Construction Location"],
      ["Operational Base", "Operational Base / Depot"],
      ["Client Site", "Client Site / Contract Assignment"]
    ], v: s.site_type },
    { n: "governorate", l: "Kuwait Governorate", t: "select", o: [
      ["Ahmadi", "Ahmadi / الأحمدي"],
      ["Capital", "Capital / العاصمة"],
      ["Farwaniya", "Farwaniya / الفروانية"],
      ["Jahra", "Jahra / الجهراء"],
      ["Hawalli", "Hawalli / حولي"],
      ["Mubarak Al-Kabeer", "Mubarak Al-Kabeer / مبارك الكبير"]
    ], v: s.governorate },
    { n: "area", l: "Area / Industrial Zone", v: s.area },
    { n: "paci_no", l: "Kuwait PACI Number (الرقم الآلي للعنوان)", v: s.paci_no },
    { n: "gps_lat", l: "GPS Latitude", t: "number", v: s.gps_lat },
    { n: "gps_lng", l: "GPS Longitude", t: "number", v: s.gps_lng },
    { n: "contact_person", l: "Site Supervisor / Contact Person", v: s.contact_person },
    { n: "phone", l: "Site Contact Phone Number", v: s.phone },
    { n: "active", l: "Status", t: "select", o: [["1", "Active"], ["0", "Inactive"]], v: s.active }
  ]);
  if (!f) return;
  await put(`/worksites/${d.id}`, fj(f));
  await done("Worksite updated.");
};

ACT.addU = async () => {
  const f = await ask("Create User Account", [
    { n: "username", l: "Username", r: 1 },
    { n: "name", l: "Full Name", r: 1 },
    { n: "role", l: "Role", t: "select", o: [
      ["super_admin", "Super Admin"],
      ["company_admin", "Company Admin"],
      ["transport", "Transport Department"],
      ["mechanical", "Mechanical Section"],
      ["workshop", "Workshop Lead"],
      ["mechanic", "Mechanic / Technician"],
      ["inventory", "Inventory / Spare Parts"],
      ["procurement", "Procurement"],
      ["driver", "Driver / Operator"],
      ["management", "Management / Executive"]
    ], r: 1 },
    { n: "preferred_lang", l: "Preferred Language", t: "select", o: [["en", "English"], ["hi", "Hindi (हिन्दी)"], ["ar", "Arabic (العربية)"]], v: "en" },
    { n: "password", l: "Password (8+ characters)", t: "password", r: 1 }
  ]);
  if (!f) return;
  await post("/users", fj(f));
  await done("User account created.");
};

ACT.editUser = async d => {
  const uList = await api("/users");
  const u = uList.find(x => x.id === Number(d.id));
  if (!u) return;
  const f = await ask(`Edit User: ${u.username}`, [
    { n: "name", l: "Full Name", v: u.name, r: 1 },
    { n: "role", l: "Role", t: "select", o: [
      ["super_admin", "Super Admin"],
      ["company_admin", "Company Admin"],
      ["transport", "Transport Department"],
      ["mechanical", "Mechanical Section"],
      ["workshop", "Workshop Lead"],
      ["mechanic", "Mechanic / Technician"],
      ["inventory", "Inventory / Spare Parts"],
      ["procurement", "Procurement"],
      ["driver", "Driver / Operator"],
      ["management", "Management / Executive"]
    ], v: u.role },
    { n: "preferred_lang", l: "Preferred Language", t: "select", o: [["en", "English"], ["hi", "Hindi (हिन्दी)"], ["ar", "Arabic (العربية)"]], v: u.preferred_lang || "en" },
    { n: "password", l: "New Password (Leave blank to keep existing)", t: "password" }
  ]);
  if (!f) return;
  await put(`/users/${d.id}`, fj(f));
  await done("User updated.");
};

ACT.toggleUser = async d => {
  await post(`/users/${d.id}/toggle`);
  await done("User status updated.");
};

ACT.bk = async () => {
  const r = await post("/admin/backup");
  await done("Backup created: " + r.file);
};

ACT.viewRates = async () => {
  const r = await api("/currency/rates");
  show("Kuwait Dinar (KWD) Base Exchange Rates", `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem">
      <small class="mu">Provider: ${esc(r.provider)} · Base Currency: <b>${esc(r.base)}</b></small>
      <button class="btn sm" data-a="syncRates">🔄 Sync Live Rates</button>
    </div>
    ${tbl([
      ["currency", "Currency"],
      ["rate_to_kwd", "1 Unit = KWD (fils)", row => `${Number(row.rate_to_kwd).toFixed(4)} KWD`],
      ["rate_from_kwd", "1 KWD =", row => `${Number(row.rate_from_kwd).toFixed(4)} ${row.currency}`],
      ["is_manual", "Type", row => row.is_manual ? '<span class="chip c-assigned">Admin Manual</span>' : '<span class="chip c-done">Live Feed</span>'],
      ["updated_at", "Last Updated"]
    ], r.rates, row => B("editRate", row.currency, "Edit Manual Rate"))}
  `);
};

ACT.syncRates = async () => {
  const res = await post("/currency/sync");
  await done(`Synced ${res.updated_count} currency rates from live provider.`);
  ACT.viewRates();
};

ACT.editRate = async d => {
  const f = await ask(`Set Manual Rate for ${d.id} against KWD`, [
    { n: "rate_from_kwd", l: `Units per 1 KWD (e.g. 1 KWD = X ${d.id})`, t: "number", r: 1 }
  ]);
  if (!f) return;
  const val = Number(f.get("rate_from_kwd"));
  if (!val || val <= 0) return alert("Invalid rate");
  await post("/currency/rates", { currency: d.id, rate_from_kwd: val, rate_to_kwd: 1.0 / val });
  await done("Manual exchange rate saved.");
  ACT.viewRates();
};

ACT.notifAll = async () => {
  await post("/notifications/read-all");
  await done("All notifications marked read.");
};

ACT.loadDemo = async () => {
  const st = await api("/admin/demo/status");
  if (st.loaded) {
    if (!confirm("Standard Kuwait fleet demo dataset is already loaded in the database. Do you wish to reload?")) return;
  }
  const r = await post("/admin/demo/load");
  await done(r.message || "Demo dataset loaded successfully!");
  go("admin");
};

ACT.viewDemo = async () => {
  const d = await api("/admin/demo/preview");
  const aTbl = (d.assets && d.assets.length) ? `
    <h4 style="margin:1rem 0 .5rem;color:var(--ink)">Demo Vehicles & Heavy Equipment (${d.assets.length})</h4>
    <div class="tw card" style="margin-bottom:1rem">
      <table>
        <thead><tr><th>Code</th><th>Name</th><th>Category</th><th>Kuwait Plate No.</th><th>Status</th><th>Purchase Cost</th></tr></thead>
        <tbody>
          ${d.assets.map(a => `<tr><td><b>${esc(a.code)}</b></td><td>${esc(a.name)}</td><td>${esc(a.category)}</td><td>${esc(a.reg_no || "-")}</td><td>${chip(a.status)}</td><td>${rs(a.purchase_cost)}</td></tr>`).join("")}
        </tbody>
      </table>
    </div>` : `<p class="mu">No demo assets found.</p>`;

  const wTbl = (d.work_orders && d.work_orders.length) ? `
    <h4 style="margin:1rem 0 .5rem;color:var(--ink)">Demo Work Orders (${d.work_orders.length})</h4>
    <div class="tw card" style="margin-bottom:1rem">
      <table>
        <thead><tr><th>Code</th><th>Asset</th><th>Description</th><th>Priority</th><th>Status</th></tr></thead>
        <tbody>
          ${d.work_orders.map(w => `<tr><td><b>${esc(w.code)}</b></td><td>${esc(w.asset_name)}</td><td>${esc(w.description)}</td><td>${esc(w.priority)}</td><td>${chip(w.status)}</td></tr>`).join("")}
        </tbody>
      </table>
    </div>` : "";

  const pTbl = (d.parts && d.parts.length) ? `
    <h4 style="margin:1rem 0 .5rem;color:var(--ink)">Demo Spare Parts (${d.parts.length})</h4>
    <div class="tw card" style="margin-bottom:1rem">
      <table>
        <thead><tr><th>Stock ID</th><th>Part Name</th><th>Stock Qty</th><th>Unit Cost</th></tr></thead>
        <tbody>
          ${d.parts.map(p => `<tr><td><b>${esc(p.stock_id)}</b></td><td>${esc(p.name)}</td><td>${p.qty}</td><td>${rs(p.unit_cost)}</td></tr>`).join("")}
        </tbody>
      </table>
    </div>` : "";

  const eTbl = (d.expenses && d.expenses.length) ? `
    <h4 style="margin:1rem 0 .5rem;color:var(--ink)">Demo Maintenance Expenses (${d.expenses.length})</h4>
    <div class="tw card" style="margin-bottom:1rem">
      <table>
        <thead><tr><th>Ref</th><th>Asset</th><th>Kind</th><th>Amount (KWD)</th></tr></thead>
        <tbody>
          ${d.expenses.map(e => `<tr><td><b>${esc(e.ref || "EXP")}</b></td><td>${esc(e.asset_name)}</td><td>${esc(e.kind)}</td><td>${rs(e.amount)}</td></tr>`).join("")}
        </tbody>
      </table>
    </div>` : "";

  show("Active Demo Dataset Overview", `
    <p class="mu" style="margin-bottom:1rem">The records below carry <code>is_demo = 1</code> in SQLite and are isolated from real company data.</p>
    ${aTbl}
    ${wTbl}
    ${pTbl}
    ${eTbl}
  `);
};

ACT.clearDemo = async () => {
  const st = await api("/admin/demo/status");
  if (!st || st.total === 0) {
    return alert("There is no demo data currently in the database to clear.");
  }

  return new Promise(resolve => {
    const d = document.createElement("dialog");
    d.className = "dlg";
    d.style.maxWidth = "38rem";
    d.innerHTML = `
      <form method="dialog">
        <div style="background:#fde8e8;border:2px solid #e02424;border-radius:1rem;padding:1.25rem;margin-bottom:1.25rem">
          <div style="display:flex;align-items:center;gap:.6rem;color:#9b1c1c;font-weight:700;font-size:1.15rem;margin-bottom:.5rem">
            <span style="font-size:1.5rem">⚠️</span>
            <span>PERMANENT DEMO DATA CLEANUP</span>
          </div>
          <p style="color:#771d1d;font-size:.9rem;line-height:1.45;margin:0 0 .75rem">
            This operation will <b>permanently delete</b> all demo records, simulated Kuwait assets, work orders, demo spare parts, purchases, expenses, and physically delete demo attachments from storage.
          </p>
          <div style="background:#fff;border-radius:.6rem;padding:.75rem;border:1px solid #f8b4b4;font-size:.85rem;color:#1f2937">
            <b style="display:block;margin-bottom:.4rem;color:#111">Records to be permanently removed:</b>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:.35rem">
              <div>• Vehicles & Equipment: <b>${st.counts.assets || 0}</b></div>
              <div>• Complaints: <b>${st.counts.complaints || 0}</b></div>
              <div>• Work Orders: <b>${st.counts.work_orders || 0}</b></div>
              <div>• Spare Parts Catalog: <b>${st.counts.parts || 0}</b></div>
              <div>• Stock Transactions: <b>${st.counts.stock_tx || 0}</b></div>
              <div>• Purchases & Invoices: <b>${st.counts.purchases || 0}</b></div>
              <div>• Maintenance Expenses: <b>${st.counts.expenses || 0}</b></div>
              <div>• Historical Records: <b>${st.counts.historical_records || 0}</b></div>
              <div>• Worksites Transfers: <b>${st.counts.transfers || 0}</b></div>
              <div>• Demo Suppliers: <b>${st.counts.suppliers || 0}</b></div>
              <div>• Files & Attachments: <b>${st.counts.documents || 0}</b></div>
              <div>• Demo Notifications: <b>${st.counts.notifications || 0}</b></div>
            </div>
            <div style="margin-top:.6rem;padding-top:.4rem;border-top:1px dashed #f8b4b4;font-weight:700;color:#9b1c1c;display:flex;justify-content:space-between">
              <span>Total Demo Records:</span>
              <span>${st.total} records</span>
            </div>
          </div>
        </div>

        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:.75rem;padding:.75rem 1rem;font-size:.825rem;color:#166534;margin-bottom:1.25rem">
          🛡️ <b>Safety Guarantee:</b> All real company records, employee accounts, authentic worksites, and non-demo assets are completely protected and will NOT be touched. An automatic SQLite database snapshot backup will be created prior to deletion.
        </div>

        <div style="margin-bottom:1.25rem">
          <label style="display:block;font-size:.85rem;font-weight:600;margin-bottom:.5rem;color:var(--ink)">
            To confirm permanent cleanup, type <span style="color:#e02424;font-family:monospace;font-size:1rem;background:#fee2e2;padding:2px 6px;border-radius:4px">CONFIRM</span> below:
          </label>
          <input type="text" id="demoConfirmInput" placeholder="Type CONFIRM" style="width:100%;text-align:center;font-weight:700;letter-spacing:3px;font-size:1.1rem;padding:.65rem;border:2px solid var(--ln);border-radius:.5rem;text-transform:uppercase" autocomplete="off" required>
        </div>

        <div id="clearProgress" style="display:none;margin-bottom:1rem;text-align:center;color:#b91c1c;font-weight:600">
          ⏳ Executing database cleanup and purging files...
        </div>

        <div style="display:flex;justify-content:flex-end;gap:.75rem">
          <button type="button" class="btn g" data-c>${t("cancel")}</button>
          <button type="submit" id="btnExecClear" class="btn" style="background:#c0392b;color:#fff;border-color:#9b1c1c;font-weight:700">
            🗑️ Confirm & Clear All Demo Data
          </button>
        </div>
      </form>
    `;
    document.body.append(d);
    d.showModal();

    const inp = d.querySelector("#demoConfirmInput");
    const form = d.querySelector("form");
    const btnCancel = d.querySelector("[data-c]");
    const btnExec = d.querySelector("#btnExecClear");
    const progress = d.querySelector("#clearProgress");

    btnCancel.onclick = () => { d.close(); };
    d.onclose = () => { d.remove(); resolve(false); };

    form.onsubmit = async (e) => {
      e.preventDefault();
      if (inp.value.trim().toUpperCase() !== "CONFIRM") {
        alert("Confirmation text does not match. Please type CONFIRM exactly.");
        inp.focus();
        return;
      }
      btnExec.disabled = true;
      btnCancel.disabled = true;
      inp.disabled = true;
      progress.style.display = "block";

      try {
        const res = await post("/admin/demo/clear");
        d.close();
        show("Demo Data Cleared Successfully", `
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:1rem;padding:1.25rem;margin:1rem 0;color:#166534">
            <h4 style="margin:0 0 .5rem;color:#15803d;font-size:1.1rem">✅ Complete Demo Cleanup Finished</h4>
            <p style="margin:0 0 .75rem;font-size:.9rem">${esc(res.message || "All demo data removed successfully.")}</p>
            <ul style="margin:0;padding-left:1.25rem;font-size:.85rem;line-height:1.6">
              <li><b>${res.total_deleted}</b> demo records removed across all database tables.</li>
              <li><b>${res.deleted_files}</b> demo-only physical attachments and uploaded bills purged from disk.</li>
              <li>Part inventory stock balances automatically verified and reconciled.</li>
              <li>Pre-cleanup safety backup created: <code>${esc(res.backup_file || "fleethub-pre-democleanup-*.db")}</code></li>
            </ul>
          </div>
          <p class="mu" style="font-size:.85rem">All genuine company assets, users, worksites, and real records remain 100% intact.</p>
        `);
        go("admin");
        resolve(true);
      } catch (err) {
        progress.style.display = "none";
        btnExec.disabled = false;
        btnCancel.disabled = false;
        inp.disabled = false;
        alert("Cleanup error: " + err.message);
      }
    };
  });
};

// ---------------- APP SHELL & BOOT ----------------
function shell() {
  const userInitials = (ME.name || "U").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const userRoleFormatted = (ME.role || "").replace(/_/g, " ");

  R.innerHTML = `
    <!-- A. DESKTOP HEADER (>= 1024px) -->
    <header class="top desktop-header noprint">
      <div style="display:flex;align-items:center;gap:.65rem">
        <img src="/assets/logo.webp"  alt="National Industries Company" style="height:2.25rem;max-width:5.5rem;object-fit:contain">
        <b class="brand">${t("app_title")}</b>
      </div>
      ${can("asset.view") ? `
        <form id="gs">
          <input id="q" placeholder="${esc(t("global_search"))}" aria-label="Global search">
          <button class="btn">Search</button>
        </form>
      ` : `<span style="flex:1"></span>`}
      <div style="display:flex;align-items:center;gap:.65rem">
        <!-- Multilingual Language Selector (EN, HI, AR only) -->
        <select class="lang-select" id="langSel" aria-label="Language selector">
          <option value="en" ${CUR_LANG === "en" ? "selected" : ""}>🇬🇧 English</option>
          <option value="hi" ${CUR_LANG === "hi" ? "selected" : ""}>🇮🇳 हिन्दी (Hindi)</option>
          <option value="ar" ${CUR_LANG === "ar" ? "selected" : ""}>🇰🇼 العربية (Arabic)</option>
        </select>
        ${can("asset.view") ? `
          <button id="notifBadge" class="badge-bell" data-a="nav" data-id="alerts">🔔 ${t("alerts")}</button>
        ` : ""}
        <span class="m">${esc(ME.name)} · <span class="chip c-verified">${esc(userRoleFormatted)}</span></span>
        <button class="btn g sm" data-a="out">${t("sign_out")}</button>
      </div>
    </header>
    <nav class="nav desktop-nav noprint" id="nav"></nav>

    <!-- B. MOBILE HEADER (< 1024px) -->
    <header class="mobile-header noprint">
      <div class="mobile-header-left">
        <button class="icon-btn" id="btnMobileMenu" data-a="toggleDrawer" aria-label="Open mobile navigation">
          <svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" stroke-linecap="round"/></svg>
        </button>
        <div class="mobile-header-brand" data-a="nav" data-id="dash" style="cursor:pointer">
          <img src="/assets/logo.webp" alt="NIC Kuwait">
          <span>FleetHub</span>
        </div>
      </div>
      <div class="mobile-header-right">
        ${can("asset.view") ? `
          <button class="icon-btn" id="btnMobileSearchToggle" data-a="toggleSearch" aria-label="Search fleet">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35" stroke-linecap="round"/></svg>
          </button>
          <button class="icon-btn" id="btnMobileAlerts" data-a="nav" data-id="alerts" aria-label="Notifications & Alerts">
            <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </button>
        ` : ""}
        <button class="icon-btn" id="btnMobileUser" data-a="toggleDrawer" aria-label="User profile">
          <div style="width:28px;height:28px;border-radius:9999px;background:var(--ink);color:#fff;display:grid;place-items:center;font-size:.75rem;font-weight:700">
            ${userInitials}
          </div>
        </button>
      </div>
    </header>

    <!-- C. SLIDE-DOWN MOBILE SEARCH BAR -->
    <div class="mobile-search-bar noprint" id="mobileSearchBar">
      <form class="mobile-search-form" id="mobileSearchForm">
        <input id="mobileQueryInput" placeholder="${esc(t("quick_search") || "Search fleet, parts, work orders...")}" aria-label="Search">
        <button class="btn sm" type="submit">Search</button>
        <button class="icon-btn" type="button" data-a="toggleSearch" aria-label="Close search">✕</button>
      </form>
    </div>

    <!-- D. MOBILE SLIDE-OUT DRAWER -->
    <div class="mobile-drawer-overlay noprint" id="drawerOverlay">
      <div class="mobile-drawer" id="mobileDrawer">
        <div class="drawer-header">
          <div class="brand" style="font-size:1.15rem">
            <img src="/assets/logo.webp" alt="NIC Kuwait" style="height:2rem;max-width:5rem;object-fit:contain;margin-right:.3rem">
            FleetHub
          </div>
          <button class="icon-btn" data-close-drawer aria-label="Close drawer">✕</button>
        </div>

        <div class="drawer-profile">
          <div class="drawer-avatar">${userInitials}</div>
          <div class="drawer-user-info">
            <div class="drawer-user-name">${esc(ME.name)}</div>
            <div style="display:flex;align-items:center;gap:.35rem;margin-top:.25rem;flex-wrap:wrap">
              <span class="chip c-verified" style="font-size:.6875rem">${esc(userRoleFormatted)}</span>
              <small class="mu">NIC Kuwait</small>
            </div>
          </div>
        </div>

        <div class="drawer-body">
          <div class="drawer-group-title">Fleet & Workshop Operations</div>
          ${can("asset.view") ? `
            <button class="drawer-item" data-a="nav" data-id="dash">
              <span class="drawer-item-icon">📊</span>
              <span>${t("nav_dash")}</span>
            </button>
            <button class="drawer-item" data-a="nav" data-id="assets">
              <span class="drawer-item-icon">🚚</span>
              <span>${t("nav_assets")}</span>
            </button>
          ` : ""}
          ${any("complaint.create", "complaint.review", "asset.view") ? `
            <button class="drawer-item" data-a="nav" data-id="comp">
              <span class="drawer-item-icon">⚠️</span>
              <span>${t("nav_comp")}</span>
            </button>
          ` : ""}
          ${can("wo.view") ? `
            <button class="drawer-item" data-a="nav" data-id="wo">
              <span class="drawer-item-icon">🛠️</span>
              <span>${t("nav_wo")}</span>
            </button>
          ` : ""}

          ${any("inventory.view", "purchase.create", "supplier.view") ? `
            <div class="drawer-group-title" style="margin-top:.75rem">Heavy Store & Inventory</div>
          ` : ""}
          ${can("inventory.view") ? `
            <button class="drawer-item" data-a="nav" data-id="parts">
              <span class="drawer-item-icon">📦</span>
              <span>${t("nav_parts")}</span>
            </button>
          ` : ""}
          ${any("purchase.create", "purchase.approve", "purchase.record") ? `
            <button class="drawer-item" data-a="nav" data-id="pur">
              <span class="drawer-item-icon">🛒</span>
              <span>${t("nav_pur")}</span>
            </button>
          ` : ""}
          ${can("supplier.view") ? `
            <button class="drawer-item" data-a="nav" data-id="sup">
              <span class="drawer-item-icon">🏢</span>
              <span>${t("nav_sup")}</span>
            </button>
          ` : ""}

          ${any("expense.view", "historical.view", "report.view") ? `
            <div class="drawer-group-title" style="margin-top:.75rem">Finance & Compliance</div>
          ` : ""}
          ${can("expense.view") ? `
            <button class="drawer-item" data-a="nav" data-id="exp">
              <span class="drawer-item-icon">💵</span>
              <span>${t("nav_exp")}</span>
            </button>
          ` : ""}
          ${can("historical.view") ? `
            <button class="drawer-item" data-a="nav" data-id="hist">
              <span class="drawer-item-icon">📜</span>
              <span>${t("nav_hist")}</span>
            </button>
          ` : ""}
          ${can("report.view") ? `
            <button class="drawer-item" data-a="nav" data-id="reports">
              <span class="drawer-item-icon">📈</span>
              <span>${t("nav_reports")}</span>
            </button>
          ` : ""}
          ${can("asset.view") ? `
            <button class="drawer-item" data-a="nav" data-id="ws">
              <span class="drawer-item-icon">📍</span>
              <span>${t("nav_ws")}</span>
            </button>
            <button class="drawer-item" data-a="nav" data-id="alerts">
              <span class="drawer-item-icon">🔔</span>
              <span>${t("alerts")}</span>
            </button>
          ` : ""}

          ${can("user.manage") ? `
            <div class="drawer-group-title" style="margin-top:.75rem">Administration</div>
            <button class="drawer-item" data-a="nav" data-id="admin">
              <span class="drawer-item-icon">👥</span>
              <span>${t("nav_admin")}</span>
            </button>
          ` : ""}
        </div>

        <div class="drawer-footer">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:.5rem">
            <span style="font-size:.8rem;font-weight:600;color:var(--mu)">Language:</span>
            <select class="lang-select" id="drawerLangSel" style="flex:1;max-width:11rem">
              <option value="en" ${CUR_LANG === "en" ? "selected" : ""}>🇬🇧 English</option>
              <option value="hi" ${CUR_LANG === "hi" ? "selected" : ""}>🇮🇳 हिन्दी</option>
              <option value="ar" ${CUR_LANG === "ar" ? "selected" : ""}>🇰🇼 العربية</option>
            </select>
          </div>
          <button class="btn g sm btn-install-pwa" data-action="install-pwa" style="width:100%;min-height:44px;display:none;align-items:center;justify-content:center;gap:.4rem">
            📱 Install App
          </button>
          <button class="btn g sm" data-a="out" style="width:100%;min-height:44px">
            ${t("sign_out")}
          </button>
        </div>
      </div>
    </div>

    <!-- E. MAIN APP WRAPPER -->
    <main class="wrap" id="main"></main>

    <!-- F. MOBILE BOTTOM NAVIGATION (< 1024px) -->
    <nav class="mobile-bottom-nav noprint" id="mobileBottomNav">
      <button class="bottom-nav-btn active" data-a="nav" data-id="dash">
        <span class="bottom-nav-icon">📊</span>
        <span class="bottom-nav-label">${t("nav_dash")}</span>
      </button>
      <button class="bottom-nav-btn" data-a="nav" data-id="assets">
        <span class="bottom-nav-icon">🚚</span>
        <span class="bottom-nav-label">${t("nav_assets")}</span>
      </button>
      <button class="bottom-nav-btn" data-a="nav" data-id="comp">
        <span class="bottom-nav-icon">⚠️</span>
        <span class="bottom-nav-label">${t("nav_comp")}</span>
      </button>
      <button class="bottom-nav-btn" data-a="nav" data-id="wo">
        <span class="bottom-nav-icon">🛠️</span>
        <span class="bottom-nav-label">Workshop</span>
      </button>
      <button class="bottom-nav-btn" data-a="toggleDrawer" data-id="menu-drawer">
        <span class="bottom-nav-icon">☰</span>
        <span class="bottom-nav-label">${t("menu") || "Menu"}</span>
      </button>
    </nav>
  `;

  // Desktop search form submission
  const g = $("#gs");
  if (g) g.onsubmit = e => {
    e.preventDefault();
    go("search", $("#q").value);
  };

  // Mobile search form submission
  const mg = $("#mobileSearchForm");
  if (mg) mg.onsubmit = e => {
    e.preventDefault();
    const val = $("#mobileQueryInput")?.value || "";
    toggleMobileSearch(false);
    go("search", val);
  };

  // Language selectors
  const handleLang = async lang => {
    CUR_LANG = lang;
    localStorage.setItem("fleethub_lang", CUR_LANG);
    applyLanguageLayout();
    await post("/user/lang", { lang: CUR_LANG }).catch(() => {});
    shell();
    refresh();
  };

  const ls = $("#langSel");
  if (ls) ls.onchange = () => handleLang(ls.value);

  const dls = $("#drawerLangSel");
  if (dls) dls.onchange = () => handleLang(dls.value);

  // Close drawer when clicking backdrop
  const overlay = $("#drawerOverlay");
  if (overlay) {
    overlay.onclick = e => {
      if (e.target === overlay || e.target.closest("[data-close-drawer]")) {
        toggleMobileDrawer(false);
      }
    };
  }
}

R.onclick = e => {
  // Check viewmode switcher (Cards vs Table)
  const vm = e.target.closest("[data-viewmode]");
  if (vm) {
    const mode = vm.dataset.viewmode;
    CURRENT_TABLE_VIEW_MODE = mode;
    localStorage.setItem("fleethub_table_view_mode", mode);
    const container = $(`#${vm.dataset.target}`);
    if (container) {
      container.querySelectorAll(".view-toggle-btn").forEach(b => b.classList.toggle("active", b.dataset.viewmode === mode));
      const wrapper = container.querySelector(".responsive-view-wrapper");
      if (wrapper) wrapper.className = `responsive-view-wrapper ${mode}`;
    }
    return;
  }

  // Check card details expand toggle
  const tog = e.target.closest("[data-toggle]");
  if (tog) {
    const targetId = tog.dataset.toggle;
    const drawer = $(`#${targetId}`);
    if (drawer) {
      const isHidden = drawer.classList.toggle("hidden");
      const span = tog.querySelector("span");
      if (span) {
        span.textContent = isHidden ? (t("more_details") || "More Details ▾") : (t("hide_details") || "Hide Details ▴");
      }
    }
    return;
  }

  // Check drawer close
  if (e.target.closest("[data-close-drawer]")) {
    toggleMobileDrawer(false);
    return;
  }

  // Standard data-a actions
  const b = e.target.closest("[data-a]");
  if (b && ACT[b.dataset.a]) run(() => ACT[b.dataset.a](b.dataset));
};

function loginView() {
  R.innerHTML = `
    <div class="login-wrap">
      <form class="login card" id="lf">
        <div style="display:flex;flex-direction:column;align-items:center;gap:.6rem;margin-bottom:1.5rem;text-align:center">
          <img src="/assets/logo.webp"  alt="National Industries Company" style="height:4.5rem;max-width:12rem;object-fit:contain;margin:0 auto .25rem;display:block">
          <div style="display:flex;justify-content:center;align-items:center;gap:.75rem;flex-wrap:wrap">
            <h2 class="d" style="margin:0;text-align:center;white-space:nowrap">${t("app_title")}</h2>
            <select class="lang-select" id="loginLangSel">
              <option value="en" ${CUR_LANG === "en" ? "selected" : ""}>English</option>
              <option value="hi" ${CUR_LANG === "hi" ? "selected" : ""}>हिन्दी</option>
              <option value="ar" ${CUR_LANG === "ar" ? "selected" : ""}>العربية</option>
            </select>
          </div>
          <p class="mu" style="margin:0;text-align:center">${t("app_subtitle")}</p>
        </div>
        <label>${t("username")}<input name="username" autocomplete="username" required></label>
        <label>${t("password")}<input name="password" type="password" autocomplete="current-password" required></label>
        <p class="err" id="le" style="text-align:center"></p>
        <div class="login-btns">
          <button class="btn">${t("sign_in")}</button>
          <a class="btn g" href="/" style="display:inline-block">${t("back_to_site")}</a>
        </div>
      </form>
    </div>
  `;

  const lls = $("#loginLangSel");
  if (lls) {
    lls.onchange = () => {
      CUR_LANG = lls.value;
      localStorage.setItem("fleethub_lang", CUR_LANG);
      applyLanguageLayout();
      loginView();
    };
  }

  $("#lf").onsubmit = async e => {
    e.preventDefault();
    try {
      ME = await post("/login", fj(new FormData(e.target)));
      if (ME.token) {
        localStorage.setItem("fleethub_token", ME.token);
      }
      if (ME.lang) {
        CUR_LANG = ME.lang;
        localStorage.setItem("fleethub_lang", CUR_LANG);
        applyLanguageLayout();
      }
      shell();
      HIST = [];
      go(can("asset.view") ? "dash" : "comp");
    } catch (x) {
      $("#le").textContent = x.message;
    }
  };
}

async function boot() {
  try {
    ME = await api("/me");
    if (ME && ME.lang) {
      CUR_LANG = ME.lang;
      localStorage.setItem("fleethub_lang", CUR_LANG);
      applyLanguageLayout();
    }
  } catch (e) {
    ME = null;
  }
  if (ME) {
    window.ME = ME;
    shell();
    HIST = [];
    go(can("asset.view") ? "dash" : "comp");
  } else {
    window.ME = null;
    loginView();
  }
}

// Expose core navigation on window for seamless testability and console access
window.go = go;
window.shell = shell;
window.ACT = ACT;
window.boot = boot;
window.getME = () => ME;

boot();

// Cross-tab and cross-browser live synchronization
if (SYNC_BUS) {
  SYNC_BUS.onmessage = () => {
    if (ME) refresh();
  };
}

let lastConsoleSyncVersion = null;
async function pollSyncVersion() {
  if (!ME || document.visibilityState === "hidden") return;
  try {
    const res = await api("/sync/version");
    if (lastConsoleSyncVersion !== null && res.version !== lastConsoleSyncVersion) {
      lastConsoleSyncVersion = res.version;
      refresh();
    } else {
      lastConsoleSyncVersion = res.version;
    }
  } catch (_) {}
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") pollSyncVersion();
});

setInterval(pollSyncVersion, 8000);
})();
