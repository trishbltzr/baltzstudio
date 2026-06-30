import { InFullFlightPrototype } from "@/components/InFullFlightPrototype";
import { getPrototypeWorkspace } from "@/lib/inFullFlightPrototype";

export default async function InFullFlightWorkspacePage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const workspace = getPrototypeWorkspace(workspaceSlug);

  return <InFullFlightPrototype workspace={workspace} />;
}
