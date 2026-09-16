// Contenuti dimostrativi bilingui: ingredienti, prezzi e allergeni non
// rappresentano il menu verificato di un locale reale.
type Dish={name_it:string;name_en:string;description_it:string;description_en:string;price_cents:number;allergens:string[];dietary:string[]};
const dish=(name_it:string,name_en:string,description_it:string,description_en:string,price_cents:number,allergens:string[],dietary:string[]=[]):Dish=>({name_it,name_en,description_it,description_en,price_cents,allergens,dietary});
export const demoMenus=[
 [
  {name_it:'Antipasti',name_en:'Starters',items:[
   dish('Bruschette al pomodoro','Tomato bruschetta','Pane tostato, pomodoro e basilico.','Toasted bread, tomatoes and basil.',600,['1'],['vegan']),
   dish('Parmigiana di melanzane','Aubergine parmigiana','Melanzane, pomodoro, mozzarella e basilico.','Aubergines, tomato, mozzarella and basil.',900,['7'],['vegetarian']),
   dish('Tagliere della casa','House sharing board','Salumi, formaggi e pane caldo.','Cured meats, cheeses and warm bread.',1600,['1','7']),
   dish('Insalata di polpo','Octopus salad','Polpo, patate, prezzemolo e limone.','Octopus, potatoes, parsley and lemon.',1400,['14']),
   dish('Fiori di zucca ripieni','Stuffed courgette flowers','Fiori di zucca, ricotta e pastella croccante.','Courgette flowers, ricotta and a crisp batter.',1000,['1','7'],['vegetarian']),
   dish('Caprese di bufala','Buffalo mozzarella caprese','Mozzarella di bufala, pomodoro e basilico.','Buffalo mozzarella, tomatoes and basil.',1200,['7'],['vegetarian'])
  ]},
  {name_it:'Primi',name_en:'First courses',items:[
   dish('Spaghetti al pomodoro','Spaghetti with tomato','Pomodoro, basilico fresco e olio extravergine.','Tomatoes, fresh basil and extra virgin olive oil.',1000,['1'],['vegan']),
   dish('Genovese napoletana','Neapolitan onion ragù','Pasta con ragù di manzo e cipolle a cottura lenta.','Pasta with slow-cooked beef and onion ragù.',1400,['1','9']),
   dish('Linguine alle vongole','Clam linguine','Vongole, aglio, prezzemolo e olio extravergine.','Clams, garlic, parsley and extra virgin olive oil.',1800,['1','14']),
   dish('Risotto al limone','Lemon risotto','Riso, limone, burro e parmigiano.','Rice, lemon, butter and Parmesan.',1300,['7'],['vegetarian']),
   dish('Gnocchi alla sorrentina','Sorrento-style gnocchi','Gnocchi, pomodoro e mozzarella al forno.','Baked gnocchi with tomato and mozzarella.',1300,['1','7'],['vegetarian']),
   dish('Pasta e fagioli','Pasta and beans','Pasta mista, fagioli e verdure.','Mixed pasta, beans and vegetables.',1100,['1','9'],['vegan'])
  ]},
  {name_it:'Secondi',name_en:'Main courses',items:[
   dish('Polpo alla griglia','Grilled octopus','Polpo grigliato su crema di patate.','Grilled octopus on a potato cream.',2000,['7','14']),
   dish('Polpette al sugo','Meatballs in tomato sauce','Polpette di manzo con pane, uovo e parmigiano.','Beef meatballs with bread, egg and Parmesan.',1400,['1','3','7']),
   dish('Orata al cartoccio','Sea bream in parchment','Orata, pomodorini, olive e limone.','Sea bream, cherry tomatoes, olives and lemon.',2200,['4']),
   dish('Tagliata di manzo','Sliced grilled beef','Manzo alla griglia con rucola e parmigiano.','Grilled beef with rocket and Parmesan.',2300,['7']),
   dish('Melanzane ripiene','Stuffed aubergines','Melanzane, pane, pomodoro e formaggio.','Aubergines, bread, tomatoes and cheese.',1300,['1','7'],['vegetarian']),
   dish('Calamari fritti','Fried squid','Calamari in farina, fritti e serviti con limone.','Floured squid, fried and served with lemon.',1900,['1','14'])
  ]},
  {name_it:'Contorni',name_en:'Sides',items:[
   dish('Patate al forno','Roast potatoes','Patate, rosmarino e olio extravergine.','Potatoes, rosemary and extra virgin olive oil.',500,[],['vegan']),
   dish('Scarola stufata','Braised escarole','Scarola, olive, capperi e aglio.','Escarole, olives, capers and garlic.',600,[],['vegan']),
   dish('Verdure alla griglia','Grilled vegetables','Verdure di stagione e olio extravergine.','Seasonal vegetables and extra virgin olive oil.',600,[],['vegan']),
   dish('Insalata mista','Mixed salad','Lattuga, pomodori e carote.','Lettuce, tomatoes and carrots.',500,[],['vegan']),
   dish('Friarielli saltati','Sautéed broccoli rabe','Friarielli, aglio e peperoncino.','Broccoli rabe, garlic and chilli.',600,[],['vegan','spicy'])
  ]},
  {name_it:'Dolci',name_en:'Desserts',items:[
   dish('Tiramisù','Tiramisu','Savoiardi, caffè, mascarpone e cacao.','Sponge fingers, coffee, mascarpone and cocoa.',700,['1','3','7'],['vegetarian']),
   dish('Pastiera napoletana','Neapolitan pastiera','Frolla, ricotta, grano e profumo di agrumi.','Pastry, ricotta, wheat and citrus zest.',700,['1','3','7'],['vegetarian']),
   dish('Caprese al cioccolato','Chocolate almond cake','Cioccolato, mandorle, burro e uova.','Chocolate, almonds, butter and eggs.',700,['3','7','8'],['vegetarian']),
   dish('Sorbetto al limone','Lemon sorbet','Limone, acqua e zucchero.','Lemon, water and sugar.',500,[],['vegan']),
   dish('Panna cotta','Panna cotta','Panna, vaniglia e salsa ai frutti rossi.','Cream, vanilla and red berry sauce.',600,['7'])
  ]}
 ],
 [
  {name_it:'Da condividere',name_en:'To share',items:[
   dish('Insalata di mare','Seafood salad','Polpo, calamari, gamberi e limone.','Octopus, squid, prawns and lemon.',1600,['2','14']),
   dish('Bruschette mediterranee','Mediterranean bruschetta','Pane tostato, pomodoro, olive e basilico.','Toasted bread, tomatoes, olives and basil.',700,['1'],['vegan']),
   dish('Caprese sul mare','Seaside caprese','Mozzarella, pomodoro e basilico fresco.','Mozzarella, tomatoes and fresh basil.',1200,['7'],['vegetarian']),
   dish('Cuoppo di pesce','Seafood fritto','Calamari e gamberi in una frittura croccante.','Crispy fried squid and prawns.',1800,['1','2','14']),
   dish('Hummus e pane caldo','Hummus and warm bread','Ceci, tahina, limone e pane.','Chickpeas, tahini, lemon and bread.',900,['1','11'],['vegan'])
  ]},
  {name_it:'La cucina del lido',name_en:'From our kitchen',items:[
   dish('Spaghetti alle vongole','Spaghetti with clams','Vongole, aglio, prezzemolo e olio extravergine.','Clams, garlic, parsley and extra virgin olive oil.',1800,['1','14']),
   dish('Linguine ai gamberi','Prawn linguine','Gamberi, pomodorini e basilico.','Prawns, cherry tomatoes and basil.',1900,['1','2']),
   dish('Insalata di farro','Spelt salad','Farro, verdure di stagione e olio extravergine.','Spelt, seasonal vegetables and extra virgin olive oil.',1100,['1'],['vegan']),
   dish('Insalata di tonno','Tuna salad','Tonno, lattuga, pomodoro e olive.','Tuna, lettuce, tomatoes and olives.',1300,['4']),
   dish('Panino alle verdure','Grilled vegetable sandwich','Pane, melanzane, zucchine e hummus.','Bread, aubergines, courgettes and hummus.',1000,['1','11'],['vegan'])
  ]},
  {name_it:'Una pausa dolce',name_en:'Something sweet',items:[
   dish('Sorbetto al limone','Lemon sorbet','Limone, acqua e zucchero.','Lemon, water and sugar.',500,[],['vegan']),
   dish('Gelato alla vaniglia','Vanilla ice cream','Gelato con latte, panna e vaniglia.','Ice cream with milk, cream and vanilla.',600,['7'],['vegetarian']),
   dish('Macedonia di stagione','Seasonal fruit salad','Frutta fresca di stagione.','Fresh seasonal fruit.',600,[],['vegan']),
   dish('Cheesecake ai frutti rossi','Red berry cheesecake','Biscotto, crema di formaggio e frutti rossi.','Biscuit base, cream cheese and red berries.',700,['1','7'])
  ]}
 ]
];

export function demoDish(index:number,position:number){const categories=demoMenus[index]!;const category=position%categories.length;return {category,dish:categories[category]!.items[Math.floor(position/categories.length)]!};}
