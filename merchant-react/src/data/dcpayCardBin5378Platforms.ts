export const DCPAY_CARD_BIN_5378 = "5378"

export interface DcpaySupportedPlatform {
  id: string
  name: string
  website: string
  logoUrl: string
  color: string
}

export interface DcpayPlatformCategory {
  id: string
  title: string
  titleEn: string
  platforms: DcpaySupportedPlatform[]
}

const logo = (id: string) => `/dcpay-platform-logos/${id}.svg`

export const DCPAY_BIN_5378_PLATFORM_CATEGORIES: DcpayPlatformCategory[] = [
  {
    id: "ai-cloud",
    title: "AI 与云服务运营",
    titleEn: "AI & cloud services",
    platforms: [
      { id: "chatgpt", name: "ChatGPT", website: "https://chatgpt.com/", logoUrl: logo("chatgpt"), color: "#10A37F" },
      { id: "openai-api", name: "OpenAI API", website: "https://platform.openai.com/", logoUrl: logo("openai-api"), color: "#10A37F" },
      { id: "claude", name: "Claude", website: "https://claude.ai/", logoUrl: logo("claude"), color: "#D97757" },
      { id: "midjourney", name: "Midjourney", website: "https://www.midjourney.com/", logoUrl: logo("midjourney"), color: "#5865F2" },
      { id: "github-copilot", name: "GitHub Copilot", website: "https://github.com/features/copilot", logoUrl: logo("github-copilot"), color: "#24292F" },
      { id: "aws", name: "AWS", website: "https://aws.amazon.com/", logoUrl: logo("aws"), color: "#FF9900" },
      { id: "google-cloud", name: "Google Cloud", website: "https://cloud.google.com/", logoUrl: logo("google-cloud"), color: "#4285F4" },
      { id: "tencent-cloud", name: "腾讯云", website: "https://cloud.tencent.com/", logoUrl: logo("tencent-cloud"), color: "#006EFF" },
      { id: "aliyun", name: "阿里云", website: "https://www.aliyun.com/", logoUrl: logo("aliyun"), color: "#FF6A00" },
      { id: "cloudflare", name: "Cloudflare", website: "https://www.cloudflare.com/", logoUrl: logo("cloudflare"), color: "#F38020" },
      { id: "godaddy", name: "GoDaddy", website: "https://www.godaddy.com/", logoUrl: logo("godaddy"), color: "#1BDBDB" },
    ],
  },
  {
    id: "cross-border",
    title: "跨境电商与外贸获客",
    titleEn: "Cross-border commerce & acquisition",
    platforms: [
      { id: "google-ads", name: "Google Ads", website: "https://ads.google.com/", logoUrl: logo("google-ads"), color: "#4285F4" },
      { id: "facebook", name: "Facebook", website: "https://www.facebook.com/", logoUrl: logo("facebook"), color: "#1877F2" },
      { id: "tiktok", name: "TikTok", website: "https://www.tiktok.com/", logoUrl: logo("tiktok"), color: "#FE2C55" },
      { id: "twitter", name: "Twitter / X", website: "https://x.com/", logoUrl: logo("twitter"), color: "#14171A" },
      { id: "shopify", name: "Shopify", website: "https://www.shopify.com/", logoUrl: logo("shopify"), color: "#96BF48" },
      { id: "shoplazza", name: "Shoplazza", website: "https://www.shoplazza.com/", logoUrl: logo("shoplazza"), color: "#0066FF" },
      { id: "alibaba", name: "Alibaba", website: "https://www.alibaba.com/", logoUrl: logo("alibaba"), color: "#FF6600" },
      { id: "aliexpress", name: "AliExpress", website: "https://www.aliexpress.com/", logoUrl: logo("aliexpress"), color: "#E62E04" },
      { id: "temu", name: "Temu", website: "https://www.temu.com/", logoUrl: logo("temu"), color: "#FB7701" },
      { id: "shein", name: "Shein", website: "https://www.shein.com/", logoUrl: logo("shein"), color: "#222222" },
      { id: "amazon", name: "Amazon", website: "https://www.amazon.com/", logoUrl: logo("amazon"), color: "#FF9900" },
      { id: "ebay", name: "eBay", website: "https://www.ebay.com/", logoUrl: logo("ebay"), color: "#E53238" },
      { id: "walmart", name: "Walmart", website: "https://www.walmart.com/", logoUrl: logo("walmart"), color: "#0071CE" },
      { id: "etsy", name: "Etsy", website: "https://www.etsy.com/", logoUrl: logo("etsy"), color: "#F45800" },
      { id: "depop", name: "Depop", website: "https://www.depop.com/", logoUrl: logo("depop"), color: "#FF2300" },
    ],
  },
  {
    id: "travel-work",
    title: "海外商旅、办公与娱乐",
    titleEn: "Travel, work & entertainment",
    platforms: [
      { id: "airbnb", name: "Airbnb", website: "https://www.airbnb.com/", logoUrl: logo("airbnb"), color: "#FF5A5F" },
      { id: "booking", name: "Booking", website: "https://www.booking.com/", logoUrl: logo("booking"), color: "#003580" },
      { id: "agoda", name: "Agoda", website: "https://www.agoda.com/", logoUrl: logo("agoda"), color: "#5542F6" },
      { id: "figma", name: "Figma", website: "https://www.figma.com/", logoUrl: logo("figma"), color: "#F24E1E" },
      { id: "adobe", name: "Adobe", website: "https://www.adobe.com/", logoUrl: logo("adobe"), color: "#FF0000" },
      { id: "zoom", name: "Zoom", website: "https://zoom.us/", logoUrl: logo("zoom"), color: "#2D8CFF" },
      { id: "twilio", name: "Twilio", website: "https://www.twilio.com/", logoUrl: logo("twilio"), color: "#F22F46" },
      { id: "linkedin", name: "LinkedIn", website: "https://www.linkedin.com/", logoUrl: logo("linkedin"), color: "#0A66C2" },
      { id: "blizzard", name: "Blizzard", website: "https://www.blizzard.com/", logoUrl: logo("blizzard"), color: "#00AEFF" },
      { id: "venmo", name: "Venmo", website: "https://venmo.com/", logoUrl: logo("venmo"), color: "#008CFF" },
      { id: "livechat", name: "LiveChat", website: "https://www.livechat.com/", logoUrl: logo("livechat"), color: "#FFB524" },
      { id: "telegram", name: "Telegram", website: "https://telegram.org/", logoUrl: logo("telegram"), color: "#26A5E4" },
    ],
  },
  {
    id: "wallet-pay",
    title: "钱包与主流支付工具",
    titleEn: "Wallets & payment tools",
    platforms: [
      { id: "paypal", name: "PayPal", website: "https://www.paypal.com/", logoUrl: logo("paypal"), color: "#003087" },
      { id: "app-store", name: "App Store", website: "https://www.apple.com/app-store/", logoUrl: logo("app-store"), color: "#147EFB" },
      { id: "alipay-hk", name: "Alipay HK", website: "https://www.alipayhk.com/", logoUrl: logo("alipay-hk"), color: "#1677FF" },
    ],
  },
]

export const DCPAY_BIN_5378_PLATFORM_COUNT = DCPAY_BIN_5378_PLATFORM_CATEGORIES.reduce(
  (sum, category) => sum + category.platforms.length,
  0,
)

export function isDcpayCardBin5378(cardBin?: string | null): boolean {
  const digits = String(cardBin || "").replace(/\\D/g, "")
  return digits.startsWith(DCPAY_CARD_BIN_5378)
}

export function dcpayCardBin5378Platforms(cardBin?: string | null): DcpayPlatformCategory[] | null {
  return isDcpayCardBin5378(cardBin) ? DCPAY_BIN_5378_PLATFORM_CATEGORIES : null
}
