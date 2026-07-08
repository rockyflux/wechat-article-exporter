export interface AutoTagRule {
  tag: string;
  keywords: string[];
}

/** 匹配时忽略空格，英文不区分大小写 */
export function normalizeForMatch(text: string): string {
  return text.replace(/\s+/g, '').toLowerCase();
}

export function parseKeywords(input: string): string[] {
  return input
    .split(/[,，]/)
    .map(item => item.trim())
    .filter(Boolean);
}

export function formatKeywords(keywords: string[]): string {
  return keywords.join(', ');
}

export function buildArticleMatchText(title: string, digest?: string): string {
  return [title, digest].filter(Boolean).join(' ');
}

export function resolveAutoTag(matchText: string, rules: AutoTagRule[] | undefined): string {
  if (!rules?.length || !matchText) {
    return '';
  }

  const text = normalizeForMatch(matchText);
  for (const rule of rules) {
    const tag = rule.tag?.trim();
    if (!tag) {
      continue;
    }

    for (const keyword of rule.keywords) {
      const kw = normalizeForMatch(keyword);
      if (kw && text.includes(kw)) {
        return tag;
      }
    }
  }

  return '';
}
