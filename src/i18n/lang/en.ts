import type { UIStrings } from "../types";

export default {
  nav: {
    home: "الرئيسية",
    posts: "الأخبار",
    tags: "التصنيفات",
    about: "من نحن",
    archives: "الأرشيف",
    search: "بحث",
  },
  post: {
    publishedAt: "تاريخ النشر",
    updatedAt: "آخر تحديث",
    sharePostIntro: "مشاركة الخبر:",
    sharePostOn: "مشاركة الخبر عبر {{platform}}",
    sharePostViaEmail: "مشاركة الخبر عبر البريد الإلكتروني",
    tagLabel: "التصنيفات",
    backToTop: "إلى الأعلى",
    goBack: "رجوع",
    editPage: "تعديل الصفحة",
    previousPost: "الخبر السابق",
    nextPost: "الخبر التالي",
  },
  pagination: {
    prev: "السابق",
    next: "التالي",
    page: "صفحة",
  },
  home: {
    socialLinks: "روابط التواصل الاجتماعي",
    featured: "أخبار مميزة",
    recentPosts: "أحدث الأخبار",
    allPosts: "جميع الأخبار",
  },
  footer: {
    copyright: "حقوق النشر",
    allRightsReserved: "جميع الحقوق محفوظة.",
  },
  pages: {
    tagTitle: "تصنيف",
    tagDesc: "جميع الأخبار المرتبطة بالتصنيف",

    tagsTitle: "التصنيفات",
    tagsDesc: "جميع التصنيفات المستخدمة في الأخبار.",

    postsTitle: "الأخبار",
    postsDesc: "جميع الأخبار والمقالات المنشورة.",

    archivesTitle: "الأرشيف",
    archivesDesc: "جميع الأخبار المؤرشفة.",

    searchTitle: "بحث",
    searchDesc: "ابحث في جميع الأخبار...",
  },
  a11y: {
    skipToContent: "الانتقال إلى المحتوى",
    openMenu: "فتح القائمة",
    closeMenu: "إغلاق القائمة",
    toggleTheme: "تبديل المظهر",
    searchPlaceholder: "ابحث في الأخبار...",
    noResults: "لم يتم العثور على نتائج",
    goToPreviousPage: "الانتقال إلى الصفحة السابقة",
    goToNextPage: "الانتقال إلى الصفحة التالية",
  },
  notFound: {
    title: "404 غير موجود",
    message: "الصفحة غير موجودة",
    goHome: "العودة إلى الصفحة الرئيسية",
  },
} satisfies UIStrings;
