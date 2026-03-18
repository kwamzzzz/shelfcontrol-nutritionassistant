const Recipes = () => {
  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-foreground">Recipes</h1>
      <p className="mt-2 text-muted-foreground">Save meals and cook from your pantry.</p>
      <div className="mt-8 rounded-xl border bg-card p-8 text-center text-muted-foreground">
        No recipes yet. Create your first recipe.
      </div>
    </div>
  );
};

export default Recipes;
