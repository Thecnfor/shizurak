/**
 * 防闪烁内联脚本：在首帧前用 localStorage 里的白名单 id 覆写 data-theme。
 * 契约 v2 已废除 accentHue 覆盖（hue-rotate 钩子已从生成管线整体删除），
 * 旧版脚本里「把持久化 accentHue 写进 --hue-rotate」的那段随之退役，
 * 现在只剩白名单内的 data-theme 还原（白名单外的陈旧值直接忽略）。
 * 经根布局 <head> 里的普通 <script> 标签内联注入（非 next/script），
 * 必须保持为自执行、无依赖的 ES5 级代码。
 *
 * 白名单由 registry 派生（T9 评审批 I）：新增主题自动入围，不再手维护
 * 字面量；注入时已序列化为纯数组字面量，产物仍是无依赖 ES5。无循环导入：
 * registry → themes/*→ contract（类型），均不回引本模块。
 */
import { themeList } from "@/themes/registry";

const KNOWN_THEME_IDS = themeList.map((t) => t.meta.id);

export const THEME_INIT_SCRIPT = `(function(){try{
var known=${JSON.stringify(KNOWN_THEME_IDS)};
var raw=localStorage.getItem("shizurak:theme");if(!raw)return;
var v=JSON.parse(raw);var d=document.documentElement;
if(v&&typeof v.themeId==="string"&&known.indexOf(v.themeId)!==-1){d.setAttribute("data-theme",v.themeId);}
}catch(e){}})();`;
