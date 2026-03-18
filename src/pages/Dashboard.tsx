const Dashboard = () => {
  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">Overview of your kitchen at a glance.</p>
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {["Items in Stock", "Expiring Soon", "This Week's Spend", "Calories Today"].map((label) => (
          <div key={label} className="rounded-xl border bg-card p-6 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-display font-bold text-foreground">—</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
