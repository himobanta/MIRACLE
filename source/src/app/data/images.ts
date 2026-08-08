// Centralized, curated Unsplash imagery for the MIRACLE platform.
// Helper builds a correctly-sized, auto-formatted URL from a photo id.
const u = (id: string, w = 1200, h?: number) =>
  `https://images.unsplash.com/photo-${id}?w=${w}${h ? `&h=${h}` : ''}&fit=crop&auto=format&q=80`;

export const IMG = {
  // Hero + editorial portraits
  heroPortrait: u('1636153279424-cb5d1e00f5a2', 1400, 1800),
  portraitGlow: u('1674932668403-33398b81c92f', 1200, 1500),
  portraitSoft: u('1581182815808-b6eb627a8798', 1200, 1500),
  portraitFreckle: u('1639689413026-68b7f99a0920', 1200, 1500),

  // Product renders / still life
  serumAmber: u('1613803745799-ba6c10aace85', 1000, 1250),
  serumClear: u('1608571423902-eed4a5ad8108', 1000, 1250),
  serumSand: u('1743309026555-97f545a08490', 1000, 1250),
  serumDrop: u('1576426863848-c21f53c60b19', 1000, 1250),
  productReflect: u('1783905326791-c1fb6b8bc113', 1000, 1250),
  productDresser: u('1778451510207-24f1e204f465', 1200, 900),
  jarGold: u('1631438414076-16e1c4fb438d', 1000, 1250),
  jarFrost: u('1779437141537-62577b216307', 1000, 1250),
  jarWhite: u('1704819177156-0af385447fdf', 1000, 1250),
  tubeCream: u('1712168044214-f5a272c23a5b', 1000, 1250),
  trioJars: u('1673922832855-98036363e570', 1200, 800),
  bottlesShelf: u('1650529192647-ce4eb5fb3314', 1000, 1400),

  // Textures / macro
  creamSmear: u('1585945037805-5fd82c2e60b1', 1000, 1000),
  creamFlow: u('1741017778557-31eaf775ce0a', 1000, 1250),
  creamSilk: u('1749143930790-65db0ee6d222', 1000, 1250),

  // Nature / botanical
  leafDrops1: u('1592296429945-93008c7e5a59', 1200, 800),
  leafDrops2: u('1763452453224-dcc58b8cb602', 1200, 1500),
  leafDark: u('1760339346612-2fca79db08bb', 1000, 1400),
  plantDrops: u('1640867096164-2430b904a8f3', 1000, 1400),
  leafMacro: u('1697192287574-9246218bc6d5', 1000, 1400),

  // Diverse people (results / testimonials)
  faceDark1: u('1765607476292-886bc1e648a1', 800, 1000),
  faceAfro: u('1770393391946-7d9b658deec3', 800, 1000),
  faceMan: u('1664117308709-81e5e63501cf', 800, 1000),
  faceThought: u('1765607476376-9574ea76b2ee', 800, 1000),
  faceTank: u('1581182786510-168e6bc0013d', 800, 1000),
  faceBlonde: u('1764844463559-63d59516380a', 800, 1000),
  faceShoulder: u('1762193802438-5255bf2bec5d', 800, 1000),
  faceSide: u('1779400203917-4073f2f174b5', 800, 1000),
  faceSmile: u('1728727217834-b190862837a3', 800, 1000),
  faceBlue: u('1728463087277-97c8d8c7b6a4', 800, 1000),
  faceRed: u('1626775550407-c09be28b6053', 800, 1000),

  // Editorial / lifestyle
  editorialTouch: u('1551184451-76b762941ad6', 1200, 1500),
  ritual: u('1731768466934-3d98b5fff924', 1200, 900),

  // Concern-representative skin / macro imagery
  skinFreckles: u('1730288951113-9cc087c14b83', 900, 1100),
  skinFrecklesEyes: u('1567671569645-0d21445141c4', 900, 1100),
  skinFrecklesSoft: u('1589221158826-aed6c80c3f15', 900, 1100),
  skinMacro: u('1710580889701-9fa8f2cd5927', 900, 1100),
  skinSpotsBack: u('1541752857837-f8a0154fd092', 900, 1100),
  skinWrinkles: u('1531067332586-ffe9e4d49477', 900, 1100),
  skinManFace: u('1606675130444-3ddf4a6213d6', 900, 1100),
  skinManClose: u('1664192537631-c115ab3e605b', 900, 1100),
  skinGlowEye: u('1542833807-ad5af0977050', 900, 1100),
  skinDewy: u('1675773051474-55c4b7d2cf53', 900, 1100),
  skinRadiant: u('1613730317319-bc2d10ae54ff', 900, 1100),
};

export type ImgKey = keyof typeof IMG;
