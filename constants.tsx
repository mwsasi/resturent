
import { MenuItem } from './types';

export const INITIAL_MENU: MenuItem[] = [
  {
    id: '1',
    name: 'Idly',
    price: 40,
    category: 'Breakfast',
    image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?q=80&w=1000&auto=format&fit=crop',
    description: '3 pieces of soft and fluffy steamed rice cakes served with sambar and two types of chutney.',
    stock: 50,
    piecesPerSet: 3
  },
  {
    id: '2',
    name: 'Puttu',
    price: 60,
    category: 'Breakfast',
    image: 'https://images.unsplash.com/photo-1662116765994-1e0200c4ffb5?q=80&w=1000&auto=format&fit=crop',
    description: '2 classic steamed cylinders of ground rice and coconut, served with kadala curry or chutney.',
    stock: 30,
    piecesPerSet: 2
  },
  {
    id: '3',
    name: 'Poori',
    price: 50,
    category: 'Breakfast',
    image: 'https://images.unsplash.com/photo-1626132647523-66f5bf380027?q=80&w=1000&auto=format&fit=crop',
    description: '2 pieces of golden, fluffy deep-fried bread served with traditional potato masala and chutneys.',
    stock: 25,
    piecesPerSet: 2
  },
  {
    id: '4',
    name: 'Filter Coffee',
    price: 25,
    category: 'Beverage',
    image: 'https://images.unsplash.com/photo-1594631252845-29fc458639a8?q=80&w=1000&auto=format&fit=crop',
    description: 'Traditional south Indian aromatic filter coffee served in a classic brass tumbler.',
    stock: 100
  },
  {
    id: '5',
    name: 'Plain Dosa',
    price: 70,
    category: 'Breakfast',
    image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?q=80&w=1000&auto=format&fit=crop',
    description: 'Crispy thin pancake made from fermented rice batter.',
    stock: 40
  },
  {
    id: '6',
    name: 'Medu Vada',
    price: 45,
    category: 'Breakfast',
    image: 'https://images.unsplash.com/photo-1645177623570-ad4b5a61c85e?q=80&w=1000&auto=format&fit=crop',
    description: 'Savory fried donut-shaped fritter made from urad dal, extra crispy on the outside.',
    stock: 35,
    piecesPerSet: 1
  }
];
