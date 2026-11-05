import { MockBridge } from "@/components/MockBridge";

/** Mock mode only: the other app's hidden sync frame loads this page (see components/MockSync.tsx). */
export default function Page() {
	return <MockBridge />;
}
