export class CameraController {
  x = 0;
  y = 0;
  width = 960;
  height = 540;

  private lookAhead = 0;

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  snapTo(
    playerX: number,
    playerY: number,
    levelWidth: number,
    levelHeight: number,
  ) {
    this.lookAhead = 0;
    this.x = this.clampX(playerX - this.width * 0.38, levelWidth);
    this.y = this.clampY(playerY - this.height * 0.58, levelHeight);
  }

  update(
    playerX: number,
    playerY: number,
    playerVelocityX: number,
    deltaTime: number,
    levelWidth: number,
    levelHeight: number,
  ) {
    const desiredLookAhead = Math.max(
      -110,
      Math.min(150, playerVelocityX * 0.34),
    );
    const lookAheadBlend = 1 - Math.exp(-5.5 * deltaTime);
    this.lookAhead += (desiredLookAhead - this.lookAhead) * lookAheadBlend;

    const desiredX = this.clampX(
      playerX - this.width * 0.4 + this.lookAhead,
      levelWidth,
    );
    const desiredY = this.clampY(
      playerY - this.height * 0.58,
      levelHeight,
    );
    const horizontalBlend = 1 - Math.exp(-6.8 * deltaTime);
    const verticalBlend = 1 - Math.exp(-3.7 * deltaTime);

    this.x += (desiredX - this.x) * horizontalBlend;
    this.y += (desiredY - this.y) * verticalBlend;
  }

  private clampX(value: number, levelWidth: number) {
    return Math.max(0, Math.min(Math.max(0, levelWidth - this.width), value));
  }

  private clampY(value: number, levelHeight: number) {
    return Math.max(0, Math.min(Math.max(0, levelHeight - this.height), value));
  }
}
