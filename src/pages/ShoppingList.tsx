const ShoppingList = () => {
  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-foreground">Shopping List</h1>
      <p className="mt-2 text-muted-foreground">Plan what you need to buy next.</p>
      <div className="mt-8 rounded-xl border bg-card p-8 text-center text-muted-foreground">
        Your shopping list is empty. Add items manually.
      </div>
    </div>
  );
};

export default ShoppingList;
