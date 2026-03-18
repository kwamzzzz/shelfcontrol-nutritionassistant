const Consumption = () => {
  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-foreground">Consumption</h1>
      <p className="mt-2 text-muted-foreground">Log what you eat and track nutrition.</p>
      <div className="mt-8 rounded-xl border bg-card p-8 text-center text-muted-foreground">
        No consumption logged today. Start logging meals.
      </div>
    </div>
  );
};

export default Consumption;
