import { redirect } from "next/navigation";

/** The homepage mockup now lives at the root route. */
export default function HomepageMockupRedirect() {
  redirect("/");
}
