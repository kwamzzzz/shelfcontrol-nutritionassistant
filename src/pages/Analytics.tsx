const Analytics = () => {
  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-foreground">Analytics</h1>
      <p className="mt-2 text-muted-foreground">Spending, waste, and nutrition insights.</p>
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {["Total Spend", "Items Wasted", "Avg Daily Calories", "Most Used Item"].map((label) => (
          <div key={label} className="rounded-xl border bg-card p-6 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-display font-bold text-foreground">—</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Analytics;
