import Image from "next/image";

/**
 * Hero photograph with a CSS-only load-in. Keeping this off the client bundle
 * means the first viewport animates immediately, before hydration, and is never
 * hidden while JavaScript downloads.
 */
export function HeroMedia({
  src,
  alt,
  priority = false,
}: {
  src: string;
  alt: string;
  priority?: boolean;
}) {
  return (
    <div className="hero-media-in absolute inset-0">
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes="100vw"
        className="object-cover object-center"
      />
    </div>
  );
}
