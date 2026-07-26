-- Nutrition reference data must declare what the values describe and where they
-- came from. This migration normalizes the existing catalog to per-100 g/ml
-- reference values and keeps uncertain product matches visibly editable.

ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS nutrition_source text,
  ADD COLUMN IF NOT EXISTS nutrition_source_url text,
  ADD COLUMN IF NOT EXISTS nutrition_source_id text,
  ADD COLUMN IF NOT EXISTS nutrition_estimated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS nutrition_confidence text,
  ADD COLUMN IF NOT EXISTS nutrition_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS nutrition_grams_per_unit numeric,
  ADD COLUMN IF NOT EXISTS nutrition_ml_per_unit numeric;

ALTER TABLE public.items
  DROP CONSTRAINT IF EXISTS items_nutrition_confidence_check,
  ADD CONSTRAINT items_nutrition_confidence_check
    CHECK (nutrition_confidence IS NULL OR nutrition_confidence IN ('high', 'medium', 'low', 'needs_review')),
  DROP CONSTRAINT IF EXISTS items_nutrition_grams_per_unit_check,
  ADD CONSTRAINT items_nutrition_grams_per_unit_check
    CHECK (nutrition_grams_per_unit IS NULL OR nutrition_grams_per_unit > 0),
  DROP CONSTRAINT IF EXISTS items_nutrition_ml_per_unit_check,
  ADD CONSTRAINT items_nutrition_ml_per_unit_check
    CHECK (nutrition_ml_per_unit IS NULL OR nutrition_ml_per_unit > 0);

WITH profiles (
  pattern, priority, calories, protein, carbs, fat, fiber, sugar, sodium,
  basis, serving_size, grams_per_unit, ml_per_unit,
  source, source_url, source_id, confidence
) AS (
  VALUES
    -- Specific products and preparations must outrank their generic ingredient.
    ('tomato paste', 100, 82::numeric, 4.32, 18.91, 0.47, 4.10, 12.18, 59, 'per_100g', '100 g', NULL, NULL, 'USDA FoodData Central · tomato paste, no salt added', 'https://fdc.nal.usda.gov/food-details/170459/nutrients', '170459', 'medium'),
    ('al tayeb tandoori', 100, 215, 18.60, 0, 15.06, 0, 0, 70, 'per_100g', '100 g', 1000, NULL, 'USDA FoodData Central · comparable raw whole chicken', 'https://fdc.nal.usda.gov/food-details/171447/nutrients', '171447', 'low'),
    ('whole chicken', 100, 215, 18.60, 0, 15.06, 0, 0, 70, 'per_100g', '100 g', 1200, NULL, 'USDA FoodData Central · raw whole chicken', 'https://fdc.nal.usda.gov/food-details/171447/nutrients', '171447', 'medium'),
    ('chicken samosa', 100, 260, 9, 28, 12, 2.4, 2.2, 520, 'per_100g', '100 g', NULL, NULL, 'Shelf Control · comparable prepared samosa estimate', NULL, NULL, 'low'),
    ('chicken breast', 100, 120, 22.50, 0, 2.62, 0, 0, 45, 'per_100g', '100 g', 174, NULL, 'USDA FoodData Central · raw skinless chicken breast', 'https://fdc.nal.usda.gov/food-details/171077/nutrients', '171077', 'high'),
    ('chicken cubes|^chicken$', 90, 120, 22.50, 0, 2.62, 0, 0, 45, 'per_100g', '100 g', 100, NULL, 'USDA FoodData Central · comparable raw skinless chicken breast', 'https://fdc.nal.usda.gov/food-details/171077/nutrients', '171077', 'medium'),
    ('beef salami', 100, 261, 12.60, 1.90, 22.20, 0, 1.50, 1140, 'per_100g', '100 g', NULL, NULL, 'USDA FoodData Central · cooked beef salami', 'https://fdc.nal.usda.gov/food-details/172935/nutrients', '172935', 'high'),
    ('minced beef', 100, 176, 20, 0, 10, 0, 0, 66, 'per_100g', '100 g', 100, NULL, 'USDA FoodData Central · 90% lean raw ground beef', 'https://fdc.nal.usda.gov/food-details/174030/nutrients', '174030', 'medium'),
    ('minced veil|^veil$', 100, 197, 18.58, 0, 13.06, 0, 0, 103, 'per_100g', '100 g', 100, NULL, 'USDA FoodData Central · comparable raw ground veal', 'https://fdc.nal.usda.gov/food-details/175290/nutrients', '175290', 'medium'),
    ('beef chops', 100, 306, 16.53, 0, 26.10, 0, 0, 55, 'per_100g', '100 g', 100, NULL, 'USDA FoodData Central · comparable raw beef rib', 'https://fdc.nal.usda.gov/food-details/169498/nutrients', '169498', 'low'),
    ('beef chest|beef cubes bone', 100, 128, 21.75, 0.16, 4.48, 0, 0, 80, 'per_100g', '100 g', 100, NULL, 'USDA FoodData Central · comparable raw beef chuck for stew', 'https://fdc.nal.usda.gov/food-details/171206/nutrients', '171206', 'medium'),
    ('^tail$', 100, 306, 16.53, 0, 26.10, 0, 0, 55, 'per_100g', '100 g', 100, NULL, 'USDA FoodData Central · comparable bone-in beef rib', 'https://fdc.nal.usda.gov/food-details/169498/nutrients', '169498', 'low'),
    ('lamb cubes', 100, 206, 18.64, 0.13, 14.52, 0, 0, 59, 'per_100g', '100 g', 100, NULL, 'USDA FoodData Central · comparable raw New Zealand lamb leg', 'https://fdc.nal.usda.gov/food-details/174342/nutrients', '174342', 'medium'),
    ('bouri fish', 100, 117, 19.35, 0, 3.79, 0, 0, 65, 'per_100g', '100 g', NULL, NULL, 'USDA FoodData Central · raw striped mullet', 'https://fdc.nal.usda.gov/food-details/175123/nutrients', '175123', 'high'),
    ('sea bass', 100, 97, 18.43, 0, 2, 0, 0, 68, 'per_100g', '100 g', NULL, NULL, 'USDA FoodData Central · raw sea bass', 'https://fdc.nal.usda.gov/food-details/175142/nutrients', '175142', 'high'),
    ('shredded tuna', 100, 116, 25.51, 0, 0.82, 0, 0, 50, 'per_100g', '100 g', NULL, NULL, 'USDA FoodData Central · comparable canned light tuna in water', 'https://fdc.nal.usda.gov/food-details/171986/nutrients', '171986', 'medium'),
    ('veal bone broth', 100, 7, 1.14, 0.04, 0.22, 0, 0, 372, 'per_100g', '100 g', NULL, NULL, 'USDA FoodData Central · comparable ready-to-serve beef broth', 'https://fdc.nal.usda.gov/food-details/171538/nutrients', '171538', 'low'),

    ('cadbury bubbly', 100, 534, 7.30, 57, 30, 2.10, 56, 96, 'per_100g', '100 g', NULL, NULL, 'Cadbury · comparable Dairy Milk label', 'https://www.cadbury.co.uk/products/cadbury-dairy-milk-chocolate-bar-850g/index.html', NULL, 'medium'),
    ('galaxy smooth milk chocolate', 100, 535, 7.65, 59.40, 29.66, 3.40, 51.50, 79, 'per_100g', '100 g', NULL, NULL, 'USDA FoodData Central · comparable milk chocolate', 'https://fdc.nal.usda.gov/food-details/167587/nutrients', '167587', 'medium'),
    ('dark chocolate', 100, 598, 7.79, 45.90, 42.63, 10.90, 23.99, 20, 'per_100g', '100 g', NULL, NULL, 'USDA FoodData Central · dark chocolate, 70–85% cacao', 'https://fdc.nal.usda.gov/food-details/170273/nutrients', '170273', 'medium'),
    ('doritos', 100, 519, 7.36, 60.81, 27.42, 5.10, 2.59, 691, 'per_100g', '100 g', NULL, NULL, 'USDA FoodData Central · comparable nacho cheese tortilla chips', 'https://fdc.nal.usda.gov/food-details/167559/nutrients', '167559', 'medium'),
    ('oman pofak', 100, 567, 5.46, 54.54, 36.54, 0.80, 3.57, 928, 'per_100g', '100 g', NULL, NULL, 'USDA FoodData Central · comparable cheese corn puffs', 'https://fdc.nal.usda.gov/food-details/167949/nutrients', '167949', 'medium'),
    ('moonshot', 100, 353, 5, 53.64, 13.96, 0.60, 33.36, 377, 'per_100g', '100 g', NULL, NULL, 'USDA FoodData Central · comparable commercially prepared pound cake', 'https://fdc.nal.usda.gov/food-details/172704/nutrients', '172704', 'low'),
    ('strawberry jam', 100, 278, 0.37, 68.86, 0.07, 1.10, 48.50, 32, 'per_100g', '100 g', NULL, NULL, 'USDA FoodData Central · comparable jam/preserve', 'https://fdc.nal.usda.gov/food-details/169641/nutrients', '169641', 'medium'),
    ('whole wheat tortilla', 100, 310, 9.76, 45.89, 9.76, 9.80, 2.44, 617, 'per_100g', '100 g', NULL, NULL, 'USDA FoodData Central · whole-wheat tortilla', 'https://fdc.nal.usda.gov/food-details/174081/nutrients', '174081', 'medium'),
    ('^tortilla$', 90, 287, 8.70, 49.60, 6, 2.40, 2.70, 898, 'per_100g', '100 g', 320, NULL, 'USDA FoodData Central · comparable flour tortilla', 'https://fdc.nal.usda.gov/food-details/175082/nutrients', '175082', 'medium'),
    ('baguette|^bread$', 80, 266, 8.85, 49.42, 3.33, 2.70, 5.67, 490, 'per_100g', '100 g', 28, NULL, 'USDA FoodData Central · commercially prepared white bread', 'https://fdc.nal.usda.gov/food-details/174924/nutrients', '174924', 'medium'),
    ('co-op corni|^pasta$', 100, 371, 13.04, 74.67, 1.51, 3.20, 2.67, 6, 'per_100g', '100 g', 500, NULL, 'USDA FoodData Central · dry enriched pasta', 'https://fdc.nal.usda.gov/food-details/169736/nutrients', '169736', 'medium'),
    ('^rice$|rice basmati', 100, 374, 7.51, 80.89, 1.03, 1.80, 0.33, 2, 'per_100g', '100 g dry', NULL, NULL, 'USDA FoodData Central · comparable dry long-grain rice', 'https://fdc.nal.usda.gov/food-details/169758/nutrients', '169758', 'medium'),

    ('cooking light cream', 100, 195, 2.96, 3.66, 19.10, 0, 3.67, 72, 'per_100ml', '100 ml', NULL, 1000, 'USDA FoodData Central · comparable light cream', 'https://fdc.nal.usda.gov/food-details/170857/nutrients', '170857', 'medium'),
    ('cream \(nestle\)', 100, 340, 2.84, 2.84, 36.08, 0, 2.92, 27, 'per_100ml', '100 ml', NULL, NULL, 'USDA FoodData Central · comparable heavy cream', 'https://fdc.nal.usda.gov/food-details/170859/nutrients', '170859', 'medium'),
    ('cow ghee', 100, 819, 0, 0, 91, 0, 0, 0, 'per_100ml', '100 ml', NULL, NULL, 'USDA FoodData Central · ghee; converted to volume', 'https://fdc.nal.usda.gov/food-details/171314/nutrients', '171314', 'medium'),
    ('koita non-hormone lactose|^whole milk$', 100, 61, 3.15, 4.80, 3.25, 0, 5.05, 43, 'per_100ml', '100 ml', NULL, 1000, 'USDA FoodData Central · comparable whole milk', 'https://fdc.nal.usda.gov/food-details/171265/nutrients', '171265', 'medium'),
    ('yoghurt', 100, 61, 3.47, 4.66, 3.25, 0, 4.66, 46, 'per_100g', '100 g', NULL, NULL, 'USDA FoodData Central · plain whole-milk yogurt', 'https://fdc.nal.usda.gov/food-details/171284/nutrients', '171284', 'medium'),
    ('low salt cheese', 100, 338, 25.05, 2.71, 25.02, 0, 0, 549, 'per_serving', '1 cup (estimated 113 g)', NULL, NULL, 'USDA FoodData Central · mozzarella estimate scaled to 1 cup', 'https://fdc.nal.usda.gov/food-details/170845/nutrients', '170845', 'low'),
    ('provolone', 100, 351, 25.58, 2.14, 26.62, 0, 0.56, 727, 'per_100g', '100 g', NULL, NULL, 'USDA FoodData Central · provolone cheese', 'https://fdc.nal.usda.gov/food-details/170850/nutrients', '170850', 'high'),
    ('mozzarella', 90, 299, 22.17, 2.40, 22.14, 0, 0, 486, 'per_100g', '100 g', 200, NULL, 'USDA FoodData Central · comparable whole-milk mozzarella', 'https://fdc.nal.usda.gov/food-details/170845/nutrients', '170845', 'medium'),
    ('cottage cheese', 100, 98, 11.12, 3.38, 4.30, 0, 2.67, 315, 'per_100g', '100 g', NULL, NULL, 'USDA FoodData Central · comparable creamed cottage cheese', 'https://fdc.nal.usda.gov/food-details/172179/nutrients', '172179', 'low'),

    ('golden kiwi', 100, 63, 1.02, 15.79, 0.28, 1.40, 12.30, 3, 'per_100g', '100 g', 69, NULL, 'USDA FoodData Central · SunGold kiwifruit', 'https://fdc.nal.usda.gov/food-details/168211/nutrients', '168211', 'high'),
    ('^kiwi$', 90, 61, 1.14, 14.66, 0.52, 3, 8.99, 3, 'per_100g', '100 g', 69, NULL, 'USDA FoodData Central · green kiwifruit', 'https://fdc.nal.usda.gov/food-details/168153/nutrients', '168153', 'high'),
    ('avocado', 90, 160, 2, 8.53, 14.66, 6.70, 0.66, 7, 'per_100g', '100 g', 150, NULL, 'USDA FoodData Central · raw avocado', 'https://fdc.nal.usda.gov/food-details/171705/nutrients', '171705', 'high'),
    ('banana', 90, 89, 1.09, 22.84, 0.33, 2.60, 12.23, 1, 'per_100g', '100 g', 118, NULL, 'USDA FoodData Central · raw banana', 'https://fdc.nal.usda.gov/food-details/173944/nutrients', '173944', 'high'),
    ('mango', 90, 60, 0.82, 14.98, 0.38, 1.60, 13.66, 1, 'per_100g', '100 g', 336, NULL, 'USDA FoodData Central · raw mango', 'https://fdc.nal.usda.gov/food-details/169910/nutrients', '169910', 'high'),
    ('pineapple', 90, 50, 0.54, 13.12, 0.12, 1.40, 9.85, 1, 'per_100g', '100 g', 905, NULL, 'USDA FoodData Central · raw pineapple', 'https://fdc.nal.usda.gov/food-details/169124/nutrients', '169124', 'high'),
    ('pomegranate', 90, 83, 1.67, 18.70, 1.17, 4, 13.67, 3, 'per_100g', '100 g', 282, NULL, 'USDA FoodData Central · raw pomegranate', 'https://fdc.nal.usda.gov/food-details/169134/nutrients', '169134', 'high'),
    ('rhumbtan|rhumbutan', 90, 82, 0.65, 20.87, 0.21, 0.90, 16.50, 11, 'per_100g', '100 g', 9, NULL, 'USDA FoodData Central · comparable canned rambutan', 'https://fdc.nal.usda.gov/food-details/168167/nutrients', '168167', 'low'),
    ('water melon', 100, 30, 0.61, 7.55, 0.15, 0.40, 6.20, 1, 'per_100g', '100 g', 3000, NULL, 'USDA FoodData Central · raw watermelon', 'https://fdc.nal.usda.gov/food-details/167765/nutrients', '167765', 'high'),
    ('white melon', 100, 36, 0.54, 9.09, 0.14, 0.80, 8.12, 18, 'per_100g', '100 g', 1000, NULL, 'USDA FoodData Central · comparable raw honeydew melon', 'https://fdc.nal.usda.gov/food-details/169911/nutrients', '169911', 'medium'),
    ('orange', 90, 47, 0.94, 11.75, 0.12, 2.40, 9.35, 0, 'per_100g', '100 g', 131, NULL, 'USDA FoodData Central · raw orange', 'https://fdc.nal.usda.gov/food-details/169097/nutrients', '169097', 'high'),
    ('cherry', 90, 63, 1.06, 16.01, 0.20, 2.10, 12.82, 0, 'per_100g', '100 g', 8, NULL, 'USDA FoodData Central · raw sweet cherry', 'https://fdc.nal.usda.gov/food-details/171719/nutrients', '171719', 'high'),
    ('lemon & lime', 100, 29, 1.10, 9.32, 0.30, 2.80, 2.50, 2, 'per_100g', '100 g', 58, NULL, 'USDA FoodData Central · comparable raw lemon', 'https://fdc.nal.usda.gov/food-details/167746/nutrients', '167746', 'medium'),
    ('lime \(green\)', 100, 30, 0.70, 10.54, 0.20, 2.80, 1.69, 2, 'per_100g', '100 g', 67, NULL, 'USDA FoodData Central · raw lime', 'https://fdc.nal.usda.gov/food-details/168155/nutrients', '168155', 'high'),

    ('baby asparagus', 100, 20, 2.20, 3.88, 0.12, 2.10, 1.88, 2, 'per_100g', '100 g', NULL, NULL, 'USDA FoodData Central · raw asparagus', 'https://fdc.nal.usda.gov/food-details/168389/nutrients', '168389', 'high'),
    ('basil', 90, 23, 3.15, 2.65, 0.64, 1.60, 0.30, 4, 'per_100g', '100 g', 30, NULL, 'USDA FoodData Central · fresh basil', 'https://fdc.nal.usda.gov/food-details/172232/nutrients', '172232', 'high'),
    ('beetroot', 90, 43, 1.61, 9.56, 0.17, 2.80, 6.76, 78, 'per_100g', '100 g', 82, NULL, 'USDA FoodData Central · raw beet', 'https://fdc.nal.usda.gov/food-details/169145/nutrients', '169145', 'high'),
    ('capsicum red', 100, 26, 0.99, 6.03, 0.30, 2.10, 4.20, 4, 'per_100g', '100 g', 500, NULL, 'USDA FoodData Central · raw sweet red pepper', 'https://fdc.nal.usda.gov/food-details/170108/nutrients', '170108', 'medium'),
    ('bell pepper|bell peppers|capsicum', 90, 26, 0.99, 6.03, 0.30, 2.10, 4.20, 4, 'per_100g', '100 g', 119, NULL, 'USDA FoodData Central · comparable raw sweet red pepper', 'https://fdc.nal.usda.gov/food-details/170108/nutrients', '170108', 'medium'),
    ('broccoli', 90, 34, 2.82, 6.64, 0.37, 2.60, 1.70, 33, 'per_100g', '100 g', 608, NULL, 'USDA FoodData Central · raw broccoli', 'https://fdc.nal.usda.gov/food-details/170379/nutrients', '170379', 'high'),
    ('cabbage', 90, 25, 1.28, 5.80, 0.10, 2.50, 3.20, 18, 'per_100g', '100 g', 908, NULL, 'USDA FoodData Central · raw cabbage', 'https://fdc.nal.usda.gov/food-details/169975/nutrients', '169975', 'high'),
    ('carrot', 90, 41, 0.93, 9.58, 0.24, 2.80, 4.74, 69, 'per_100g', '100 g', 61, NULL, 'USDA FoodData Central · raw carrot', 'https://fdc.nal.usda.gov/food-details/170393/nutrients', '170393', 'high'),
    ('cauliflower', 90, 25, 1.92, 4.97, 0.28, 2, 1.91, 30, 'per_100g', '100 g', 588, NULL, 'USDA FoodData Central · raw cauliflower', 'https://fdc.nal.usda.gov/food-details/169986/nutrients', '169986', 'high'),
    ('chill green', 90, 40, 2, 9.46, 0.20, 1.50, 5.10, 7, 'per_100g', '100 g', 15, NULL, 'USDA FoodData Central · raw green chili', 'https://fdc.nal.usda.gov/food-details/170497/nutrients', '170497', 'high'),
    ('corienda', 90, 23, 2.13, 3.67, 0.52, 2.80, 0.87, 46, 'per_100g', '100 g', 100, NULL, 'USDA FoodData Central · raw coriander leaves', 'https://fdc.nal.usda.gov/food-details/169997/nutrients', '169997', 'high'),
    ('corn kernel|sweet corn', 100, 67, 2.29, 14.34, 1.22, 2, 4.44, 205, 'per_100g', '100 g', NULL, NULL, 'USDA FoodData Central · canned sweet corn, drained', 'https://fdc.nal.usda.gov/food-details/169214/nutrients', '169214', 'medium'),
    ('^corn$', 90, 86, 3.27, 18.70, 1.35, 2, 6.26, 15, 'per_100g', '100 g', 102, NULL, 'USDA FoodData Central · raw sweet corn', 'https://fdc.nal.usda.gov/food-details/169998/nutrients', '169998', 'high'),
    ('dil', 90, 43, 3.46, 7.02, 1.12, 2.10, 0, 61, 'per_100g', '100 g', 100, NULL, 'USDA FoodData Central · fresh dill', 'https://fdc.nal.usda.gov/food-details/172233/nutrients', '172233', 'high'),
    ('egg plant|^eggplant$', 90, 25, 0.98, 5.88, 0.18, 3, 3.53, 2, 'per_100g', '100 g', 458, NULL, 'USDA FoodData Central · raw eggplant', 'https://fdc.nal.usda.gov/food-details/169228/nutrients', '169228', 'high'),
    ('white eggs|medium white eggs', 100, 143, 12.56, 0.72, 9.51, 0, 0.37, 142, 'per_100g', '100 g', 50, NULL, 'USDA FoodData Central · raw whole egg', 'https://fdc.nal.usda.gov/food-details/171287/nutrients', '171287', 'high'),
    ('garlic', 90, 149, 6.36, 33.06, 0.50, 2.10, 1, 17, 'per_100g', '100 g', 3, NULL, 'USDA FoodData Central · raw garlic', 'https://fdc.nal.usda.gov/food-details/169230/nutrients', '169230', 'high'),
    ('ginger', 90, 80, 1.82, 17.77, 0.75, 2, 1.70, 13, 'per_100g', '100 g', 20, NULL, 'USDA FoodData Central · raw ginger root', 'https://fdc.nal.usda.gov/food-details/169231/nutrients', '169231', 'high'),
    ('horse raddish', 90, 48, 1.18, 11.29, 0.69, 3.30, 7.99, 420, 'per_100g', '100 g', 30, NULL, 'USDA FoodData Central · prepared horseradish', 'https://fdc.nal.usda.gov/food-details/173472/nutrients', '173472', 'medium'),
    ('kale', 90, 35, 2.92, 4.42, 1.49, 4.10, 0.99, 53, 'per_100g', '100 g', NULL, NULL, 'USDA FoodData Central · raw kale', 'https://fdc.nal.usda.gov/food-details/168421/nutrients', '168421', 'high'),
    ('lettuce', 90, 15, 1.36, 2.87, 0.15, 1.30, 0.78, 28, 'per_100g', '100 g', 360, NULL, 'USDA FoodData Central · raw green leaf lettuce', 'https://fdc.nal.usda.gov/food-details/169249/nutrients', '169249', 'high'),
    ('mint', 90, 44, 3.29, 8.41, 0.73, 6.80, 0, 30, 'per_100g', '100 g', 100, NULL, 'USDA FoodData Central · fresh spearmint', 'https://fdc.nal.usda.gov/food-details/173475/nutrients', '173475', 'medium'),
    ('mushroom shitake', 90, 34, 2.24, 6.79, 0.49, 2.50, 2.38, 9, 'per_100g', '100 g', NULL, NULL, 'USDA FoodData Central · raw shiitake mushroom', 'https://fdc.nal.usda.gov/food-details/169242/nutrients', '169242', 'high'),
    ('onion red$|onion white$', 100, 40, 1.10, 9.34, 0.10, 1.70, 4.24, 4, 'per_100g', '100 g', 1000, NULL, 'USDA FoodData Central · raw onion; pack weight estimated', 'https://fdc.nal.usda.gov/food-details/170000/nutrients', '170000', 'low'),
    ('onions brown|onions red|red onion', 90, 40, 1.10, 9.34, 0.10, 1.70, 4.24, 4, 'per_100g', '100 g', 110, NULL, 'USDA FoodData Central · raw onion', 'https://fdc.nal.usda.gov/food-details/170000/nutrients', '170000', 'high'),
    ('parsley', 90, 36, 2.97, 6.33, 0.79, 3.30, 0.85, 56, 'per_100g', '100 g', 100, NULL, 'USDA FoodData Central · fresh parsley', 'https://fdc.nal.usda.gov/food-details/170416/nutrients', '170416', 'high'),
    ('potato$', 90, 77, 2.05, 17.49, 0.09, 2.10, 0.82, 6, 'per_100g', '100 g', 173, NULL, 'USDA FoodData Central · raw potato with skin', 'https://fdc.nal.usda.gov/food-details/170026/nutrients', '170026', 'high'),
    ('red raddish', 90, 16, 0.68, 3.40, 0.10, 1.60, 1.86, 39, 'per_100g', '100 g', 4.5, NULL, 'USDA FoodData Central · raw radish', 'https://fdc.nal.usda.gov/food-details/169276/nutrients', '169276', 'high'),
    ('spinach', 90, 23, 2.86, 3.63, 0.39, 2.20, 0.42, 79, 'per_100g', '100 g', NULL, NULL, 'USDA FoodData Central · raw spinach', 'https://fdc.nal.usda.gov/food-details/168462/nutrients', '168462', 'high'),
    ('spring onion', 90, 32, 1.83, 7.34, 0.19, 2.60, 2.33, 16, 'per_100g', '100 g', 100, NULL, 'USDA FoodData Central · raw spring onion', 'https://fdc.nal.usda.gov/food-details/170005/nutrients', '170005', 'high'),
    ('sweet potatoes', 90, 86, 1.57, 20.12, 0.05, 3, 4.18, 55, 'per_100g', '100 g', 130, NULL, 'USDA FoodData Central · raw sweet potato', 'https://fdc.nal.usda.gov/food-details/168482/nutrients', '168482', 'high'),
    ('tomato', 20, 18, 0.88, 3.89, 0.20, 1.20, 2.63, 5, 'per_100g', '100 g', 123, NULL, 'USDA FoodData Central · raw tomato', 'https://fdc.nal.usda.gov/food-details/170457/nutrients', '170457', 'high'),
    ('water crest', 90, 11, 2.30, 1.29, 0.10, 0.50, 0.20, 41, 'per_100g', '100 g', NULL, NULL, 'USDA FoodData Central · raw watercress', 'https://fdc.nal.usda.gov/food-details/170068/nutrients', '170068', 'high'),

    ('chickpeas', 90, 139, 7.05, 22.53, 2.77, 6.40, 4.01, 246, 'per_100g', '100 g drained', NULL, NULL, 'USDA FoodData Central · canned chickpeas, drained', 'https://fdc.nal.usda.gov/food-details/173800/nutrients', '173800', 'medium'),
    ('red kidney beans', 90, 84, 5.22, 14.50, 0.60, 4.30, 1.85, 296, 'per_100g', '100 g', NULL, NULL, 'USDA FoodData Central · canned kidney beans', 'https://fdc.nal.usda.gov/food-details/173741/nutrients', '173741', 'medium'),
    ('cumin powder', 90, 375, 17.81, 44.24, 22.27, 10.50, 2.25, 168, 'per_100g', '100 g', NULL, NULL, 'USDA FoodData Central · cumin seed comparable', 'https://fdc.nal.usda.gov/food-details/170923/nutrients', '170923', 'medium'),
    ('sweet paprika', 90, 282, 14.14, 53.99, 12.89, 34.90, 10.34, 68, 'per_100g', '100 g', NULL, NULL, 'USDA FoodData Central · paprika', 'https://fdc.nal.usda.gov/food-details/171329/nutrients', '171329', 'high'),
    ('meat seasoning|seven spices', 90, 322, 4.50, 58, 0, 13.30, 10.83, 7203, 'per_100g', '100 g', NULL, NULL, 'USDA FoodData Central · comparable dry seasoning mix', 'https://fdc.nal.usda.gov/food-details/172243/nutrients', '172243', 'low'),
    ('nezo refined salt|^salt$', 100, 0, 0, 0, 0, 0, 0, 38758, 'per_100g', '100 g', 600, NULL, 'USDA FoodData Central · table salt', 'https://fdc.nal.usda.gov/food-details/173468/nutrients', '173468', 'high')
),
matched AS (
  SELECT
    i.id,
    p.calories,
    p.protein,
    p.carbs,
    p.fat,
    p.fiber,
    p.sugar,
    p.sodium,
    p.basis,
    p.serving_size,
    p.grams_per_unit,
    p.ml_per_unit,
    p.source,
    p.source_url,
    p.source_id,
    p.confidence
  FROM public.items i
  CROSS JOIN LATERAL (
    SELECT *
    FROM profiles candidate
    WHERE i.name ~* candidate.pattern
    ORDER BY candidate.priority DESC
    LIMIT 1
  ) p
)
UPDATE public.items i
SET
  calories_per_unit = m.calories,
  protein_g = m.protein,
  carbs_g = m.carbs,
  fat_g = m.fat,
  fiber_g = m.fiber,
  sugar_g = m.sugar,
  sodium_mg = m.sodium,
  nutrition_basis = m.basis,
  serving_size = m.serving_size,
  nutrition_grams_per_unit = m.grams_per_unit,
  nutrition_ml_per_unit = m.ml_per_unit,
  nutrition_source = m.source,
  nutrition_source_url = m.source_url,
  nutrition_source_id = m.source_id,
  nutrition_estimated = true,
  nutrition_confidence = m.confidence,
  nutrition_updated_at = now()
FROM matched m
WHERE i.id = m.id;

-- Two entries cannot be responsibly inferred from their current catalog names.
-- Keep them visible in the review queue rather than fabricating precise values.
UPDATE public.items
SET
  nutrition_source = 'Needs a package label or clearer item name',
  nutrition_source_url = NULL,
  nutrition_source_id = NULL,
  nutrition_estimated = true,
  nutrition_confidence = 'needs_review',
  nutrition_updated_at = now()
WHERE name ~* '^(fvdvgerg|mix shawarma liquid \(maggi\))$';

COMMENT ON COLUMN public.items.nutrition_source IS
  'Human-readable origin of the current nutrition values.';
COMMENT ON COLUMN public.items.nutrition_source_url IS
  'Optional public source page for the current nutrition values.';
COMMENT ON COLUMN public.items.nutrition_estimated IS
  'True when values are reference estimates rather than user-confirmed package values.';
COMMENT ON COLUMN public.items.nutrition_grams_per_unit IS
  'Estimated edible grams in one piece, pack, head, bundle or other discrete unit.';
COMMENT ON COLUMN public.items.nutrition_ml_per_unit IS
  'Estimated millilitres in one discrete container/unit.';