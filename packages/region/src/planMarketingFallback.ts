import type { MarketingFeatureRow } from "./planMarketingTypes"

export const PLAN_MARKETING_FALLBACK: Record<string, MarketingFeatureRow[]> = {
  "personal": [
    {
      "key": "monthly_points",
      "label_zh": "每月算力点",
      "label_en": "Monthly compute points",
      "state": "included",
      "value_zh": "{points}",
      "value_en": "{points}"
    },
    {
      "key": "monthly_traffic",
      "label_zh": "每月公网流量",
      "label_en": "Monthly public traffic",
      "state": "included",
      "value_zh": "{traffic} GB",
      "value_en": "{traffic} GB"
    },
    {
      "key": "workspace_storage",
      "label_zh": "用户可用存储空间",
      "label_en": "User storage space",
      "state": "included",
      "value_zh": "{storage_gb} GB",
      "value_en": "{storage_gb} GB"
    },
    {
      "key": "hermes_server",
      "label_zh": "Hermes 服务器",
      "label_en": "Hermes server",
      "state": "included",
      "value_zh": "一台 2 核 4G（标准版）",
      "value_en": "One 2c4g (Standard)"
    },
    {
      "key": "kefu",
      "label_zh": "客服系统",
      "label_en": "Customer support",
      "state": "locked"
    },
    {
      "key": "stores_max",
      "label_zh": "店铺数量",
      "label_en": "Stores",
      "state": "included",
      "value_zh": "1 个",
      "value_en": "1 store"
    },
    {
      "key": "team_seats_max",
      "label_zh": "团队成员",
      "label_en": "Team members",
      "state": "locked"
    },
    {
      "key": "settlement",
      "label_zh": "对账与税务流程咨询",
      "label_en": "Reconciliation and tax process consultation",
      "state": "locked",
      "region_restricted": true,
      "agreement_hint": true
    },
    {
      "key": "data_reports",
      "label_zh": "数据报表分析",
      "label_en": "Data reports & analytics",
      "state": "included"
    },
    {
      "key": "listing_wechat_mini",
      "label_zh": "小程序上架顾问",
      "label_en": "Mini program listing advisor",
      "state": "locked"
    },
    {
      "key": "listing_domestic_app",
      "label_zh": "国内 APP 上架顾问",
      "label_en": "Domestic app listing advisor",
      "state": "locked"
    },
    {
      "key": "listing_apple",
      "label_zh": "苹果商店上架顾问",
      "label_en": "Apple App Store listing advisor",
      "state": "locked"
    },
    {
      "key": "listing_google",
      "label_zh": "谷歌商店上架顾问",
      "label_en": "Google Play listing advisor",
      "state": "locked"
    },
    {
      "key": "us_native_ip",
      "label_zh": "专属业务节点配置",
      "label_en": "Dedicated business node configuration",
      "state": "locked",
      "region_restricted": true,
      "agreement_hint": true
    },
    {
      "key": "network_acceleration",
      "label_zh": "业务访问与协作支持",
      "label_en": "Business access and collaboration support",
      "state": "included",
      "value_zh": "共享节点配置 2 个",
      "value_en": "2 shared node configs",
      "region_restricted": true,
      "agreement_hint": true,
      "requires_real_name": true
    },
    {
      "key": "social_posting",
      "label_zh": "自动化发帖",
      "label_en": "Automated posting",
      "state": "included",
      "value_zh": "3 个平台",
      "value_en": "3 platforms"
    },
    {
      "key": "sms_registration",
      "label_zh": "渠道资源咨询",
      "label_en": "Channel resource consultation",
      "state": "included",
      "value_zh": "可开通",
      "value_en": "Available",
      "region_restricted": true,
      "agreement_hint": true,
      "requires_real_name": true
    },
    {
      "key": "payment_card",
      "label_zh": "营销资源流程咨询",
      "label_en": "Marketing resource process consultation",
      "state": "included",
      "value_zh": "可开通",
      "value_en": "Available",
      "region_restricted": true,
      "agreement_hint": true,
      "requires_real_name": true
    }
  ],
  "startup": [
    {
      "key": "monthly_points",
      "label_zh": "每月算力点",
      "label_en": "Monthly compute points",
      "state": "included",
      "value_zh": "{points}",
      "value_en": "{points}"
    },
    {
      "key": "monthly_traffic",
      "label_zh": "每月公网流量",
      "label_en": "Monthly public traffic",
      "state": "included",
      "value_zh": "{traffic} GB",
      "value_en": "{traffic} GB"
    },
    {
      "key": "workspace_storage",
      "label_zh": "用户可用存储空间",
      "label_en": "User storage space",
      "state": "included",
      "value_zh": "{storage_gb} GB",
      "value_en": "{storage_gb} GB"
    },
    {
      "key": "hermes_server",
      "label_zh": "Hermes 服务器",
      "label_en": "Hermes server",
      "state": "included",
      "value_zh": "一台 2 核 4G（高性能版）",
      "value_en": "One 2c4g (High performance)"
    },
    {
      "key": "kefu",
      "label_zh": "客服系统",
      "label_en": "Customer support",
      "state": "included"
    },
    {
      "key": "stores_max",
      "label_zh": "店铺数量",
      "label_en": "Stores",
      "state": "included",
      "value_zh": "2 个",
      "value_en": "2 stores"
    },
    {
      "key": "team_seats_max",
      "label_zh": "团队成员",
      "label_en": "Team members",
      "state": "included",
      "value_zh": "共 2 名",
      "value_en": "2 seats"
    },
    {
      "key": "settlement",
      "label_zh": "对账与税务流程咨询",
      "label_en": "Reconciliation and tax process consultation",
      "state": "locked",
      "region_restricted": true,
      "agreement_hint": true
    },
    {
      "key": "data_reports",
      "label_zh": "数据报表分析",
      "label_en": "Data reports & analytics",
      "state": "included"
    },
    {
      "key": "listing_wechat_mini",
      "label_zh": "小程序上架顾问",
      "label_en": "Mini program listing advisor",
      "state": "included"
    },
    {
      "key": "listing_domestic_app",
      "label_zh": "国内 APP 上架顾问",
      "label_en": "Domestic app listing advisor",
      "state": "included"
    },
    {
      "key": "listing_apple",
      "label_zh": "苹果商店上架顾问",
      "label_en": "Apple App Store listing advisor",
      "state": "included"
    },
    {
      "key": "listing_google",
      "label_zh": "谷歌商店上架顾问",
      "label_en": "Google Play listing advisor",
      "state": "included"
    },
    {
      "key": "us_native_ip",
      "label_zh": "专属业务节点配置",
      "label_en": "Dedicated business node configuration",
      "state": "locked",
      "region_restricted": true,
      "agreement_hint": true
    },
    {
      "key": "network_acceleration",
      "label_zh": "业务访问与协作支持",
      "label_en": "Business access and collaboration support",
      "state": "included",
      "value_zh": "共享节点配置 2 个",
      "value_en": "2 shared node configs",
      "region_restricted": true,
      "agreement_hint": true,
      "requires_real_name": true
    },
    {
      "key": "social_posting",
      "label_zh": "自动化发帖",
      "label_en": "Automated posting",
      "state": "included",
      "value_zh": "9 个平台",
      "value_en": "9 platforms"
    },
    {
      "key": "sms_registration",
      "label_zh": "渠道资源咨询",
      "label_en": "Channel resource consultation",
      "state": "included",
      "value_zh": "赠送 1 个",
      "value_en": "1 included",
      "region_restricted": true,
      "agreement_hint": true,
      "requires_real_name": true
    },
    {
      "key": "payment_card",
      "label_zh": "营销资源流程咨询",
      "label_en": "Marketing resource process consultation",
      "state": "included",
      "value_zh": "可开通",
      "value_en": "Available",
      "region_restricted": true,
      "agreement_hint": true,
      "requires_real_name": true
    }
  ],
  "business": [
    {
      "key": "monthly_points",
      "label_zh": "每月算力点",
      "label_en": "Monthly compute points",
      "state": "included",
      "value_zh": "{points}",
      "value_en": "{points}"
    },
    {
      "key": "monthly_traffic",
      "label_zh": "每月公网流量",
      "label_en": "Monthly public traffic",
      "state": "included",
      "value_zh": "{traffic} GB",
      "value_en": "{traffic} GB"
    },
    {
      "key": "workspace_storage",
      "label_zh": "用户可用存储空间",
      "label_en": "User storage space",
      "state": "included",
      "value_zh": "{storage_gb} GB",
      "value_en": "{storage_gb} GB"
    },
    {
      "key": "hermes_server",
      "label_zh": "Hermes 服务器",
      "label_en": "Hermes server",
      "state": "included",
      "value_zh": "一台 4 核 8G（高性能版）",
      "value_en": "One 4c8g (High performance)"
    },
    {
      "key": "kefu",
      "label_zh": "客服系统",
      "label_en": "Customer support",
      "state": "included"
    },
    {
      "key": "stores_max",
      "label_zh": "店铺数量",
      "label_en": "Stores",
      "state": "included",
      "value_zh": "5 个",
      "value_en": "5"
    },
    {
      "key": "team_seats_max",
      "label_zh": "团队成员",
      "label_en": "Team members",
      "state": "included",
      "value_zh": "共 10 名",
      "value_en": "10 seats"
    },
    {
      "key": "settlement",
      "label_zh": "对账与税务流程咨询",
      "label_en": "Reconciliation and tax process consultation",
      "state": "included",
      "region_restricted": true,
      "agreement_hint": true
    },
    {
      "key": "data_reports",
      "label_zh": "数据报表分析",
      "label_en": "Data reports & analytics",
      "state": "included"
    },
    {
      "key": "listing_wechat_mini",
      "label_zh": "小程序上架顾问",
      "label_en": "Mini program listing advisor",
      "state": "included"
    },
    {
      "key": "listing_domestic_app",
      "label_zh": "国内 APP 上架顾问",
      "label_en": "Domestic app listing advisor",
      "state": "included"
    },
    {
      "key": "listing_apple",
      "label_zh": "苹果商店上架顾问",
      "label_en": "Apple App Store listing advisor",
      "state": "included"
    },
    {
      "key": "listing_google",
      "label_zh": "谷歌商店上架顾问",
      "label_en": "Google Play listing advisor",
      "state": "included"
    },
    {
      "key": "us_native_ip",
      "label_zh": "专属业务节点配置",
      "label_en": "Dedicated business node configuration",
      "state": "included",
      "value_zh": "独享节点配置 10 个",
      "value_en": "10 dedicated node configs",
      "region_restricted": true,
      "agreement_hint": true
    },
    {
      "key": "network_acceleration",
      "label_zh": "业务访问与协作支持",
      "label_en": "Business access and collaboration support",
      "state": "included",
      "value_zh": "共享节点配置 2 个",
      "value_en": "2 shared node configs",
      "region_restricted": true,
      "agreement_hint": true,
      "requires_real_name": true
    },
    {
      "key": "social_posting",
      "label_zh": "自动化发帖",
      "label_en": "Automated posting",
      "state": "included",
      "value_zh": "13 个平台",
      "value_en": "13 platforms"
    },
    {
      "key": "sms_registration",
      "label_zh": "渠道资源咨询",
      "label_en": "Channel resource consultation",
      "state": "included",
      "value_zh": "赠送 1 个",
      "value_en": "1 included",
      "region_restricted": true,
      "agreement_hint": true,
      "requires_real_name": true
    },
    {
      "key": "payment_card",
      "label_zh": "营销资源流程咨询",
      "label_en": "Marketing resource process consultation",
      "state": "included",
      "value_zh": "可开通",
      "value_en": "Available",
      "region_restricted": true,
      "agreement_hint": true,
      "requires_real_name": true
    }
  ]
}
