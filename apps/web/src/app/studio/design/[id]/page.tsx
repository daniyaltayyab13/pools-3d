import { SharedDesignLoader } from "@/components/studio/SharedDesignLoader";
import { StudioExperience } from "@/components/studio/StudioExperience";

export default async function SharedDesignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      <SharedDesignLoader designId={id} />
      <StudioExperience />
    </>
  );
}
