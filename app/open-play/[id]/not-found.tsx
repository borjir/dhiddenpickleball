import Link from "next/link";
import { PublicPage } from "@/components/site/public-page";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { ArrowRightIcon } from "@/components/ui/icons";

export default function OpenPlaySessionNotFound() {
  return (
    <PublicPage>
      <div className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
        <Alert
          variant="warning"
          eyebrow="Session not available"
          title="That open-play session could not be found"
        >
          <p>
            The link may be old, or the session may have been removed from the
            schedule. Check the current open-play list for another date.
          </p>
        </Alert>
        <Link
          href="/open-play"
          className={buttonClasses({ className: "mt-6" })}
        >
          See open-play sessions
          <ArrowRightIcon className="size-4" />
        </Link>
      </div>
    </PublicPage>
  );
}
