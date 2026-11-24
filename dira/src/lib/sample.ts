"use client";
// Which demo the hero is showing, so "try a sample" opens that same photo in the studio.

export type SampleId = "living" | "bedroom" | "kitchen";

let active: SampleId = "living";

export function setActiveSample(id: SampleId) {
  active = id;
}

/** The demo's original photo as a File, named so the studio can tell it is a sample. */
export async function sampleFile(url: (path: string) => string, name: string, id: SampleId = active): Promise<File> {
  const res = await fetch(url(`/demo/${id}-before.jpg`));
  const blob = await res.blob();
  return new File([blob], `${name}.jpg`, { type: "image/jpeg" });
}
