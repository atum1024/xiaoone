export const SERVICE_USAGE_AGREEMENT = {
  title: {
    zh: '第三方服务和合规使用',
    en: 'Third-party services and compliant use',
  },
  summary: {
    zh: '官网可能展示或接入第三方云服务、支付、短信、邮件、客服、统计分析、地图、企业服务咨询、资质材料协助等能力；具体范围以订单、合同、平台页面或第三方规则为准。',
    en: 'The website may display or integrate third-party cloud, payment, SMS, email, support, analytics, map, enterprise consultation, and qualification material assistance services. Scope is subject to orders, contracts, platform pages, or third-party rules.',
  },
  items: [
    {
      zh: '第三方服务由相应服务方独立提供、运营或确认，xiaoone 仅在官网或产品中展示入口、流程说明或材料提交能力。',
      en: 'Third-party services are independently provided, operated, or confirmed by their service providers. xiaoone only displays entry points, process descriptions, or material submission features.',
    },
    {
      zh: '第三方服务的质量、稳定性、费用、交付、资质、数据处理和法律后果以第三方规则、订单或合同为准。',
      en: 'Third-party service quality, stability, fees, delivery, qualifications, data processing, and legal consequences are governed by third-party rules, orders, or contracts.',
    },
    {
      zh: '用户应在法律法规允许的地区、行业和业务范围内使用平台能力，并自行确认经营资质、授权文件和数据合规要求。',
      en: 'Users must use platform capabilities only within legally permitted regions, industries, and business scopes, and verify operating qualifications, authorization documents, and data compliance requirements.',
    },
    {
      zh: '如相关能力需要实名、资质审核、人工确认或第三方审批，未完成前不得将该能力理解为已开通、可用或承诺交付。',
      en: 'If a capability requires real-name verification, qualification review, human confirmation, or third-party approval, it must not be treated as activated, available, or committed before completion.',
    },
  ],
  termsAnchor: 'service-usage',
  termsPath: '/terms#service-usage',
} as const

export type ServiceUsageLocale = 'zh' | 'en'

export function serviceUsageAgreementText(locale: ServiceUsageLocale) {
  return {
    title: SERVICE_USAGE_AGREEMENT.title[locale],
    summary: SERVICE_USAGE_AGREEMENT.summary[locale],
    items: SERVICE_USAGE_AGREEMENT.items.map(item => item[locale]),
  }
}
