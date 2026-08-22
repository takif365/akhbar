import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://akhbar3.com",
    title: "أخبار 3",
    description: "متابعة مستمرة لأبرز الأخبار العربية والعالمية. نقدم لك تغطية شاملة للأحداث على مدار الساعة بموضوعية وحيادية.",
    author: "فريق التحرير",
    profile: "https://akhbar3.com",
    ogImage: "default-og.jpg",
    lang: "ar",
    timezone: "UTC",
    dir: "rtl",
  }, 
  posts: {
    perPage: 6,
    perIndex: 6,
    scheduledPostMargin: 15 * 60 * 1000,
  },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: true,
    showArchives: true,
    showBackButton: true,
    editPost: {
      enabled: false,
    },
    search: "pagefind",
  },
  socials: [
    { name: "x",        url: "https://x.com/" },
    { name: "mail",     url: "mailto:info@akhbar3.com" },
  ],
  shareLinks: [
    { name: "whatsapp", url: "https://wa.me/?text=" },
    { name: "facebook", url: "https://www.facebook.com/sharer.php?u=" },
    { name: "x",        url: "https://x.com/intent/post?url=" },
    { name: "telegram", url: "https://t.me/share/url?url=" },
    { name: "mail",     url: "mailto:?subject=See%20this%20post&body=" },
  ],
});
