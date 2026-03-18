const Pantry = () => {
  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-foreground">Pantry</h1>
      <p className="mt-2 text-muted-foreground">Track everything in your kitchen inventory.</p>
      <div className="mt-8 rounded-xl border bg-card p-8 text-center text-muted-foreground">
        Your pantry is empty. Add your first item to get started.
      </div>
    </div>
  );
};

export default Pantry;
