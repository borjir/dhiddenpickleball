/** Placeholder geometry while a client auth form hydrates. */
export function AuthFormSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="skeleton h-11 rounded-lg" />
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="space-y-1.5">
          <div className="skeleton h-3.5 w-24 rounded" />
          <div className="skeleton h-11 rounded-lg" />
        </div>
      ))}
      <div className="skeleton h-11 rounded-lg" />
    </div>
  );
}
