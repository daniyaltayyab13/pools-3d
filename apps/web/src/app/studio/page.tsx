import { StudioExperience } from "@/components/studio/StudioExperience";

/**
 * Studio route.
 *
 * This page stays small because the heavy browser-only 3D logic lives inside
 * StudioExperience, which is a client component.
 */
export default function StudioPage() {
  return <StudioExperience />;
}
