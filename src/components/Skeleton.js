// Reusable skeleton building blocks — animated placeholder shapes shown
// while real data is loading, instead of plain "Loading..." text.

export function Skeleton({ width = "100%", height = "14px", radius = "6px", style = {} }) {
  return (
    <div
      className="kn-skeleton"
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

// A single list-row placeholder — mirrors the shape of a db-action-row /
// match-card row (thumbnail + title line + subtitle line).
export function SkeletonRow() {
  return (
    <div className="kn-skeleton-row">
      <Skeleton width="38px" height="38px" radius="10px" />
      <div className="kn-skeleton-row-lines">
        <Skeleton width="55%" height="13px" />
        <Skeleton width="35%" height="11px" style={{ marginTop: "7px" }} />
      </div>
    </div>
  );
}

// Repeats SkeletonRow — pass a count to match how many real rows are expected.
export function SkeletonList({ count = 3 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </>
  );
}

// Mirrors a db-stat-card (label + icon on top, big value below).
export function SkeletonStatCard() {
  return (
    <div className="db-stat-card">
      <div className="db-stat-top">
        <Skeleton width="70px" height="10px" />
        <Skeleton width="34px" height="34px" radius="9px" />
      </div>
      <Skeleton width="56px" height="23px" style={{ marginTop: "2px" }} />
    </div>
  );
}

export function SkeletonStatGrid({ count = 4 }) {
  return (
    <div className="db-stats-grid">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
  );
}

// A wider row for table-style lists (leaderboard, admin users table).
export function SkeletonTableRow({ columns = 4 }) {
  return (
    <div className="kn-skeleton-table-row">
      <Skeleton width="32px" height="32px" radius="50%" />
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} width={i === 0 ? "40%" : "60px"} height="12px" />
      ))}
    </div>
  );
}