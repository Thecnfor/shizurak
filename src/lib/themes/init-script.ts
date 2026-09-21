/**
 * 防闪烁内联脚本：在首帧前写入 data-theme。
 * 契约 v2 已废除 accentHue 覆盖（hue-rotate 钩子已从生成管线整体删除），
 * 此处只写 data-theme，避免陈旧持久化值污染色相。
 * 经根布局以 next/script（beforeInteractive）内联注入，必须保持为自执行、无依赖的 ES5 级代码。
 */
export const THEME_INIT_SCRIPT = `(function(){try{
var known=["void","lumen"];
var raw=localStorage.getItem("shizurak:theme");if(!raw)return;
var v=JSON.parse(raw);var d=document.documentElement;
if(v&&typeof v.themeId==="string"&&known.indexOf(v.themeId)!==-1){d.setAttribute("data-theme",v.themeId);}
}catch(e){}})();`;
