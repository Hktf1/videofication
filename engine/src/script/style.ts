/** 对外版本可以重命名；manifest 用稳定标识避免历史 v1 与新 v1 混淆。 */
export const STYLE_ID = "motion";
export const STYLE_VERSION = "v1";
export const LEGACY_TEXT_STYLE = "legacy-text";

export const scriptStyle = (meta: Record<string, string>): string => {
  const style = meta["风格"] || STYLE_VERSION;
  return style === "v4" ? STYLE_VERSION : style;
};

/** 老 manifest 的 v1/v2 都是纯文字，新 manifest 必须带 styleId。 */
export function manifestStyle(meta: { style?: unknown; styleId?: unknown }): string | null {
  if (meta.styleId === STYLE_ID || meta.style === "v4") return STYLE_VERSION;
  if (meta.style === "v1" || meta.style === "v2") return LEGACY_TEXT_STYLE;
  return typeof meta.style === "string" ? meta.style : null;
}
