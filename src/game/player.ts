import { physicsParams } from "@/game/config";
import {
  moveWithTileCollisions,
  type CollisionWorld,
} from "@/game/collision";
import type { InputController } from "@/game/input";
import type { Vector2 } from "@/game/types";

function approach(current: number, target: number, amount: number) {
  if (current < target) return Math.min(current + amount, target);
  if (current > target) return Math.max(current - amount, target);
  return target;
}

export class Player {
  x = 0;
  y = 0;
  readonly width = 30;
  readonly height = 44;
  readonly velocity: Vector2 = { x: 0, y: 0 };
  grounded = false;
  facing: -1 | 1 = 1;
  invincibleTimer = 0;
  previousBottom = 0;

  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private jumpHoldTimer = 0;

  spawn(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.velocity.x = 0;
    this.velocity.y = 0;
    this.grounded = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.jumpHoldTimer = 0;
  }

  update(
    deltaTime: number,
    input: InputController,
    collisionWorld: CollisionWorld,
  ) {
    this.previousBottom = this.y + this.height;
    this.invincibleTimer = Math.max(0, this.invincibleTimer - deltaTime);

    const direction =
      Number(input.isDown("right")) - Number(input.isDown("left"));
    if (direction !== 0) this.facing = direction < 0 ? -1 : 1;

    const acceleration = this.grounded
      ? physicsParams.groundAcceleration
      : physicsParams.airAcceleration;
    const targetSpeed = direction * physicsParams.maxRunSpeed;

    if (direction !== 0) {
      this.velocity.x = approach(
        this.velocity.x,
        targetSpeed,
        acceleration * deltaTime,
      );
    } else {
      this.velocity.x = approach(
        this.velocity.x,
        0,
        physicsParams.friction * deltaTime,
      );
    }

    if (input.consumePressed("jump")) {
      this.jumpBufferTimer = physicsParams.jumpBufferTime;
    } else {
      this.jumpBufferTimer = Math.max(
        0,
        this.jumpBufferTimer - deltaTime,
      );
    }

    this.coyoteTimer = this.grounded
      ? physicsParams.coyoteTime
      : Math.max(0, this.coyoteTimer - deltaTime);

    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.velocity.y = -physicsParams.jumpForce;
      this.grounded = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      this.jumpHoldTimer = 0;
    }

    if (
      input.isDown("jump") &&
      this.velocity.y < 0 &&
      this.jumpHoldTimer < physicsParams.maxJumpHoldTime
    ) {
      this.velocity.y -= physicsParams.jumpHoldForce * deltaTime;
      this.jumpHoldTimer += deltaTime;
    }

    if (input.consumeReleased("jump") && this.velocity.y < 0) {
      this.velocity.y *= 0.48;
      this.jumpHoldTimer = physicsParams.maxJumpHoldTime;
    }

    const gravity =
      this.velocity.y > 0
        ? physicsParams.fallGravity
        : input.isDown("jump")
          ? physicsParams.gravity
          : physicsParams.lowJumpGravity;
    this.velocity.y = Math.min(
      physicsParams.maxFallSpeed,
      this.velocity.y + gravity * deltaTime,
    );

    const collisions = moveWithTileCollisions(
      this,
      deltaTime,
      collisionWorld,
    );
    this.grounded = collisions.grounded;
  }
}
