import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectsList } from "@/components/account/projects-list";
import { getDict, isLocale } from "@/i18n";

export async function generateMetadata({ params }: PageProps<"/[lang]/projects">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: getDict(lang).projects.title, robots: { index: false } };
}

export default async function Projects({ params }: PageProps<"/[lang]/projects">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <ProjectsList lang={lang} t={getDict(lang)} />;
}
