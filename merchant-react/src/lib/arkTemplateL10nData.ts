type ArkImageTemplateL10nFields = {
  label: { zh: string; en: string }
  hint?: { zh: string; en: string }
  tag?: { zh: string; en: string }
  prompt: { zh: string; en: string }
}

type ArkVideoTemplateL10nFields = {
  label: { zh: string; en: string }
  hint?: { zh: string; en: string }
  prompt: { zh: string; en: string }
}

/** Locale strings for Ark image/video templates. Chinese defaults also live on template records. */
export const ARK_IMAGE_TEMPLATE_L10N: Record<string, ArkImageTemplateL10nFields> = {
  'clean-image-template': {
    label: { zh: '纯净模板', en: 'Clean template' },
    tag: { zh: '纯净', en: 'Clean' },
    hint: { zh: '不写提示词，只使用你的输入和可见参数', en: 'No prompt text — only your input and visible parameters' },
    prompt: { zh: '', en: '' },
  },
  'product-main-image': {
    label: { zh: '商品主图', en: 'Product hero image' },
    tag: { zh: '电商', en: 'E-commerce' },
    hint: { zh: '白底或纯色背景，突出商品主体', en: 'White or solid background with the product as the focal point' },
    prompt: {
      zh: '生成一张电商商品主图。请以用户描述或上传参考图中的商品为唯一主体，居中完整展示，白底或浅色纯色背景，自然柔和光线，材质和边缘清晰，画面干净可信，不添加无关道具、虚假 Logo、价格或夸张促销文字。',
      en: 'Generate an e-commerce product hero image. Use only the product from the user description or uploaded reference as the sole subject, centered and fully visible on a white or light solid background with soft natural lighting, clear materials and edges, and a clean, trustworthy look. Do not add unrelated props, fake logos, prices, or exaggerated promotional text.',
    },
  },
  'product-photo-set': {
    label: { zh: '商品套图', en: 'Product image set' },
    tag: { zh: '套图', en: 'Set' },
    hint: { zh: '主图、副图、尺寸、卖点、展示图', en: 'Hero, detail, size, selling points, and lifestyle shots' },
    prompt: {
      zh: '为同一件商品生成一组电商素材：1 张主图、1 张细节副图、1 张尺寸/规格说明图、1 张卖点介绍图、1 张真实使用展示图。保持商品外观、材质、颜色和品牌调性一致，版式克制，文字少而清晰，不编造认证、奖项或价格。',
      en: 'Generate a set of e-commerce assets for one product: 1 hero image, 1 detail shot, 1 size/spec sheet, 1 selling-points graphic, and 1 real-use lifestyle shot. Keep product appearance, materials, color, and brand tone consistent with restrained layout and minimal clear text. Do not invent certifications, awards, or prices.',
    },
  },
  'marketplace-compliant-main-image': {
    label: { zh: '商品主图合规版', en: 'Marketplace-compliant hero' },
    tag: { zh: '合规', en: 'Compliant' },
    hint: { zh: '白底、主体完整、适合平台首图', en: 'White background, full product, platform-ready hero' },
    prompt: {
      zh: '生成一张电商平台合规商品主图。以用户描述或上传参考图中的商品为唯一主体，纯白背景 RGB(255,255,255)，商品居中完整展示并占画面约 85%，边缘清晰，光线均匀，保留真实颜色、材质、比例、包装和 Logo。不要添加文字、价格、促销角标、道具、水印、额外 Logo 或虚构配件。',
      en: 'Generate a marketplace-compliant product hero image. Use only the product from the user description or uploaded reference on pure white background RGB(255,255,255), centered and fully visible occupying about 85% of the frame with sharp edges and even lighting. Preserve true color, materials, proportions, packaging, and logos. Do not add text, prices, promo badges, props, watermarks, extra logos, or fictional accessories.',
    },
  },
  'product-feature-bento-infographic': {
    label: { zh: '卖点 Bento 信息图', en: 'Selling-point Bento infographic' },
    tag: { zh: 'Bento', en: 'Bento' },
    hint: { zh: '主商品图 + 4-6 个卖点模块', en: 'Hero product shot plus 4–6 selling-point modules' },
    prompt: {
      zh: '生成一张电商卖点 Bento 信息图。画面以同一商品主视觉为核心，周围使用 4 到 6 个模块化卡片展示用户提供的核心卖点、使用价值、材质或细节。版式干净，细线图标、箭头标注和局部特写统一，文字短而可读；只使用用户提供或可从商品图明确看出的信息，不编造认证、功效、参数、销量或价格。',
      en: 'Generate an e-commerce selling-point Bento infographic. Center the same product hero visual with 4 to 6 modular cards around it showing user-provided key benefits, use cases, materials, or details. Keep layout clean with consistent line icons, arrows, and close-ups; text short and readable. Use only user-provided or clearly visible product information—do not invent certifications, claims, specs, sales figures, or prices.',
    },
  },
  'product-spec-sheet': {
    label: { zh: '尺寸/规格图', en: 'Size & spec sheet' },
    tag: { zh: '规格', en: 'Specs' },
    hint: { zh: '尺寸、容量、材质和参数标注', en: 'Dimensions, capacity, materials, and parameter labels' },
    prompt: {
      zh: '生成一张商品尺寸/规格图。保留商品真实外观，使用简洁标注线、比例尺感和参数表区域展示用户提供的长宽高、重量、容量、材质、型号或兼容信息。所有数字、单位和参数必须严格来自用户输入；缺失的数据用清晰占位区域呈现，不要自行编造。整体像电商详情页规格模块，移动端可读。',
      en: 'Generate a product size and specification sheet. Preserve the real product appearance with clean dimension lines, scale cues, and a parameter table area for user-provided length, width, height, weight, capacity, materials, model, or compatibility info. All numbers, units, and specs must come strictly from user input; show clear placeholders for missing data—never invent values. Should read like a mobile-friendly e-commerce detail-page spec module.',
    },
  },
  'product-exploded-view': {
    label: { zh: '爆炸拆解图', en: 'Exploded view' },
    tag: { zh: '拆解', en: 'Exploded' },
    hint: { zh: '结构分层、组件关系和工艺细节', en: 'Layered structure, components, and build details' },
    prompt: {
      zh: '生成一张商品爆炸拆解/结构分层信息图。以用户提供的商品为唯一参考，把外壳、可见组件、包装层、附件或材质层以有序分离的方式展示，使用细线、编号和短标签说明结构关系。只展示用户提供或外观可见的结构，不编造不可见内部零件、芯片、认证或技术参数；如果商品不适合拆解，改为外观结构分层示意。',
      en: 'Generate an exploded-view or layered-structure infographic for the product. Using only the user-provided product as reference, show outer shell, visible components, packaging layers, accessories, or material layers in an orderly separated layout with fine lines, numbers, and short labels explaining structure. Show only user-provided or visibly apparent structure—do not invent hidden internals, chips, certifications, or technical specs. If the product is not suitable for disassembly, use an exterior layered schematic instead.',
    },
  },
  'product-comparison-matrix': {
    label: { zh: '对比矩阵图', en: 'Comparison matrix' },
    tag: { zh: '对比', en: 'Compare' },
    hint: { zh: '本品 vs 普通方案，突出选择理由', en: 'This product vs. ordinary options—why choose it' },
    prompt: {
      zh: '生成一张电商对比矩阵图。左侧展示用户商品，右侧展示普通方案或使用前后状态，用 3 到 5 行对比维度说明选择理由。对比文字必须基于用户提供的卖点、材质、规格或可观察差异；证据不足时使用温和、品类级表达，不编造竞品名称、测试数据、认证、销量、评分或夸张功效。版式清楚、移动端可读。',
      en: 'Generate an e-commerce comparison matrix. Show the user product on the left and a generic alternative or before/after state on the right with 3 to 5 comparison rows explaining why to choose it. Comparison copy must be based on user-provided selling points, materials, specs, or observable differences; use mild category-level wording when evidence is thin. Do not invent competitor names, test data, certifications, sales, ratings, or exaggerated claims. Layout clear and mobile-readable.',
    },
  },
  'product-whats-in-box': {
    label: { zh: '包装清单图', en: "What's in the box" },
    tag: { zh: '清单', en: 'Contents' },
    hint: { zh: '商品、包装、配件和数量说明', en: 'Product, packaging, accessories, and quantities' },
    prompt: {
      zh: '生成一张包装清单图。把商品本体、包装盒、说明书、配件、赠品或组合装以整齐平铺或轻微透视方式展示，使用短标签说明每个物件和数量。只展示用户提供或参考图中明确存在的物件；未知配件用留白占位，不要自行添加充电线、工具、赠品、Logo 或包装信息。画面适合电商副图和 A+ 模块。',
      en: 'Generate a what\'s-in-the-box contents image. Lay out the product, box, manual, accessories, gifts, or bundle items in a neat flat-lay or slight perspective with short labels for each item and quantity. Show only items the user provided or that are clearly visible in references; use blank placeholders for unknown accessories—do not add cables, tools, gifts, logos, or packaging claims. Suitable for e-commerce secondary images and A+ modules.',
    },
  },
  'model-lifestyle-product': {
    label: { zh: '模特场景图', en: 'Model lifestyle shot' },
    tag: { zh: '模特', en: 'Model' },
    hint: { zh: '产品上身、手持或生活方式展示', en: 'On-body, handheld, or lifestyle product showcase' },
    prompt: {
      zh: '生成模特生活方式商品展示图。以用户描述或上传参考图中的商品为核心，安排真实可信的模特上身、手持或使用场景，人物姿态自然，商品尺寸感明确，光线像真实商业摄影，背景干净有生活气息，避免夸张摆拍、脸部变形和无关品牌元素。',
      en: 'Generate a model lifestyle product showcase. Center the product from the user description or uploaded reference with a believable model wearing, holding, or using it in a natural pose with clear product scale, real commercial photography lighting, and a clean yet lived-in background. Avoid exaggerated posing, facial distortion, and unrelated brand elements.',
    },
  },
  'fashion-tryon-kv': {
    label: { zh: '穿搭试穿', en: 'Fashion try-on' },
    tag: { zh: '服饰', en: 'Fashion' },
    hint: { zh: '适合服饰、鞋包和配件', en: 'For apparel, shoes, bags, and accessories' },
    prompt: {
      zh: '生成服饰或配件试穿展示图。保持用户提供的服装、鞋包或配件款式、颜色、纹理和版型稳定，模特站姿自然，画面包含全身或半身展示、局部细节和生活场景氛围，像电商详情页与社媒投放共用素材，不出现错误文字和额外品牌。',
      en: 'Generate a fashion or accessory try-on showcase. Keep the user-provided garment, shoe, bag, or accessory style, color, texture, and fit stable with a natural model pose. Include full-body or half-body views, detail close-ups, and lifestyle atmosphere suitable for product detail pages and social ads—no incorrect text or extra brands.',
    },
  },
  'lifestyle-daily-scene': {
    label: { zh: '日常生活', en: 'Daily life' },
    tag: { zh: '生活', en: 'Life' },
    hint: { zh: '朋友圈、小红书、品牌日常配图', en: 'Social feeds, lifestyle posts, brand daily content' },
    prompt: {
      zh: '生成自然生活方式图片。画面像真实日常记录的一帧，人物或物品状态松弛可信，光线自然，构图有呼吸感；如果包含商品，让商品融入场景而不是硬广摆拍；整体适合朋友圈、小红书、品牌日常或轻量内容配图。',
      en: 'Generate a natural lifestyle image that feels like a real everyday moment—relaxed, believable people or objects, natural light, and airy composition. If a product appears, integrate it into the scene rather than a hard-sell setup. Suitable for social feeds, lifestyle platforms, brand daily content, or light editorial use.',
    },
  },
  'campaign-poster': {
    label: { zh: '活动海报', en: 'Campaign poster' },
    tag: { zh: '竖版', en: 'Portrait' },
    hint: { zh: '社媒活动、优惠或上新预热', en: 'Social campaigns, promos, or launch teasers' },
    prompt: {
      zh: '生成一张竖版营销活动海报。请围绕用户给出的产品、活动或主题建立清晰主视觉，保留标题区、卖点区和行动入口的版式空间，视觉有冲击力但不杂乱，适合移动端发布；不编造真实折扣、日期、联系方式或认证信息。',
      en: 'Generate a vertical marketing campaign poster. Build a clear hero visual around the user\'s product, event, or theme with reserved space for headline, selling points, and call-to-action. Impactful but not cluttered, mobile-ready—do not invent real discounts, dates, contact info, or certifications.',
    },
  },
  'brand-kv-banner': {
    label: { zh: '品牌 KV', en: 'Brand KV banner' },
    tag: { zh: '横幅', en: 'Banner' },
    hint: { zh: '官网首屏、广告横幅、直播间背景', en: 'Website hero, ad banners, livestream backgrounds' },
    prompt: {
      zh: '生成一张品牌 KV 横幅。根据用户提供的品牌、产品或服务定位，设计宽屏主视觉，主体明确，背景空间有层次，预留标题与副标题位置，整体可信、现代、适合官网首屏、广告横幅或直播间背景，不写不可验证的宣传语。',
      en: 'Generate a brand KV banner. Design a widescreen hero visual from the user\'s brand, product, or service positioning with a clear subject, layered background space, and reserved headline/subheadline areas. Credible and modern for website heroes, ad banners, or livestream backgrounds—no unverifiable claims.',
    },
  },
  'feature-infographic': {
    label: { zh: '卖点信息图', en: 'Feature infographic' },
    tag: { zh: '卖点', en: 'Features' },
    hint: { zh: '3-5 个核心价值，适合详情页', en: '3–5 core values for detail pages' },
    prompt: {
      zh: '生成产品卖点信息图。把用户给出的 3 到 5 个核心卖点整理成清晰模块，使用图标、局部特写、流程或对比结构辅助理解，文字短且可读，视觉统一，适合电商详情页、招商介绍或社媒长图的一页。',
      en: 'Generate a product feature infographic. Organize 3 to 5 user-provided core selling points into clear modules with icons, close-ups, flows, or comparisons. Short readable text and unified visuals suitable for e-commerce detail pages, partner decks, or one-page social graphics.',
    },
  },
  'product-brochure-pages': {
    label: { zh: '产品宣传册', en: 'Product brochure' },
    tag: { zh: '册页', en: 'Brochure' },
    hint: { zh: '封面、卖点、功能、对比、行动页', en: 'Cover, features, comparison, and CTA pages' },
    prompt: {
      zh: '生成一组产品宣传册页面图片：封面、核心卖点页、功能介绍页、对比说明页、行动页。每页像同一份 brochure 的连续页面，统一字体风格、色彩、栅格和图标语言，信息层级清楚，不编造客户案例、认证、价格或联系方式。',
      en: 'Generate a set of product brochure page images: cover, core selling points, feature overview, comparison, and call-to-action. Each page should feel like consecutive spreads from one brochure with unified typography, color, grid, and icon language with clear hierarchy. Do not invent customer cases, certifications, prices, or contact details.',
    },
  },
  'business-intro-pdf': {
    label: { zh: '业务介绍 PDF', en: 'Business intro PDF' },
    tag: { zh: '商务', en: 'Business' },
    hint: { zh: '封面、概览、流程、封底草案', en: 'Cover, overview, process, and back-cover drafts' },
    prompt: {
      zh: '生成业务介绍 PDF 的页面图片草案：封面、业务概览页、服务流程或方案路径页、封底页。版式正式可信，适合对外发送，使用中性商务视觉；缺少企业名称、联系方式、案例数据时用明确占位，不编造真实信息。',
      en: 'Generate draft page images for a business introduction PDF: cover, business overview, service process or solution path, and back cover. Formal, credible layout with neutral business visuals suitable for external sharing. Use clear placeholders for missing company name, contact, or case data—never invent real information.',
    },
  },
  'storybook-sequence': {
    label: { zh: '绘本分镜', en: 'Storybook sequence' },
    tag: { zh: '绘本', en: 'Storybook' },
    hint: { zh: '连续角色、画风和叙事', en: 'Consistent characters, style, and narrative' },
    prompt: {
      zh: '生成一组绘本式连续分镜。保持主角外观、服装、色彩和画风一致，每张图推进一个小情节，画面温暖、干净、叙事清楚，适合儿童绘本、品牌故事或轻量内容栏目；不要出现密集文字和不一致角色。',
      en: 'Generate a storybook-style sequential storyboard. Keep the main character\'s appearance, clothing, color, and art style consistent across frames, each advancing a small plot beat with warm, clean, clear storytelling. Suitable for children\'s books, brand stories, or light content series—no dense text or inconsistent characters.',
    },
  },
  'comic-sequence': {
    label: { zh: '连环画分镜', en: 'Comic sequence' },
    tag: { zh: '漫画', en: 'Comic' },
    hint: { zh: '多场景连续动作和情节', en: 'Multi-scene continuous action and plot' },
    prompt: {
      zh: '生成一组连环画分镜。按用户给出的主题拆成连续场景，保持角色、服装、道具和空间关系一致，动作清楚，镜头有近景、中景和远景变化，画面适合社媒连载或故事说明；文字气泡留白即可，不生成大段不可读文字。',
      en: 'Generate a comic-strip storyboard sequence. Split the user\'s theme into continuous scenes with consistent characters, clothing, props, and spatial relationships, clear action, and varied close/medium/wide shots. Suitable for social serials or story explainers—speech bubbles may be left blank; do not generate long unreadable text.',
    },
  },
  'multi-reference-composite': {
    label: { zh: '多图融合', en: 'Multi-reference composite' },
    tag: { zh: '融合', en: 'Composite' },
    hint: { zh: '商品、场景、风格参考合成', en: 'Blend product, scene, and style references' },
    prompt: {
      zh: '基于用户上传的多张参考素材生成一张融合图。请分别保留商品主体、目标场景、色调风格和关键构图关系，让它们自然合成在同一画面中，光线方向和透视一致，主体边缘干净，不产生额外 Logo、错误文字或无关物体。',
      en: 'Generate one composite image from multiple user-uploaded references. Preserve the product subject, target scene, color tone, style, and key composition so they blend naturally in one frame with consistent lighting direction and perspective, clean subject edges, and no extra logos, incorrect text, or unrelated objects.',
    },
  },
}

export const ARK_VIDEO_TEMPLATE_L10N: Record<string, ArkVideoTemplateL10nFields> = {
  'clean-video-template': {
    label: { zh: '纯净模板', en: 'Clean template' },
    hint: { zh: '不写提示词，只使用你的输入和可见参数', en: 'No prompt text — only your input and visible parameters' },
    prompt: { zh: '', en: '' },
  },
  'tiktok-shop-15s-ad': {
    label: { zh: 'TikTok Shop 15s', en: 'TikTok Shop 15s' },
    hint: { zh: '竖屏带货，2 秒钩子 + 商品展示 + CTA', en: 'Vertical shoppable ad: 2s hook + product showcase + CTA' },
    prompt: {
      zh: '参考上传的商品图，生成一段 15 秒 TikTok Shop 竖屏带货短视频。0-2 秒用强视觉钩子让商品快速进入画面；2-7 秒展示商品全貌、核心卖点和材质细节；7-12 秒加入真实使用场景或手部演示；12-15 秒回到商品英雄镜头并预留简短 CTA 文字区。节奏快但清楚，商品外观、颜色、包装和比例保持一致，不编造价格、折扣、销量、认证或夸张功效。',
      en: 'From the uploaded product image, generate a 15-second vertical TikTok Shop shoppable video. 0–2s: strong visual hook bringing the product into frame fast; 2–7s: full product view, key selling points, and material details; 7–12s: real use scene or hand demo; 12–15s: return to product hero shot with space for a short CTA. Fast but clear pacing—keep appearance, color, packaging, and scale consistent. Do not invent prices, discounts, sales, certifications, or exaggerated claims.',
    },
  },
  'marketplace-product-page-video': {
    label: { zh: 'Amazon/Shopify 产品页视频', en: 'Amazon/Shopify product page video' },
    hint: { zh: '横版产品页，多角度、细节和场景', en: 'Landscape product page with angles, details, and context' },
    prompt: {
      zh: '参考上传的商品图，生成一段 15 秒 Amazon 或 Shopify 产品页视频。0-3 秒展示干净背景中的商品英雄角度；3-8 秒用平滑镜头展示正面、侧面、背面或 45 度角；8-12 秒切到材质、接口、纹理、包装或关键结构特写；12-15 秒展示使用场景并回到清晰商品定格。画面专业、可信、适合商品页轮播，不出现水印、第三方 Logo、价格、促销角标或不可验证文字。',
      en: 'From the uploaded product image, generate a 15-second Amazon or Shopify product page video. 0–3s: clean-background hero angle; 3–8s: smooth moves across front, side, back, or 45° views; 8–12s: close-ups of materials, ports, texture, packaging, or key structure; 12–15s: use context then clear product hold. Professional and trustworthy for product carousels—no watermarks, third-party logos, prices, promo badges, or unverifiable text.',
    },
  },
  'commerce-product-360-showcase': {
    label: { zh: '产品 360 旋转', en: 'Product 360° spin' },
    hint: { zh: '平滑旋转，展示材质、边缘和结构', en: 'Smooth rotation showing materials, edges, and structure' },
    prompt: {
      zh: '参考上传的商品图，生成一段产品 360 旋转展示视频。商品位于干净浅色或中性渐变背景中央，镜头围绕商品缓慢旋转，先展示英雄角度，再展示侧面、背面、顶部或底部细节，材质高光、边缘、纹理和包装保持清晰。运动平滑无跳变，主体占画面 50%-80%，不添加多余文字、虚构部件、价格、促销信息或不相关道具。',
      en: 'From the uploaded product image, generate a 360° product spin video. Product centered on a clean light or neutral gradient background as the camera orbits slowly—hero angle first, then side, back, top, or bottom details with clear highlights, edges, texture, and packaging. Smooth motion without jumps; subject occupies 50–80% of frame. No extra text, fictional parts, prices, promos, or unrelated props.',
    },
  },
  'commerce-unboxing-showcase': {
    label: { zh: '开箱展示', en: 'Unboxing showcase' },
    hint: { zh: '包装、打开、配件、本体展示', en: 'Packaging, opening, accessories, and product reveal' },
    prompt: {
      zh: '参考上传的商品包装或商品图，生成一段 15 秒开箱展示视频。0-3 秒展示包装盒外观和开箱动作；3-7 秒打开包装并展示内部摆放；7-11 秒依次展示商品本体、说明书、配件或组合内容；11-15 秒把商品放到桌面形成完整英雄镜头。只展示参考图或用户明确提供的物件，不自行添加配件、赠品、品牌文字、价格或促销信息。',
      en: 'From uploaded packaging or product images, generate a 15-second unboxing video. 0–3s: box exterior and opening action; 3–7s: open and reveal interior layout; 7–11s: product, manual, accessories, or bundle contents in sequence; 11–15s: product on desk in a complete hero shot. Show only reference or user-specified items—do not add accessories, gifts, brand text, prices, or promos.',
    },
  },
  'commerce-ugc-demo': {
    label: { zh: 'UGC 试用演示', en: 'UGC try-on demo' },
    hint: { zh: '人物或手部试用，适合种草和口播素材', en: 'Person or hands-on trial for seeding and voiceover clips' },
    prompt: {
      zh: '参考上传的商品图和可选人物形象，生成一段 15 秒 UGC 试用演示视频。0-2 秒人物或手部把商品带入镜头；2-7 秒自然展示商品外观、尺寸感和关键细节；7-12 秒模拟真实使用或试用动作；12-15 秒人物看向镜头或商品定格，预留短 CTA/推荐语位置。风格像真实创作者测评，语气可信克制，不夸张表演，不编造功效、价格、销量、认证或真实评价。',
      en: 'From uploaded product and optional portrait references, generate a 15-second UGC try-on demo. 0–2s: person or hands bring product into frame; 2–7s: natural showcase of look, scale, and key details; 7–12s: realistic use or trial motion; 12–15s: look to camera or product hold with space for short CTA/recommendation. Authentic creator-review tone—credible, restrained, no exaggerated acting or invented claims, prices, sales, certifications, or fake reviews.',
    },
  },
  'portrait-camera-move': {
    label: { zh: '写实人像运镜', en: 'Realistic portrait camera move' },
    hint: { zh: '参考生成，稳定主体与自然光影', en: 'Reference-based, stable subject and natural light' },
    prompt: {
      zh: '参考上传的人物形象，生成一段写实人像短片。镜头从半身中景缓慢推进到近景，人物自然转头看向镜头，表情克制自信，背景为柔和城市天台或室内窗边，浅景深，真实皮肤质感，电影级自然光，画面稳定，无夸张变形。',
      en: 'From the uploaded portrait reference, generate a realistic portrait clip. Camera slowly pushes from medium half-body to close-up as the subject naturally turns toward lens with restrained confident expression. Soft rooftop or window-side background, shallow depth of field, real skin texture, cinematic natural light, stable frame—no exaggerated distortion.',
    },
  },
  'cinematic-long-take': {
    label: { zh: '电影感长镜头', en: 'Cinematic long take' },
    hint: { zh: '宽画幅长镜头，适合场景叙事', en: 'Widescreen long take for scene storytelling' },
    prompt: {
      zh: '生成一段电影感长镜头：主体从画面远处缓慢走入前景，摄影机横向跟随，环境有层次丰富的前景遮挡和远处光源，黄昏逆光，空气中有轻微雾气，色调高级克制，镜头运动平滑，叙事感强，避免文字和水印。',
      en: 'Generate a cinematic long take: subject walks slowly from background into foreground as the camera tracks sideways. Layered foreground occlusion and distant light sources, dusk backlight, light atmospheric haze, refined restrained color grade, smooth camera motion, strong narrative feel—avoid text and watermarks.',
    },
  },
  'food-commercial-closeup': {
    label: { zh: '美食广告特写', en: 'Food commercial close-up' },
    hint: { zh: '首尾帧，突出质感与食欲', en: 'First/last frame, emphasizing texture and appetite appeal' },
    prompt: {
      zh: '根据首帧和尾帧生成一段美食广告特写。镜头从食材细节滑动到成品特写，酱汁缓慢流动，热气自然升起，表面高光真实，背景干净，商业广告质感，色彩鲜明但不过曝，动作连贯，突出香气和新鲜感。',
      en: 'From first and last frames, generate a food commercial close-up. Camera slides from ingredient detail to finished dish close-up with slow sauce flow, natural steam, realistic surface highlights, clean background, commercial ad quality, vivid but not overexposed color, continuous motion emphasizing aroma and freshness.',
    },
  },
  'product-3d-spin': {
    label: { zh: '产品 3D 旋转', en: 'Product 3D spin' },
    hint: { zh: '参考生成，展示材质和卖点', en: 'Reference-based showcase of materials and selling points' },
    prompt: {
      zh: '参考上传的产品图，生成一段产品 3D 旋转展示。产品位于干净浅色背景中央，镜头轻微环绕，主体缓慢旋转 180 度，材质高光和边缘细节清晰，加入柔和反射和阴影，整体像高端电商广告，不出现多余文字。',
      en: 'From the uploaded product image, generate a 3D product spin. Product centered on clean light background with a slight camera orbit as the subject slowly rotates 180° with clear material highlights and edge detail, soft reflections and shadows, premium e-commerce ad feel—no extra text.',
    },
  },
  'city-vlog-travel': {
    label: { zh: '城市旅拍 Vlog', en: 'City travel vlog' },
    hint: { zh: '移动镜头，适合短视频开场', en: 'Moving camera, great for short-video openings' },
    prompt: {
      zh: '生成一段城市旅拍 Vlog 画面：手持跟拍视角穿过有生活气息的街区，路边灯牌、行人、咖啡店橱窗自然掠过，镜头轻微晃动但稳定可看，阳光从建筑之间洒入，节奏轻快，真实旅行记录感，适合短视频开场。',
      en: 'Generate a city travel vlog shot: handheld follow-through a lively neighborhood with signs, pedestrians, and café windows passing naturally. Slight handheld shake but watchable stability, sunlight between buildings, upbeat pacing, authentic travel-documentary feel—ideal for short-video openings.',
    },
  },
  'anime-character-action': {
    label: { zh: '动漫风人物', en: 'Anime-style character' },
    hint: { zh: '参考生成，强化动作和光效', en: 'Reference-based with emphasized action and light effects' },
    prompt: {
      zh: '参考上传的人物设定，生成一段动漫风格人物短片。角色站在风中转身，衣摆和发丝随风摆动，镜头从侧面缓慢绕到正面，背景有柔和粒子光效，线条干净，色彩通透，动作自然连贯，保持角色五官和服装一致。',
      en: 'From the uploaded character design, generate an anime-style character clip. Character turns in the wind with swaying clothes and hair as the camera arcs from side to front. Soft particle light effects, clean lines, vivid transparent color, natural continuous motion—keep face and outfit consistent.',
    },
  },
  'sci-fi-vfx-scene': {
    label: { zh: '科幻特效场景', en: 'Sci-fi VFX scene' },
    hint: { zh: '参考生成，含环境音输出', en: 'Reference-based with ambient audio output' },
    prompt: {
      zh: '生成一段科幻特效场景：未来城市夜景中能量装置逐步启动，蓝白色光束从地面向天空聚集，地面反射微微震动，镜头缓慢后退展示宏大空间，光效真实，金属和玻璃材质清晰，氛围紧张但不杂乱，输出环境音。',
      en: 'Generate a sci-fi VFX scene: in a futuristic city night, an energy device powers up step by step with blue-white beams gathering from ground to sky, subtle ground reflection vibration, camera slowly pulling back to reveal vast space, realistic light effects, clear metal and glass materials, tense but uncluttered mood—output ambient audio.',
    },
  },
  'cartoon-pet-daily': {
    label: { zh: '卡通宠物日常', en: 'Cartoon pet daily life' },
    hint: { zh: '方图，适合社媒轻内容', en: 'Square format for light social content' },
    prompt: {
      zh: '生成一段卡通宠物日常短片：一只圆润可爱的宠物在明亮房间里追逐小玩具，动作轻快，表情有趣，镜头保持低机位跟随，色彩温暖，线条柔和，背景整洁，适合社交媒体轻松内容，避免写实恐怖或夸张变形。',
      en: 'Generate a cartoon pet daily-life clip: a round cute pet chasing a small toy in a bright room with lively motion and fun expressions. Low-angle follow camera, warm colors, soft lines, tidy background—light social content; avoid realistic horror or exaggerated distortion.',
    },
  },
  'first-last-object-morph': {
    label: { zh: '首尾帧变形', en: 'First/last frame morph' },
    hint: { zh: '首尾帧，展示形态变化', en: 'First and last frames showing shape transformation' },
    prompt: {
      zh: '根据首帧和尾帧生成一段物体变形示意。主体从首帧形态平滑过渡到尾帧形态，过程包含柔和粒子、液态或折纸式转场效果，镜头保持稳定，背景简洁，变化路径清楚，主体边缘不破碎，适合展示产品升级或概念转化。',
      en: 'From first and last frames, generate an object morph transition. Subject smoothly transforms from start to end shape with soft particles, liquid, or paper-fold transitions. Stable camera, simple background, clear transformation path, intact subject edges—suitable for product upgrades or concept conversion.',
    },
  },
  'beauty-kol-demo': {
    label: { zh: '美妆达人演示', en: 'Beauty KOL demo' },
    hint: { zh: '手部动作和产品细节', en: 'Hand motions and product detail' },
    prompt: {
      zh: '参考上传的产品或人物，生成一段美妆达人演示短片。镜头从产品包装切到手部试用和面部近景，动作自然、皮肤质感真实、光线柔和干净，强调质地、涂抹动作和使用氛围，适合短视频带货素材，避免夸张功效和错误文字。',
      en: 'From uploaded product or portrait, generate a beauty KOL demo clip. Cut from product packaging to hand application and face close-up with natural motion, real skin texture, soft clean lighting—emphasize texture, application, and use atmosphere for short-video commerce. Avoid exaggerated claims and incorrect text.',
    },
  },
  'fashion-tryon-transition': {
    label: { zh: '换装转场', en: 'Outfit change transition' },
    hint: { zh: '首尾帧，服饰试穿变化', en: 'First/last frame outfit try-on change' },
    prompt: {
      zh: '根据首帧和尾帧生成一段换装转场视频。人物姿态和身份保持一致，服装从首帧平滑切换到尾帧，转场可以使用转身、镜头遮挡或布料掠过效果，动作连贯，面部和手部稳定，背景不突变，适合服饰试穿展示。',
      en: 'From first and last frames, generate an outfit-change transition video. Same pose and identity with clothing smoothly switching from start to end frame via turn, camera wipe, or fabric sweep. Continuous motion, stable face and hands, no abrupt background—ideal for fashion try-on showcases.',
    },
  },
  'unboxing-handheld': {
    label: { zh: '开箱手持', en: 'Handheld unboxing' },
    hint: { zh: '真实开箱和细节扫拍', en: 'Authentic unboxing and detail sweeps' },
    prompt: {
      zh: '参考上传的产品包装或商品图，生成一段开箱手持短片。镜头从包装外观开始，手部打开盒子，展示产品本体和关键配件，镜头有轻微手持感但稳定，真实桌面光线，材质细节清晰，适合电商开箱或短视频种草，不出现多余品牌文字。',
      en: 'From uploaded packaging or product images, generate a handheld unboxing clip. Start on package exterior, hands open the box and reveal product and key accessories with slight handheld feel but stability, real desk lighting, clear material detail—e-commerce unboxing or short-video seeding without extra brand text.',
    },
  },
  'short-drama-scene': {
    label: { zh: '短剧剧情片段', en: 'Short drama scene' },
    hint: { zh: '人物互动，强叙事开头', en: 'Character interaction with strong narrative opening' },
    prompt: {
      zh: '生成一段短剧开头片段。两名人物在真实室内或街景中发生简短互动，镜头先给环境再切到人物反应，动作和表情推动冲突，画面有电视剧质感，节奏紧凑但不夸张，避免字幕、水印和不自然肢体变形。',
      en: 'Generate a short-drama opening scene. Two characters interact briefly in a real interior or street setting—environment first, then reactions—with action and expression driving tension. TV-drama quality, tight but not exaggerated pacing. Avoid subtitles, watermarks, and unnatural body distortion.',
    },
  },
  'brand-logo-opener': {
    label: { zh: '品牌开场', en: 'Brand opener' },
    hint: { zh: '产品/Logo 氛围开场', en: 'Product/logo atmospheric opener' },
    prompt: {
      zh: '生成一段品牌或产品开场短片。主体从暗到亮逐渐出现，背景有简洁的光线扫过、粒子或反射效果，镜头轻微推进，整体高级、克制、干净，适合广告片头或直播间开场；如果有上传 Logo 或产品参考，保持形状和配色稳定。',
      en: 'Generate a brand or product opener. Subject emerges from dark to light with clean light sweeps, particles, or reflections and a slight camera push. Premium, restrained, clean—suitable for ad intros or livestream openings. If logo or product reference is uploaded, keep shape and colors stable.',
    },
  },
  'app-ui-walkthrough': {
    label: { zh: 'App 界面演示', en: 'App UI walkthrough' },
    hint: { zh: '界面流程、指针和镜头推进', en: 'UI flow, pointer, and camera push' },
    prompt: {
      zh: '参考上传的 App、网页或软件界面截图，生成一段产品界面演示视频。镜头从整体界面缓慢推进到关键功能区，加入自然的指针移动、点击反馈和页面切换感，界面文字尽量保持原截图结构，不新增错误文案，适合功能介绍或演示开场。',
      en: 'From uploaded app, web, or software UI screenshots, generate a product interface walkthrough video. Camera slowly pushes from full UI to key functional areas with natural pointer moves, click feedback, and page-transition feel. Preserve original screenshot text structure—no new incorrect copy—suitable for feature intros or demo openings.',
    },
  },
  'before-after-service': {
    label: { zh: '前后对比', en: 'Before & after' },
    hint: { zh: '首尾帧，展示改善效果', en: 'First/last frames showing improvement' },
    prompt: {
      zh: '根据首帧和尾帧生成一段前后对比视频。画面从改善前状态平滑过渡到改善后状态，中间用擦除、推拉、光线变化或空间移动完成转场，主体位置清楚，变化路径直观，适合服务效果、空间改造、产品升级或清洁修复展示。',
      en: 'From first and last frames, generate a before-and-after video. Smooth transition from before to after state via wipe, push-pull, lighting change, or spatial move. Clear subject position and intuitive change path—suitable for service results, space renovation, product upgrades, or cleaning/restoration showcases.',
    },
  },
}
