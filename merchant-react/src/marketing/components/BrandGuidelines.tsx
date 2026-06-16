import { Download, LayoutTemplate, Type } from "lucide-react";
import { brandAssets } from "../brandAssets";

export function BrandGuidelines() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">xiaoone 品牌资产</h1>
        <p className="text-xl text-gray-600 max-w-3xl">
          官网统一使用项目内指定 logo 与 slogan 资产，展示时保持比例、留白和清晰度，不拉伸、不混用旧版素材
        </p>
      </div>

      <div className="space-y-16">
        {/* Logo Assets Section */}
        <section>
          <div className="flex items-center gap-3 mb-6 pb-2 border-b border-gray-200">
            <LayoutTemplate className="text-blue-600" />
            <h2 className="text-2xl font-semibold text-gray-900">Logo 资产</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white border border-gray-200 rounded-2xl p-10 flex flex-col items-center justify-center shadow-sm relative group overflow-hidden">
              <div className="absolute top-4 left-4 text-xs font-medium text-gray-400 uppercase tracking-wider">白天横版</div>
              <img 
                src={brandAssets.light.horizontal} 
                alt="Light horizontal logo" 
                className="max-h-24 w-auto object-contain my-8 transition-transform group-hover:scale-105" 
              />
              <div className="w-full flex justify-between items-center mt-auto pt-6 border-t border-gray-100">
                <span className="text-sm text-gray-500 font-mono">logo/horizontal-day.png</span>
                <a href={brandAssets.light.horizontal} download className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-50 transition-colors" aria-label="下载白天横版 Logo">
                  <Download size={18} />
                </a>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-10 flex flex-col items-center justify-center shadow-sm relative group overflow-hidden">
              <div className="absolute top-4 left-4 text-xs font-medium text-slate-400 uppercase tracking-wider">黑夜横版</div>
              <img 
                src={brandAssets.dark.horizontal} 
                alt="Dark horizontal logo" 
                className="max-h-24 w-auto object-contain my-8 transition-transform group-hover:scale-105" 
              />
              <div className="w-full flex justify-between items-center mt-auto pt-6 border-t border-gray-100">
                <span className="text-sm text-slate-400 font-mono">logo/horizontal-night.png</span>
                <a href={brandAssets.dark.horizontal} download className="text-blue-300 hover:text-blue-100 p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="下载黑夜横版 Logo">
                  <Download size={18} />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Square Assets Section */}
        <section>
          <div className="flex items-center gap-3 mb-6 pb-2 border-b border-gray-200">
            <Type className="text-gray-800" />
            <h2 className="text-2xl font-semibold text-gray-900">方形图标与浏览器图标</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-10 flex flex-col items-center justify-center shadow-sm relative group overflow-hidden">
              <div className="absolute top-4 left-4 text-xs font-medium text-gray-400 uppercase tracking-wider">白天方形</div>
              <img 
                src={brandAssets.light.square} 
                alt="Light square logo" 
                className="max-h-24 w-auto object-contain my-8 transition-transform group-hover:scale-105" 
              />
              <div className="w-full flex justify-between items-center mt-auto pt-6 border-t border-gray-200">
                <span className="text-sm text-gray-500 font-mono">logo/square-day.png</span>
                <a href={brandAssets.light.square} download className="text-gray-700 hover:text-gray-900 p-2 rounded-full hover:bg-gray-200 transition-colors" aria-label="下载白天方形 Logo">
                  <Download size={18} />
                </a>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-10 flex flex-col items-center justify-center shadow-sm relative group overflow-hidden">
              <div className="absolute top-4 left-4 text-xs font-medium text-slate-400 uppercase tracking-wider">黑夜方形</div>
              <img 
                src={brandAssets.dark.square} 
                alt="Dark square logo" 
                className="max-h-24 w-auto object-contain my-8 transition-transform group-hover:scale-105" 
              />
              <div className="w-full flex justify-between items-center mt-auto pt-6 border-t border-gray-200">
                <span className="text-sm text-slate-400 font-mono">logo/square-night.png</span>
                <a href={brandAssets.dark.square} download className="text-blue-300 hover:text-blue-100 p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="下载黑夜方形 Logo">
                  <Download size={18} />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Usage Guidelines Note */}
        <div className="bg-blue-50 rounded-xl p-8 border border-blue-100 flex gap-4">
          <div className="bg-blue-100 text-blue-700 p-3 rounded-full h-fit">
            <LayoutTemplate size={24} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">官网使用规则</h3>
            <p className="text-gray-600 mb-4 leading-relaxed">
              官网 Header、Footer、注册引导和对外物料统一使用 logo 目录下的 PNG；白天使用黑字资产，黑夜使用白字资产，浏览器图标使用对应主题的方形图标
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
