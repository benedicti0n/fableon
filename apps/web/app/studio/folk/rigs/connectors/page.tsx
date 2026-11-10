import type { Metadata } from "next";

import { ConnectorRigEditor } from "@/components/studio/connector-rig-editor";

export const metadata: Metadata = {
  title: "Connector Rig Calibration",
  robots: { index: false, follow: false },
};

export default function ConnectorRigPage() {
  return <ConnectorRigEditor />;
}
