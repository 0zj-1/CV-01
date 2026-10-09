import type { Project, ProjectTranslation } from '../content/projects/types';
import { projectTranslations } from '../content/project-translations';
export type Locale = 'en' | 'zh-Hant';
export const normalizeLocale = (value: unknown): Locale => value === 'zh-Hant' ? 'zh-Hant' : 'en';

// Exact source matching keeps an old translation from being applied to revised copy.
export function chineseProjectCopy(project: Project): ProjectTranslation {
  const saved = project.translations?.['zh-Hant'];
  const translated = (source: string, override?: string) => override !== undefined ? override.trim() : projectTranslations[source] || '';
  return {
    title: translated(project.title, saved?.title),
    description: translated(project.description, saved?.description),
    coverAlt: translated(project.coverAlt, saved?.coverAlt),
    placeholderLabel: translated(project.placeholderLabel, saved?.placeholderLabel),
    detail: Object.fromEntries((['category', 'headline', 'introduction', 'approach'] as const).map(key => [key, translated(project.detail[key], saved?.detail?.[key])])),
  };
}
export function localizeProject<T extends Project>(project: T, locale: Locale): T {
  if (locale === 'en') return project;
  const copy = chineseProjectCopy(project);
  const present = (values: Record<string, unknown>) => Object.fromEntries(Object.entries(values).filter(([, value]) => typeof value === 'string' && value.trim()));
  return { ...project, ...present(copy), detail: { ...project.detail, ...present(copy.detail ?? {}) } };
}
