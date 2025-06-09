const GameConfig = {
  GridWidth: 8,
  GridHeight: 8,
  TileWidth: 64,
  TileHeight: 64,
  CandyTypes: [
    'cookie1',
    'cookie2',
    'croissant',
    'cupcake',
    'donut',
    'eclair',
    'macaroon',
    'pie',
    'poptart1',
    'poptart2',
    'starcookie1',
    'starcookie2',
  ],
} as const;

export default GameConfig;
