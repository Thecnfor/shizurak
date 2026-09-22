/**
 * 防闪烁内联脚本：在首帧前用 localStorage 里的白名单 id 覆写 data-theme。
 * 契约 v2 已废除 accentHue 覆盖（hue-rotate 钩子已从生成管线整体删除），
 * 旧版脚本里「把持久化 accentHue 写进 --hue-rotate」的那段随之退役，
 * 现在只剩白名单内的 data-theme 还原（白名单外的陈旧值直接忽略）。
 * 经根布局 <head> 里的普通 <script> 标签内联注入（非 next/script），
 * 必须保持为自执行、无依赖的 ES5 级代码。
 */
export const THEME_INIT_SCRIPT = `(function(){try{
var known=["void","lumen"];
var raw=localStorage.getItem("shizurak:theme");if(!raw)return;
var v=JSON.parse(raw);var d=document.documentElement;
if(v&&typeof v.themeId==="string"&&known.indexOf(v.themeId)!==-1){d.setAttribute("data-theme",v.themeId);}
}catch(e){}})();`;
