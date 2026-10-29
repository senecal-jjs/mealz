// Every recipe in the catalog. `npm run catalog:validate` fails if a file in recipes/ is missing here.
import type { Ingredient, RecipeSource } from '@/catalog/types';

import ingredientsJson from './ingredients.json';
import alooGobi from './recipes/aloo-gobi.json';
import bakedFetaPasta from './recipes/baked-feta-pasta.json';
import balsamicCapreseChicken from './recipes/balsamic-caprese-chicken.json';
import bananaOatPancakes from './recipes/banana-oat-pancakes.json';
import bbqChickenFlatbreads from './recipes/bbq-chicken-flatbreads.json';
import bbqChickenSheetPan from './recipes/bbq-chicken-sheet-pan.json';
import beanRiceBurritos from './recipes/bean-rice-burritos.json';
import beefBroccoliStirFry from './recipes/beef-broccoli-stir-fry.json';
import beefKoftaTzatziki from './recipes/beef-kofta-tzatziki.json';
import beefRiceStuffedPeppers from './recipes/beef-rice-stuffed-peppers.json';
import blackBeanBurgers from './recipes/black-bean-burgers.json';
import blackBeanTacosLimeSlaw from './recipes/black-bean-tacos-lime-slaw.json';
import blackenedSalmonAvocadoSalsa from './recipes/blackened-salmon-avocado-salsa.json';
import broccoliCheddarFrittata from './recipes/broccoli-cheddar-frittata.json';
import cajunShrimpCornSkillet from './recipes/cajun-shrimp-corn-skillet.json';
import capresePasta from './recipes/caprese-pasta.json';
import carrotGingerSoup from './recipes/carrot-ginger-soup.json';
import cauliflowerFriedRice from './recipes/cauliflower-fried-rice.json';
import chanaMasala from './recipes/chana-masala.json';
import cheesyBroccoliOrzo from './recipes/cheesy-broccoli-orzo.json';
import chickenBroccoliAlfredo from './recipes/chicken-broccoli-alfredo.json';
import chickenBurritoBowls from './recipes/chicken-burrito-bowls.json';
import chickenCaesarWraps from './recipes/chicken-caesar-wraps.json';
import chickenEnchiladaSkillet from './recipes/chicken-enchilada-skillet.json';
import chickenPestoPasta from './recipes/chicken-pesto-pasta.json';
import chickenPiccata from './recipes/chicken-piccata.json';
import chickenSatayRice from './recipes/chicken-satay-rice.json';
import chickenShawarmaBowls from './recipes/chicken-shawarma-bowls.json';
import chickenSouvlakiPitas from './recipes/chicken-souvlaki-pitas.json';
import chickenTikkaMasala from './recipes/chicken-tikka-masala.json';
import chickenTortillaSoup from './recipes/chicken-tortilla-soup.json';
import chickpeaCoconutCurry from './recipes/chickpea-coconut-curry.json';
import classicBeefTacos from './recipes/classic-beef-tacos.json';
import cobbSalad from './recipes/cobb-salad.json';
import coconutRedLentilDal from './recipes/coconut-red-lentil-dal.json';
import coconutShrimpCurry from './recipes/coconut-shrimp-curry.json';
import codTomatoesOlives from './recipes/cod-tomatoes-olives.json';
import creamyMushroomGnocchi from './recipes/creamy-mushroom-gnocchi.json';
import crispyFishTacos from './recipes/crispy-fish-tacos.json';
import eggRollInABowl from './recipes/egg-roll-in-a-bowl.json';
import fajitaCauliflowerRiceBowls from './recipes/fajita-cauliflower-rice-bowls.json';
import garlicButterShrimpZucchini from './recipes/garlic-butter-shrimp-zucchini.json';
import garlicGingerTofuBroccoli from './recipes/garlic-ginger-tofu-broccoli.json';
import garlicShrimpBroccoli from './recipes/garlic-shrimp-broccoli.json';
import garlicShrimpWhiteBeans from './recipes/garlic-shrimp-white-beans.json';
import garlickyEggplantStirFry from './recipes/garlicky-eggplant-stir-fry.json';
import greekChickenSalad from './recipes/greek-chicken-salad.json';
import greekHummusWraps from './recipes/greek-hummus-wraps.json';
import greekLemonChickenPotatoes from './recipes/greek-lemon-chicken-potatoes.json';
import greenCurryVegetables from './recipes/green-curry-vegetables.json';
import honeyGarlicChickenRice from './recipes/honey-garlic-chicken-rice.json';
import honeyMustardPorkChops from './recipes/honey-mustard-pork-chops.json';
import huevosRancheros from './recipes/huevos-rancheros.json';
import koreanBeefBowls from './recipes/korean-beef-bowls.json';
import kungPaoChicken from './recipes/kung-pao-chicken.json';
import lemonChickenOrzoSoup from './recipes/lemon-chicken-orzo-soup.json';
import lemonGarlicSalmonGreenBeans from './recipes/lemon-garlic-salmon-green-beans.json';
import lemonHerbChickenAsparagus from './recipes/lemon-herb-chicken-asparagus.json';
import lemonRicottaPastaPeas from './recipes/lemon-ricotta-pasta-peas.json';
import lentilSloppyJoes from './recipes/lentil-sloppy-joes.json';
import lentilSpinachSoup from './recipes/lentil-spinach-soup.json';
import loadedSweetPotatoes from './recipes/loaded-sweet-potatoes.json';
import margheritaPitaPizzas from './recipes/margherita-pita-pizzas.json';
import mediterraneanQuinoaBowls from './recipes/mediterranean-quinoa-bowls.json';
import misoSalmonBokChoy from './recipes/miso-salmon-bok-choy.json';
import moroccanChickpeaStew from './recipes/moroccan-chickpea-stew.json';
import mushroomBlackBeanQuesadillas from './recipes/mushroom-black-bean-quesadillas.json';
import mushroomStroganoff from './recipes/mushroom-stroganoff.json';
import onePotTomatoBasilSpaghetti from './recipes/one-pot-tomato-basil-spaghetti.json';
import pastaECeci from './recipes/pasta-e-ceci.json';
import peaParmesanRisotto from './recipes/pea-parmesan-risotto.json';
import peanutNoodles from './recipes/peanut-noodles.json';
import pestoSalmonTomatoes from './recipes/pesto-salmon-tomatoes.json';
import pestoVeggieFlatbreads from './recipes/pesto-veggie-flatbreads.json';
import pineappleTofuFriedRice from './recipes/pineapple-tofu-fried-rice.json';
import porkChopsApples from './recipes/pork-chops-apples.json';
import porkGreenBeanStirFry from './recipes/pork-green-bean-stir-fry.json';
import potatoHashFriedEggs from './recipes/potato-hash-fried-eggs.json';
import quickBolognese from './recipes/quick-bolognese.json';
import quickMinestrone from './recipes/quick-minestrone.json';
import redLentilBolognese from './recipes/red-lentil-bolognese.json';
import roastedCauliflowerChickpeas from './recipes/roasted-cauliflower-chickpeas.json';
import salmonCouscousBowls from './recipes/salmon-couscous-bowls.json';
import salmonTeriyakiBowls from './recipes/salmon-teriyaki-bowls.json';
import sausagePeppersSheetPan from './recipes/sausage-peppers-sheet-pan.json';
import sesameSobaNoodles from './recipes/sesame-soba-noodles.json';
import sesameTofuSnapPeas from './recipes/sesame-tofu-snap-peas.json';
import shakshuka from './recipes/shakshuka.json';
import sheetPanChickenFajitas from './recipes/sheet-pan-chicken-fajitas.json';
import sheetPanGnocchiVegetables from './recipes/sheet-pan-gnocchi-vegetables.json';
import shrimpCaesarSalad from './recipes/shrimp-caesar-salad.json';
import shrimpFriedRice from './recipes/shrimp-fried-rice.json';
import shrimpSausageJambalaya from './recipes/shrimp-sausage-jambalaya.json';
import shrimpScampiPasta from './recipes/shrimp-scampi-pasta.json';
import shrimpTacosMangoSalsa from './recipes/shrimp-tacos-mango-salsa.json';
import smashedChickpeaSandwiches from './recipes/smashed-chickpea-sandwiches.json';
import smokyBlackBeanSoup from './recipes/smoky-black-bean-soup.json';
import spaghettiAglioOlioSpinach from './recipes/spaghetti-aglio-olio-spinach.json';
import spinachFetaOmelette from './recipes/spinach-feta-omelette.json';
import steakArugulaSalad from './recipes/steak-arugula-salad.json';
import steakChimichurriZucchini from './recipes/steak-chimichurri-zucchini.json';
import stovetopMacCheese from './recipes/stovetop-mac-cheese.json';
import sweetPotatoBlackBeanChili from './recipes/sweet-potato-black-bean-chili.json';
import teriyakiChickenUdon from './recipes/teriyaki-chicken-udon.json';
import teriyakiTofuBokChoy from './recipes/teriyaki-tofu-bok-choy.json';
import thaiBasilChicken from './recipes/thai-basil-chicken.json';
import tofuPadThai from './recipes/tofu-pad-thai.json';
import tofuScrambleTacos from './recipes/tofu-scramble-tacos.json';
import tomatoSoupGrilledCheese from './recipes/tomato-soup-grilled-cheese.json';
import tunaMelts from './recipes/tuna-melts.json';
import tunaNicoiseSalad from './recipes/tuna-nicoise-salad.json';
import tunaTomatoSpaghetti from './recipes/tuna-tomato-spaghetti.json';
import turkeyBurgersSweetPotatoWedges from './recipes/turkey-burgers-sweet-potato-wedges.json';
import turkeyChiliBakedPotatoes from './recipes/turkey-chili-baked-potatoes.json';
import turkeyMeatballsMarinara from './recipes/turkey-meatballs-marinara.json';
import turkeyTacoLettuceWraps from './recipes/turkey-taco-lettuce-wraps.json';
import tuscanWhiteBeanKaleSoup from './recipes/tuscan-white-bean-kale-soup.json';
import vegetableLoMein from './recipes/vegetable-lo-mein.json';
import veggieNaanPizzas from './recipes/veggie-naan-pizzas.json';
import zucchiniFetaFritters from './recipes/zucchini-feta-fritters.json';

export const ingredientSources = ingredientsJson as Ingredient[];

export const recipeSources = [
  alooGobi,
  bakedFetaPasta,
  balsamicCapreseChicken,
  bananaOatPancakes,
  bbqChickenFlatbreads,
  bbqChickenSheetPan,
  beanRiceBurritos,
  beefBroccoliStirFry,
  beefKoftaTzatziki,
  beefRiceStuffedPeppers,
  blackBeanBurgers,
  blackBeanTacosLimeSlaw,
  blackenedSalmonAvocadoSalsa,
  broccoliCheddarFrittata,
  cajunShrimpCornSkillet,
  capresePasta,
  carrotGingerSoup,
  cauliflowerFriedRice,
  chanaMasala,
  cheesyBroccoliOrzo,
  chickenBroccoliAlfredo,
  chickenBurritoBowls,
  chickenCaesarWraps,
  chickenEnchiladaSkillet,
  chickenPestoPasta,
  chickenPiccata,
  chickenSatayRice,
  chickenShawarmaBowls,
  chickenSouvlakiPitas,
  chickenTikkaMasala,
  chickenTortillaSoup,
  chickpeaCoconutCurry,
  classicBeefTacos,
  cobbSalad,
  coconutRedLentilDal,
  coconutShrimpCurry,
  codTomatoesOlives,
  creamyMushroomGnocchi,
  crispyFishTacos,
  eggRollInABowl,
  fajitaCauliflowerRiceBowls,
  garlicButterShrimpZucchini,
  garlicGingerTofuBroccoli,
  garlicShrimpBroccoli,
  garlicShrimpWhiteBeans,
  garlickyEggplantStirFry,
  greekChickenSalad,
  greekHummusWraps,
  greekLemonChickenPotatoes,
  greenCurryVegetables,
  honeyGarlicChickenRice,
  honeyMustardPorkChops,
  huevosRancheros,
  koreanBeefBowls,
  kungPaoChicken,
  lemonChickenOrzoSoup,
  lemonGarlicSalmonGreenBeans,
  lemonHerbChickenAsparagus,
  lemonRicottaPastaPeas,
  lentilSloppyJoes,
  lentilSpinachSoup,
  loadedSweetPotatoes,
  margheritaPitaPizzas,
  mediterraneanQuinoaBowls,
  misoSalmonBokChoy,
  moroccanChickpeaStew,
  mushroomBlackBeanQuesadillas,
  mushroomStroganoff,
  onePotTomatoBasilSpaghetti,
  pastaECeci,
  peaParmesanRisotto,
  peanutNoodles,
  pestoSalmonTomatoes,
  pestoVeggieFlatbreads,
  pineappleTofuFriedRice,
  porkChopsApples,
  porkGreenBeanStirFry,
  potatoHashFriedEggs,
  quickBolognese,
  quickMinestrone,
  redLentilBolognese,
  roastedCauliflowerChickpeas,
  salmonCouscousBowls,
  salmonTeriyakiBowls,
  sausagePeppersSheetPan,
  sesameSobaNoodles,
  sesameTofuSnapPeas,
  shakshuka,
  sheetPanChickenFajitas,
  sheetPanGnocchiVegetables,
  shrimpCaesarSalad,
  shrimpFriedRice,
  shrimpSausageJambalaya,
  shrimpScampiPasta,
  shrimpTacosMangoSalsa,
  smashedChickpeaSandwiches,
  smokyBlackBeanSoup,
  spaghettiAglioOlioSpinach,
  spinachFetaOmelette,
  steakArugulaSalad,
  steakChimichurriZucchini,
  stovetopMacCheese,
  sweetPotatoBlackBeanChili,
  teriyakiChickenUdon,
  teriyakiTofuBokChoy,
  thaiBasilChicken,
  tofuPadThai,
  tofuScrambleTacos,
  tomatoSoupGrilledCheese,
  tunaMelts,
  tunaNicoiseSalad,
  tunaTomatoSpaghetti,
  turkeyBurgersSweetPotatoWedges,
  turkeyChiliBakedPotatoes,
  turkeyMeatballsMarinara,
  turkeyTacoLettuceWraps,
  tuscanWhiteBeanKaleSoup,
  vegetableLoMein,
  veggieNaanPizzas,
  zucchiniFetaFritters,
] as RecipeSource[];
