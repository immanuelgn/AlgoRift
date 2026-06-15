import { TILE_SIZE } from "@/game/config";

export type PhysicsBody = {
  x: number;
  y: number;
  width: number;
  height: number;
  velocity: {
    x: number;
    y: number;
  };
};

export type CollisionWorld = {
  isSolidAt: (column: number, row: number) => boolean;
};

export type CollisionResult = {
  hitLeft: boolean;
  hitRight: boolean;
  hitCeiling: boolean;
  grounded: boolean;
};

function getRowRange(body: PhysicsBody) {
  return {
    first: Math.floor((body.y + 2) / TILE_SIZE),
    last: Math.floor((body.y + body.height - 2) / TILE_SIZE),
  };
}

function getColumnRange(body: PhysicsBody) {
  return {
    first: Math.floor((body.x + 2) / TILE_SIZE),
    last: Math.floor((body.x + body.width - 2) / TILE_SIZE),
  };
}

export function moveWithTileCollisions(
  body: PhysicsBody,
  deltaTime: number,
  world: CollisionWorld,
): CollisionResult {
  const result: CollisionResult = {
    hitLeft: false,
    hitRight: false,
    hitCeiling: false,
    grounded: false,
  };

  body.x += body.velocity.x * deltaTime;
  const rows = getRowRange(body);

  if (body.velocity.x > 0) {
    const rightColumn = Math.floor((body.x + body.width) / TILE_SIZE);
    for (let row = rows.first; row <= rows.last; row += 1) {
      if (!world.isSolidAt(rightColumn, row)) continue;
      body.x = rightColumn * TILE_SIZE - body.width - 0.01;
      body.velocity.x = 0;
      result.hitRight = true;
      break;
    }
  } else if (body.velocity.x < 0) {
    const leftColumn = Math.floor(body.x / TILE_SIZE);
    for (let row = rows.first; row <= rows.last; row += 1) {
      if (!world.isSolidAt(leftColumn, row)) continue;
      body.x = (leftColumn + 1) * TILE_SIZE + 0.01;
      body.velocity.x = 0;
      result.hitLeft = true;
      break;
    }
  }

  body.y += body.velocity.y * deltaTime;
  const columns = getColumnRange(body);

  if (body.velocity.y > 0) {
    const bottomRow = Math.floor((body.y + body.height) / TILE_SIZE);
    for (let column = columns.first; column <= columns.last; column += 1) {
      if (!world.isSolidAt(column, bottomRow)) continue;
      body.y = bottomRow * TILE_SIZE - body.height - 0.01;
      body.velocity.y = 0;
      result.grounded = true;
      break;
    }
  } else if (body.velocity.y < 0) {
    const topRow = Math.floor(body.y / TILE_SIZE);
    for (let column = columns.first; column <= columns.last; column += 1) {
      if (!world.isSolidAt(column, topRow)) continue;
      body.y = (topRow + 1) * TILE_SIZE + 0.01;
      body.velocity.y = 0;
      result.hitCeiling = true;
      break;
    }
  }

  return result;
}

export function forEachOverlappingTile(
  body: Pick<PhysicsBody, "x" | "y" | "width" | "height">,
  visit: (column: number, row: number) => void,
) {
  const firstColumn = Math.floor((body.x + 3) / TILE_SIZE);
  const lastColumn = Math.floor((body.x + body.width - 3) / TILE_SIZE);
  const firstRow = Math.floor((body.y + 3) / TILE_SIZE);
  const lastRow = Math.floor((body.y + body.height - 3) / TILE_SIZE);

  for (let row = firstRow; row <= lastRow; row += 1) {
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      visit(column, row);
    }
  }
}

export function overlaps(
  a: Pick<PhysicsBody, "x" | "y" | "width" | "height">,
  b: Pick<PhysicsBody, "x" | "y" | "width" | "height">,
) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
