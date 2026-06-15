import { TileType, type LevelDefinition, type LevelTheme } from "@/game/types";

const HEIGHT = 16;

type LevelBuilder = {
  tiles: number[][];
  fill: (
    tile: number,
    fromColumn: number,
    toColumn: number,
    fromRow: number,
    toRow?: number,
  ) => void;
  place: (tile: number, column: number, row: number) => void;
  clear: (
    fromColumn: number,
    toColumn: number,
    fromRow: number,
    toRow?: number,
  ) => void;
};

function buildGrid(
  width: number,
  design: (builder: LevelBuilder) => void,
) {
  const tiles = Array.from({ length: HEIGHT }, () =>
    Array<number>(width).fill(TileType.Empty),
  );

  const fill = (
    tile: number,
    fromColumn: number,
    toColumn: number,
    fromRow: number,
    toRow = fromRow,
  ) => {
    for (let row = fromRow; row <= toRow; row += 1) {
      for (let column = fromColumn; column <= toColumn; column += 1) {
        if (tiles[row]?.[column] !== undefined) tiles[row][column] = tile;
      }
    }
  };

  const place = (tile: number, column: number, row: number) => {
    if (tiles[row]?.[column] !== undefined) tiles[row][column] = tile;
  };

  const clear = (
    fromColumn: number,
    toColumn: number,
    fromRow: number,
    toRow = HEIGHT - 1,
  ) => fill(TileType.Empty, fromColumn, toColumn, fromRow, toRow);

  design({ tiles, fill, place, clear });
  return tiles;
}

const bootTheme: LevelTheme = {
  skyTop: "#72d7ff",
  skyBottom: "#d6f7ff",
  skyline: "#326a8c",
  tile: "#16203a",
  tileEdge: "#67e8f9",
  accent: "#ffd84d",
};

const stackTheme: LevelTheme = {
  skyTop: "#7567ef",
  skyBottom: "#d7d0ff",
  skyline: "#302d72",
  tile: "#17162f",
  tileEdge: "#a7f35b",
  accent: "#a7f35b",
};

const kernelTheme: LevelTheme = {
  skyTop: "#19162e",
  skyBottom: "#60417e",
  skyline: "#0c1025",
  tile: "#11182c",
  tileEdge: "#ff5f72",
  accent: "#ff5f72",
};

const bootSequence = buildGrid(112, ({ fill, place, clear }) => {
  fill(TileType.Solid, 0, 111, 14, 15);
  clear(18, 20, 14);
  clear(43, 46, 14);
  clear(72, 75, 14);
  clear(94, 97, 14);

  fill(TileType.Solid, 8, 14, 11);
  fill(TileType.Solid, 22, 28, 9);
  fill(TileType.Solid, 31, 36, 12);
  fill(TileType.Solid, 48, 54, 10);
  fill(TileType.Solid, 58, 66, 7);
  fill(TileType.Secret, 61, 64, 6);
  fill(TileType.Solid, 77, 84, 11);
  fill(TileType.Solid, 86, 91, 8);
  fill(TileType.Solid, 99, 105, 10);

  fill(TileType.Hazard, 18, 20, 15);
  fill(TileType.Hazard, 43, 46, 15);
  fill(TileType.Hazard, 72, 75, 15);
  fill(TileType.Hazard, 94, 97, 15);

  place(TileType.PlayerSpawn, 2, 13);
  place(TileType.EnemySpawn, 12, 10);
  place(TileType.EnemySpawn, 25, 8);
  place(TileType.EnemySpawn, 51, 9);
  place(TileType.EnemySpawn, 80, 10);
  place(TileType.EnemySpawn, 89, 7);
  place(TileType.HackTerminal, 35, 11);
  fill(TileType.Firewall, 39, 39, 9, 13);
  place(TileType.RedlineCore, 49, 9);
  place(TileType.EndFlag, 108, 13);

  [6, 10, 15, 24, 28, 33, 50, 54, 60, 63, 66, 79, 83, 88, 103].forEach(
    (column, index) =>
      place(TileType.DataChip, column, index % 3 === 0 ? 9 : 12),
  );
});

const memoryStack = buildGrid(124, ({ fill, place, clear }) => {
  fill(TileType.Solid, 0, 123, 14, 15);
  clear(14, 17, 14);
  clear(33, 37, 14);
  clear(61, 65, 14);
  clear(84, 89, 14);
  clear(108, 112, 14);

  fill(TileType.Solid, 7, 11, 11);
  fill(TileType.Solid, 19, 25, 10);
  fill(TileType.Solid, 28, 31, 7);
  fill(TileType.Solid, 39, 45, 12);
  fill(TileType.Solid, 48, 55, 9);
  fill(TileType.Solid, 57, 60, 6);
  fill(TileType.Secret, 53, 56, 5);
  fill(TileType.Solid, 67, 73, 11);
  fill(TileType.Solid, 76, 82, 8);
  fill(TileType.Solid, 91, 98, 10);
  fill(TileType.Solid, 100, 106, 7);
  fill(TileType.Solid, 114, 120, 11);

  fill(TileType.Hazard, 14, 17, 15);
  fill(TileType.Hazard, 33, 37, 15);
  fill(TileType.Hazard, 61, 65, 15);
  fill(TileType.Hazard, 84, 89, 15);
  fill(TileType.Hazard, 108, 112, 15);

  place(TileType.PlayerSpawn, 2, 13);
  place(TileType.EnemySpawn, 9, 10);
  place(TileType.EnemySpawn, 22, 9);
  place(TileType.EnemySpawn, 42, 11);
  place(TileType.EnemySpawn, 51, 8);
  place(TileType.EnemySpawn, 70, 10);
  place(TileType.EnemySpawn, 79, 7);
  place(TileType.EnemySpawn, 94, 9);
  place(TileType.EnemySpawn, 103, 6);
  place(TileType.EnemySpawn, 118, 10);
  place(TileType.HackTerminal, 54, 8);
  fill(TileType.Firewall, 58, 58, 4, 13);
  place(TileType.EndFlag, 121, 13);

  [5, 10, 21, 24, 30, 41, 44, 50, 55, 59, 69, 72, 78, 81, 93, 97, 102, 105, 118].forEach(
    (column, index) =>
      place(TileType.DataChip, column, index % 4 === 0 ? 6 : 12),
  );
});

const rootAccess = buildGrid(136, ({ fill, place, clear }) => {
  fill(TileType.Solid, 0, 135, 14, 15);
  clear(16, 20, 14);
  clear(39, 44, 14);
  clear(68, 73, 14);
  clear(91, 96, 14);
  clear(116, 121, 14);

  fill(TileType.Solid, 8, 13, 10);
  fill(TileType.Solid, 22, 29, 12);
  fill(TileType.Solid, 31, 37, 8);
  fill(TileType.Solid, 46, 53, 11);
  fill(TileType.Solid, 55, 62, 7);
  fill(TileType.Secret, 59, 64, 5);
  fill(TileType.Solid, 75, 82, 10);
  fill(TileType.Solid, 84, 89, 6);
  fill(TileType.Solid, 98, 106, 11);
  fill(TileType.Solid, 108, 114, 8);
  fill(TileType.Solid, 123, 131, 11);

  fill(TileType.Hazard, 16, 20, 15);
  fill(TileType.Hazard, 39, 44, 15);
  fill(TileType.Hazard, 68, 73, 15);
  fill(TileType.Hazard, 91, 96, 15);
  fill(TileType.Hazard, 116, 121, 15);

  place(TileType.PlayerSpawn, 2, 13);
  place(TileType.EnemySpawn, 11, 9);
  place(TileType.EnemySpawn, 25, 11);
  place(TileType.EnemySpawn, 34, 7);
  place(TileType.EnemySpawn, 49, 10);
  place(TileType.EnemySpawn, 58, 6);
  place(TileType.EnemySpawn, 78, 9);
  place(TileType.EnemySpawn, 87, 5);
  place(TileType.HackTerminal, 62, 6);
  fill(TileType.Firewall, 66, 66, 3, 13);
  place(TileType.BossSpawn, 105, 10);
  place(TileType.EndFlag, 132, 13);

  [5, 12, 24, 28, 35, 48, 52, 57, 61, 76, 81, 86, 100, 104, 111, 126, 130].forEach(
    (column, index) =>
      place(TileType.DataChip, column, index % 3 === 1 ? 5 : 12),
  );
});

export const LEVELS: LevelDefinition[] = [
  {
    id: "sector-1-1",
    name: "Boot Sequence",
    sector: "1-1",
    tiles: bootSequence,
    theme: bootTheme,
  },
  {
    id: "sector-1-2",
    name: "Memory Stack",
    sector: "1-2",
    tiles: memoryStack,
    theme: stackTheme,
  },
  {
    id: "sector-1-3",
    name: "Root Access",
    sector: "1-3",
    tiles: rootAccess,
    theme: kernelTheme,
  },
];
