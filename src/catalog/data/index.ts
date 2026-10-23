// Every recipe in the catalog. `npm run catalog:validate` fails if a file in recipes/ is missing here.
import type { Ingredient, RecipeSource } from '@/catalog/types';

import ingredientsJson from './ingredients.json';
import beefBroccoliStirFry from './recipes/beef-broccoli-stir-fry.json';
import blackBeanTacosLimeSlaw from './recipes/black-bean-tacos-lime-slaw.json';
import capresePasta from './recipes/caprese-pasta.json';
import chickenPestoPasta from './recipes/chicken-pesto-pasta.json';
import chickpeaCoconutCurry from './recipes/chickpea-coconut-curry.json';
import creamyMushroomGnocchi from './recipes/creamy-mushroom-gnocchi.json';
import greekLemonChickenPotatoes from './recipes/greek-lemon-chicken-potatoes.json';
import honeyMustardPorkChops from './recipes/honey-mustard-pork-chops.json';
import lemonGarlicSalmonGreenBeans from './recipes/lemon-garlic-salmon-green-beans.json';
import lentilSpinachSoup from './recipes/lentil-spinach-soup.json';
import mediterraneanQuinoaBowls from './recipes/mediterranean-quinoa-bowls.json';
import peanutNoodles from './recipes/peanut-noodles.json';
import shakshuka from './recipes/shakshuka.json';
import sheetPanChickenFajitas from './recipes/sheet-pan-chicken-fajitas.json';
import shrimpFriedRice from './recipes/shrimp-fried-rice.json';
import steakChimichurriZucchini from './recipes/steak-chimichurri-zucchini.json';
import sweetPotatoBlackBeanChili from './recipes/sweet-potato-black-bean-chili.json';
import teriyakiTofuBokChoy from './recipes/teriyaki-tofu-bok-choy.json';
import thaiBasilChicken from './recipes/thai-basil-chicken.json';
import turkeyTacoLettuceWraps from './recipes/turkey-taco-lettuce-wraps.json';

export const ingredientSources = ingredientsJson as Ingredient[];

export const recipeSources = [
  beefBroccoliStirFry,
  blackBeanTacosLimeSlaw,
  capresePasta,
  chickenPestoPasta,
  chickpeaCoconutCurry,
  creamyMushroomGnocchi,
  greekLemonChickenPotatoes,
  honeyMustardPorkChops,
  lemonGarlicSalmonGreenBeans,
  lentilSpinachSoup,
  mediterraneanQuinoaBowls,
  peanutNoodles,
  shakshuka,
  sheetPanChickenFajitas,
  shrimpFriedRice,
  steakChimichurriZucchini,
  sweetPotatoBlackBeanChili,
  teriyakiTofuBokChoy,
  thaiBasilChicken,
  turkeyTacoLettuceWraps,
] as RecipeSource[];
