import { redirect } from "next/navigation";

// Per professor feedback, the Dashboard is the default landing page (the
// customer journey starts with overall business status, not the chat).
// The Assistant now lives at /assistant, at the end of the flow.
export default function Home() {
  redirect("/dashboard");
}
