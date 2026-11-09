import type { Metadata } from "next";

import { FolkRigEditor } from "@/components/studio/folk-rig-editor";

export const metadata: Metadata = {
  title: "Folk Rig Editor",
  robots: { index: false, follow: false },
};

export default function FolkRigsPage() {
  return <FolkRigEditor />;
}
