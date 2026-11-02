/** 只约束新建文章目录；原始 docx 文件名和历史目录不改写。 */
export function validateArticleName(name: string): void {
  if (!name.trim()) throw new Error("请填写文章短名，例如「学用脱节」。");
  if (/[\\/:*?"<>|]/.test(name)) throw new Error("标题里不能有 \\ / : * ? \" < > |");
  if (/^\d+-/.test(name)) throw new Error("标题不用写编号，会自动取下一个。");
  const chinese = [...name.matchAll(/\p{Script=Han}/gu)].length;
  if (chinese > 4) throw new Error(`文章文件夹名的中文部分最多 4 个字，当前 ${chinese} 字。请概括成短名，例如「学用脱节」；原始 docx 标题与正文保留。`);
}
