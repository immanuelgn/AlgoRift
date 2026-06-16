"use client";

import {
  ArrowLeft,
  ArrowRight,
  Crosshair,
  Gauge,
  Heart,
  RotateCcw,
  SlidersHorizontal,
  Terminal,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { defaultPhysicsParams } from "@/game/config";
import { PlatformGameEngine } from "@/game/engine";
import type {
  CompletionPayload,
  GameUiState,
  TraceDirection,
  TunablePhysicsKey,
} from "@/game/types";

type CanvasPlatformerProps = {
  playerName: string;
  soundOn: boolean;
  onExit: () => void;
  onComplete: (payload: CompletionPayload) => void;
};

const INITIAL_UI_STATE: GameUiState = {
  levelIndex: 0,
  levelCount: 3,
  sector: "1-1",
  levelName: "Boot Sequence",
  health: 3,
  chips: 0,
  redlineUnlocked: false,
  laserReady: false,
  hackerMode: false,
  transitionAlpha: 0,
  tracePrompt: null,
  algorithmBrief: {
    title: "Binary Search",
    rule: "Compare the middle value, then keep only the half where the target can still exist.",
    detail:
      "World 1 gates use a sorted row of numbers. Press E, check MID, then keep the side that can still contain 42.",
  },
  status: "playing",
  statusLine: "REACH THE EXIT FLAG",
  physics: {
    maxRunSpeed: defaultPhysicsParams.maxRunSpeed,
    jumpForce: defaultPhysicsParams.jumpForce,
    gravity: defaultPhysicsParams.gravity,
    friction: defaultPhysicsParams.friction,
  },
};

const TUNERS: Array<{
  key: TunablePhysicsKey;
  label: string;
  min: number;
  max: number;
  step: number;
}> = [
  {
    key: "maxRunSpeed",
    label: "RUN_CAP",
    min: 240,
    max: 440,
    step: 5,
  },
  {
    key: "jumpForce",
    label: "JUMP_FORCE",
    min: 480,
    max: 760,
    step: 5,
  },
  {
    key: "gravity",
    label: "GRAVITY",
    min: 1_200,
    max: 2_400,
    step: 20,
  },
  {
    key: "friction",
    label: "FRICTION",
    min: 1_600,
    max: 4_000,
    step: 25,
  },
];

export function CanvasPlatformer({
  playerName,
  soundOn,
  onExit,
  onComplete,
}: CanvasPlatformerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PlatformGameEngine | null>(null);
  const completionRef = useRef(onComplete);
  const initialSoundRef = useRef(soundOn);
  const [ui, setUi] = useState(INITIAL_UI_STATE);

  useEffect(() => {
    completionRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new PlatformGameEngine(canvas, {
      soundOn: initialSoundRef.current,
      onUiState: setUi,
      onComplete: (payload) => completionRef.current(payload),
    });
    engineRef.current = engine;
    engine.start();

    return () => {
      engine.stop();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setSoundEnabled(soundOn);
  }, [soundOn]);

  function updateTuner(key: TunablePhysicsKey, value: number) {
    engineRef.current?.setPhysicsParameter(key, value);
  }

  function pulseAction(action: "left" | "right" | "jump" | "fire") {
    engineRef.current?.pulseVirtualAction(action);
  }

  function releaseAction(action: "left" | "right" | "jump" | "fire") {
    pulseAction(action);
    engineRef.current?.setVirtualAction(action, false);
  }

  return (
    <main className="canvas-game-view">
      <header className="canvas-game-toolbar">
        <button type="button" onClick={onExit}>
          <ArrowLeft size={17} /> Exit
        </button>
        <div>
          <span>SECTOR {ui.sector}</span>
          <strong>{ui.levelName}</strong>
        </div>
        <button type="button" onClick={() => engineRef.current?.restart()}>
          <RotateCcw size={16} /> Restart
        </button>
      </header>

      <section className="canvas-shell">
        <div className="canvas-hud">
          <div className="canvas-hud-player">
            <span>{playerName.toUpperCase()}</span>
            <div aria-label={`${ui.health} health remaining`}>
              {[0, 1, 2].map((index) => (
                <Heart
                  key={index}
                  size={17}
                  fill={index < ui.health ? "currentColor" : "none"}
                />
              ))}
            </div>
          </div>

          <div className="canvas-objective">
            <small>WORLD 1</small>
            <strong>
              {ui.levelIndex + 1}/{ui.levelCount}
            </strong>
            <span>{ui.statusLine}</span>
          </div>

          <div className="canvas-resources">
            <span>
              <Terminal size={15} /> {ui.chips.toString().padStart(2, "0")}
            </span>
            <span className={ui.redlineUnlocked ? "resource-ready" : ""}>
              <Crosshair size={15} />
              {ui.redlineUnlocked
                ? ui.laserReady
                  ? "REDLINE"
                  : "COOLING"
                : "LOCKED"}
            </span>
          </div>
        </div>

        <canvas
          ref={canvasRef}
          className="platform-canvas"
          aria-label="AlgoRift platform game"
        />

        <div className="canvas-controls" aria-label="Game controls">
          <div className="canvas-move-controls">
            <button
              type="button"
              aria-label="Move left"
              onPointerDown={() => {
                engineRef.current?.setVirtualAction("left", true);
              }}
              onPointerUp={() => releaseAction("left")}
              onPointerCancel={() => releaseAction("left")}
              onClick={() => pulseAction("left")}
            >
              <ArrowLeft size={22} />
            </button>
            <button
              type="button"
              aria-label="Move right"
              onPointerDown={() => {
                engineRef.current?.setVirtualAction("right", true);
              }}
              onPointerUp={() => releaseAction("right")}
              onPointerCancel={() => releaseAction("right")}
              onClick={() => pulseAction("right")}
            >
              <ArrowRight size={22} />
            </button>
          </div>

          <button
            type="button"
            className="override-control"
            aria-label="Toggle System Override"
            onClick={() => engineRef.current?.toggleOverride()}
          >
            <SlidersHorizontal size={20} />
            <span>OVERRIDE</span>
          </button>

          <button
            type="button"
            className="fire-canvas-control"
            aria-label="Fire Redline Vision"
            disabled={!ui.redlineUnlocked}
            onPointerDown={() =>
              engineRef.current?.setVirtualAction("fire", true)
            }
            onPointerUp={() => releaseAction("fire")}
            onPointerCancel={() => releaseAction("fire")}
            onClick={() => pulseAction("fire")}
          >
            <Zap size={22} />
            <span>FIRE</span>
          </button>

          <button
            type="button"
            className="jump-canvas-control"
            aria-label="Jump"
            onPointerDown={() => {
              engineRef.current?.setVirtualAction("jump", true);
            }}
            onPointerUp={() => releaseAction("jump")}
            onPointerCancel={() => releaseAction("jump")}
            onClick={() => pulseAction("jump")}
          >
            <ArrowRight className="jump-arrow" size={23} />
            <span>JUMP</span>
          </button>
        </div>

        <div className="desktop-command-strip" aria-hidden="true">
          <span><kbd>A</kbd><kbd>D</kbd> MOVE</span>
          <span><kbd>SPACE</kbd> VARIABLE JUMP</span>
          <span><kbd>E</kbd> OVERRIDE</span>
          <span><kbd>F</kbd> REDLINE</span>
        </div>

        <aside className="algorithm-coach" aria-label="Current algorithm lesson">
          <span>ALGORITHM COACH</span>
          <strong>{ui.algorithmBrief.title}</strong>
          <p>{ui.algorithmBrief.rule}</p>
          <small>{ui.algorithmBrief.detail}</small>
        </aside>

        {ui.hackerMode && (
          <div className="hacker-overlay" role="dialog" aria-label="System Override">
            <div className="hacker-window">
              <div className="hacker-window-bar">
                <div>
                  <Terminal size={18} />
                  <span>SYSTEM OVERRIDE</span>
                  <b>TIME_SCALE 0.20</b>
                </div>
                <button
                  type="button"
                  aria-label="Close System Override"
                  onClick={() => engineRef.current?.closeHackerMode()}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="hacker-window-content">
                <section className="physics-console">
                  <div className="console-heading">
                    <Gauge size={19} />
                    <div>
                      <span>PHYSICS BUS</span>
                      <strong>LIVE PARAMETERS</strong>
                    </div>
                  </div>
                  {TUNERS.map((tuner) => (
                    <label key={tuner.key}>
                      <span>{tuner.label}</span>
                      <input
                        type="range"
                        min={tuner.min}
                        max={tuner.max}
                        step={tuner.step}
                        value={ui.physics[tuner.key]}
                        onChange={(event) =>
                          updateTuner(tuner.key, Number(event.target.value))
                        }
                      />
                      <output>{Math.round(ui.physics[tuner.key])}</output>
                    </label>
                  ))}
                </section>

                <section className="trace-console">
                  {ui.tracePrompt ? (
                    <>
                      <div className="trace-heading">
                        <span>BINARY SEARCH GATE</span>
                        <strong>TARGET {ui.tracePrompt.target}</strong>
                      </div>
                      <p className="trace-goal">
                        Goal: find {ui.tracePrompt.target} by cutting this
                        sorted signal in half.
                      </p>
                      <p className="trace-rule">
                        First check MID. If the target is bigger than MID,
                        search right. If it is smaller, search left.
                      </p>
                      <div className="trace-values">
                        {ui.tracePrompt.values.map((value, index) => {
                          const markers = [];
                          if (index === 0) markers.push("LOW");
                          if (value === ui.tracePrompt?.pivot) markers.push("MID");
                          if (index === ui.tracePrompt!.values.length - 1) {
                            markers.push("HIGH");
                          }
                          return (
                            <span
                              key={value}
                              className={
                                value === ui.tracePrompt?.pivot
                                  ? "trace-pivot"
                                  : ""
                              }
                            >
                              <b>{markers.join("/")}</b>
                              {value}
                            </span>
                          );
                        })}
                      </div>
                      <div className="trace-readout">
                        <span>MID</span>
                        <strong>{ui.tracePrompt.pivot}</strong>
                        <span>VS {ui.tracePrompt.target}</span>
                      </div>
                      <p className="trace-hint">
                        Since the row is sorted, every wrong half can be
                        ignored. That is why Binary Search is O(log n).
                      </p>
                      <div className="trace-actions">
                        {(
                          [
                            ["lower", "Search left half"],
                            ["lock", "Found target"],
                            ["higher", "Search right half"],
                          ] as Array<[TraceDirection, string]>
                        ).map(([direction, label]) => (
                          <button
                            key={direction}
                            type="button"
                            className={
                              ui.tracePrompt?.rejected === direction
                                ? "trace-rejected"
                                : ""
                            }
                            onClick={() =>
                              engineRef.current?.submitTrace(direction)
                            }
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="free-tune-panel">
                      <span>LOCAL SANDBOX</span>
                      <strong>PHYSICS LINK ACTIVE</strong>
                      <div className="signal-bars">
                        <i /><i /><i /><i /><i />
                      </div>
                      <code>delta = frameTime * 0.20</code>
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>
        )}

        {ui.status === "complete" && (
          <div className="canvas-complete" role="dialog" aria-label="World complete">
            <div>
              <span>ROOT ACCESS GRANTED</span>
              <h2>World 1 cleared.</h2>
              <p>
                Three sectors breached. Binary trace resolved. Redline kernel
                retained.
              </p>
              <div className="canvas-complete-stats">
                <strong>+250 XP</strong>
                <strong>{ui.chips} DATA</strong>
                <strong>3/3 SECTORS</strong>
              </div>
              <button type="button" onClick={onExit}>
                Return to world map <ArrowRight size={17} />
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
