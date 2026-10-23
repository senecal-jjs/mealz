// Every recipe in the catalog. `npm run catalog:validate` fails if a file in recipes/ is missing here.
import type { Ingredient, RecipeSource } from '@/catalog/types';

import ingredientsJson from './ingredients.json';
import bbqChickenSheetPan from './recipes/bbq-chicken-sheet-pan.json';
import beefBroccoliStirFry from './recipes/beef-broccoli-stir-fry.json';
import blackBeanBurgers from './recipes/black-bean-burgers.json';
import blackBeanTacosLimeSlaw from './recipes/black-bean-tacos-lime-slaw.json';
import capresePasta from './recipes/caprese-pasta.json';
import cauliflowerFriedRice from './recipes/cauliflower-fried-rice.json';
import chanaMasala from './recipes/chana-masala.json';
import cheesyBroccoliOrzo from './recipes/cheesy-broccoli-orzo.json';
import chickenBroccoliAlfredo from './recipes/chicken-broccoli-alfredo.json';
import chickenCaesarWraps from './recipes/chicken-caesar-wraps.json';
import chickenPestoPasta from './recipes/chicken-pesto-pasta.json';
import chickenShawarmaBowls from './recipes/chicken-shawarma-bowls.json';
import chickenTikkaMasala from './recipes/chicken-tikka-masala.json';
import chickpeaCoconutCurry from './recipes/chickpea-coconut-curry.json';
import classicBeefTacos from './recipes/classic-beef-tacos.json';
import cobbSalad from './recipes/cobb-salad.json';
import coconutRedLentilDal from './recipes/coconut-red-lentil-dal.json';
import codTomatoesOlives from './recipes/cod-tomatoes-olives.json';
import creamyMushroomGnocchi from './recipes/creamy-mushroom-gnocchi.json';
import fajitaCauliflowerRiceBowls from './recipes/fajita-cauliflower-rice-bowls.json';
import garlicButterShrimpZucchini from './recipes/garlic-butter-shrimp-zucchini.json';
import greekHummusWraps from './recipes/greek-hummus-wraps.json';
import greekLemonChickenPotatoes from './recipes/greek-lemon-chicken-potatoes.json';
import greenCurryVegetables from './recipes/green-curry-vegetables.json';
import honeyMustardPorkChops from './recipes/honey-mustard-pork-chops.json';
import koreanBeefBowls from './recipes/korean-beef-bowls.json';
import kungPaoChicken from './recipes/kung-pao-chicken.json';
import lemonGarlicSalmonGreenBeans from './recipes/lemon-garlic-salmon-green-beans.json';
import lemonHerbChickenAsparagus from './recipes/lemon-herb-chicken-asparagus.json';
import lentilSloppyJoes from './recipes/lentil-sloppy-joes.json';
import lentilSpinachSoup from './recipes/lentil-spinach-soup.json';
import loadedSweetPotatoes from './recipes/loaded-sweet-potatoes.json';
import margheritaPitaPizzas from './recipes/margherita-pita-pizzas.json';
import mediterraneanQuinoaBowls from './recipes/mediterranean-quinoa-bowls.json';
import misoSalmonBokChoy from './recipes/miso-salmon-bok-choy.json';
import mushroomBlackBeanQuesadillas from './recipes/mushroom-black-bean-quesadillas.json';
import mushroomStroganoff from './recipes/mushroom-stroganoff.json';
import peanutNoodles from './recipes/peanut-noodles.json';
import pestoVeggieFlatbreads from './recipes/pesto-veggie-flatbreads.json';
import porkGreenBeanStirFry from './recipes/pork-green-bean-stir-fry.json';
import quickBolognese from './recipes/quick-bolognese.json';
import quickMinestrone from './recipes/quick-minestrone.json';
import salmonTeriyakiBowls from './recipes/salmon-teriyaki-bowls.json';
import sausagePeppersSheetPan from './recipes/sausage-peppers-sheet-pan.json';
import shakshuka from './recipes/shakshuka.json';
import sheetPanChickenFajitas from './recipes/sheet-pan-chicken-fajitas.json';
import shrimpFriedRice from './recipes/shrimp-fried-rice.json';
import shrimpScampiPasta from './recipes/shrimp-scampi-pasta.json';
import shrimpTacosMangoSalsa from './recipes/shrimp-tacos-mango-salsa.json';
import spaghettiAglioOlioSpinach from './recipes/spaghetti-aglio-olio-spinach.json';
import spinachFetaOmelette from './recipes/spinach-feta-omelette.json';
import steakChimichurriZucchini from './recipes/steak-chimichurri-zucchini.json';
import sweetPotatoBlackBeanChili from './recipes/sweet-potato-black-bean-chili.json';
import teriyakiTofuBokChoy from './recipes/teriyaki-tofu-bok-choy.json';
import thaiBasilChicken from './recipes/thai-basil-chicken.json';
import tofuScrambleTacos from './recipes/tofu-scramble-tacos.json';
import tomatoSoupGrilledCheese from './recipes/tomato-soup-grilled-cheese.json';
import tunaNicoiseSalad from './recipes/tuna-nicoise-salad.json';
import turkeyMeatballsMarinara from './recipes/turkey-meatballs-marinara.json';
import turkeyTacoLettuceWraps from './recipes/turkey-taco-lettuce-wraps.json';

export const ingredientSources = ingredientsJson as Ingredient[];

export const recipeSources = [
  bbqChickenSheetPan,
  beefBroccoliStirFry,
  blackBeanBurgers,
  blackBeanTacosLimeSlaw,
  capresePasta,
  cauliflowerFriedRice,
  chanaMasala,
  cheesyBroccoliOrzo,
  chickenBroccoliAlfredo,
  chickenCaesarWraps,
  chickenPestoPasta,
  chickenShawarmaBowls,
  chickenTikkaMasala,
  chickpeaCoconutCurry,
  classicBeefTacos,
  cobbSalad,
  coconutRedLentilDal,
  codTomatoesOlives,
  creamyMushroomGnocchi,
  fajitaCauliflowerRiceBowls,
  garlicButterShrimpZucchini,
  greekHummusWraps,
  greekLemonChickenPotatoes,
  greenCurryVegetables,
  honeyMustardPorkChops,
  koreanBeefBowls,
  kungPaoChicken,
  lemonGarlicSalmonGreenBeans,
  lemonHerbChickenAsparagus,
  lentilSloppyJoes,
  lentilSpinachSoup,
  loadedSweetPotatoes,
  margheritaPitaPizzas,
  mediterraneanQuinoaBowls,
  misoSalmonBokChoy,
  mushroomBlackBeanQuesadillas,
  mushroomStroganoff,
  peanutNoodles,
  pestoVeggieFlatbreads,
  porkGreenBeanStirFry,
  quickBolognese,
  quickMinestrone,
  salmonTeriyakiBowls,
  sausagePeppersSheetPan,
  shakshuka,
  sheetPanChickenFajitas,
  shrimpFriedRice,
  shrimpScampiPasta,
  shrimpTacosMangoSalsa,
  spaghettiAglioOlioSpinach,
  spinachFetaOmelette,
  steakChimichurriZucchini,
  sweetPotatoBlackBeanChili,
  teriyakiTofuBokChoy,
  thaiBasilChicken,
  tofuScrambleTacos,
  tomatoSoupGrilledCheese,
  tunaNicoiseSalad,
  turkeyMeatballsMarinara,
  turkeyTacoLettuceWraps,
] as RecipeSource[];
