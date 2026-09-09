/**
 * Reading demo_media.scenes_json, whichever shape it is in.
 *
 * The column has held two different things:
 *
 *   the Python pipeline (August)   an ARRAY of scenes, each carrying idx,
 *                                  scene_name, video_ok and the text-detection
 *                                  verdict from its own validation pass
 *
 *   generate-hero-media (Sept)     an OBJECT: { scenes, photos, polling_url,
 *                                  submitted_at }, where scenes is the brief
 *                                  and photos is what was actually rendered
 *
 * Two admin pages read this column and both assumed the array. When the shape
 * changed they called .filter on an object, threw, and Next returned a 500
 * with an empty body — which reaches the browser as "Failed to execute 'json'
 * on 'Response': Unexpected end of JSON input", an error that says nothing
 * about what actually went wrong.
 *
 * Every read goes through here so the shape is decided in one place, and a
 * third shape only has to be handled once.
 */

export type SceneRow = {
  idx?: number;
  scene_name?: string;
  video_ok?: boolean;
  text_detected?: boolean | null;
  text_severity?: string | null;
};

/** The scenes, as a list, from either shape. Never throws, never returns null. */
export function readScenes(scenesJson: unknown): SceneRow[] {
  if (Array.isArray(scenesJson)) return scenesJson as SceneRow[];
  const scenes = (scenesJson as { scenes?: unknown } | null)?.scenes;
  return Array.isArray(scenes) ? (scenes as SceneRow[]) : [];
}

/**
 * How many scenes the quality gate judged to have unusable text baked in.
 *
 * Only severity "bad" counts — the gate also flags incidental lettering, a
 * distant sign or tiny screen UI, that no visitor would notice. Scenes written
 * by generate-hero-media carry no verdict at all yet, which reads as zero: it
 * asks the image model for no text rather than checking afterwards.
 */
export function badTextScenes(scenesJson: unknown): SceneRow[] {
  return readScenes(scenesJson).filter((s) => s?.text_severity === "bad");
}

/**
 * The photographs actually rendered for this business.
 *
 * Only the September shape records these. An August row returns nothing, which
 * is correct — its images are on disk under the same slug but were never
 * listed in this column.
 */
export function readPhotos(
  scenesJson: unknown,
): { url: string; caption?: { heading?: string; body?: string } }[] {
  const photos = (scenesJson as { photos?: unknown } | null)?.photos;
  return Array.isArray(photos) ? photos : [];
}
