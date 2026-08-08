import { IMG } from './images';

export interface Product {
  id: string;
  name: string;
  tag: string;
  price: number;
  rating: number;
  reviews: number;
  img: string;
  tone: string;
}

/** Format a number as an Indian Rupee price, e.g. 1299 → "₹1,299". */
export const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export const PRODUCTS: Product[] = [
  { id: 'vit-c', name: 'Vitamin C Serum', tag: 'Brightening', price: 1299, rating: 4.9, reviews: 2140, img: IMG.serumAmber, tone: '#e7c65a' },
  { id: 'niacinamide', name: 'Niacinamide Serum', tag: 'Pore Refining', price: 1099, rating: 4.8, reviews: 1876, img: IMG.serumClear, tone: '#7fa8c9' },
  { id: 'barrier', name: 'Barrier Repair Cream', tag: 'Nourishing', price: 1599, rating: 4.9, reviews: 3210, img: IMG.jarGold, tone: '#2f6b4c' },
  { id: 'retinol', name: 'Retinol Night Serum', tag: 'Renewing', price: 1899, rating: 4.7, reviews: 1544, img: IMG.serumSand, tone: '#c3a468' },
  { id: 'cleanser', name: 'Gentle Gel Cleanser', tag: 'Purifying', price: 699, rating: 4.8, reviews: 2890, img: IMG.tubeCream, tone: '#7bab5a' },
  { id: 'moisturizer', name: 'Hydrating Moisturizer', tag: 'Plumping', price: 1199, rating: 4.9, reviews: 4120, img: IMG.jarFrost, tone: '#a9c9d6' },
  { id: 'spf', name: 'Mineral Sunscreen SPF50', tag: 'Protecting', price: 899, rating: 4.9, reviews: 5230, img: IMG.jarWhite, tone: '#e08a4a' },
  { id: 'toner', name: 'Hydrating Toner', tag: 'Balancing', price: 799, rating: 4.7, reviews: 1320, img: IMG.serumDrop, tone: '#9caf92' },
];
