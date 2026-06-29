function Card({ title, value, delta, trend }) {
  return (
    <div className="stat-card">
      <p className="stat-label">{title}</p>
      <p className="stat-value">{value}</p>
      {delta && (
        <p className={`stat-delta ${trend}`}>
          {trend === "up" ? "▲" : "▼"} {delta} this month
        </p>
      )}
    </div>
  );
}

export default Card;