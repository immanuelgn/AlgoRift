import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AlgoRift } from "./algo-rift";

const progress = {
  completedLevel: 12,
  xp: 5000,
  redlineVisionUnlocked: true,
};

async function openGame(title: string) {
  window.localStorage.setItem("algorift-progress-v2", JSON.stringify(progress));
  const user = userEvent.setup();
  render(<AlgoRift />);

  const gamesButton = await screen.findByRole("button", { name: "Games" });
  await user.click(gamesButton);

  const heading = await screen.findByRole("heading", { name: title });
  const card = heading.closest("article");
  expect(card).not.toBeNull();
  await user.click(
    within(card as HTMLElement).getByRole("button", {
      name: "Replay mini-game",
    }),
  );
  await screen.findByRole("button", { name: "Restart" });
  return user;
}

describe("advanced game launch and interaction", () => {
  it.each([
    ["Branch Finder", "Binary search tree branch finder"],
    ["Queue Rescue", "BFS queue rescue"],
    ["Shortest Route", "Dijkstra route dispatcher"],
    ["Interval Planner", "Greedy interval planner"],
    ["Memo Forge", "Dynamic programming memo forge"],
    ["Sorting Arsenal", "Advanced sorting algorithm gauntlet"],
    ["Depth Dive", "Depth-first search expedition"],
    ["Grid Architect", "Minimum spanning tree builder"],
    ["Code Compressor", "Huffman compression tree builder"],
  ])("launches %s without a render failure", async (title, label) => {
    await openGame(title);
    expect(await screen.findByLabelText(label)).toBeTruthy();
  });

  it("advances the BFS queue after serving its front", async () => {
    const user = await openGame("Queue Rescue");
    const graph = await screen.findByLabelText("BFS queue rescue");
    await user.click(within(graph).getByRole("button", { name: "A" }));
    expect(within(graph).getByRole("button", { name: "B" })).toBeTruthy();
    expect(within(graph).getByRole("button", { name: "C" })).toBeTruthy();
    expect(within(graph).getByText("FRONT")).toBeTruthy();
  });

  it("reaches the second BFS network without crashing", async () => {
    const user = await openGame("Queue Rescue");
    const graph = await screen.findByLabelText("BFS queue rescue");
    for (const node of ["A", "B", "C", "D", "E", "F", "G", "H", "I"]) {
      await user.click(within(graph).getByRole("button", { name: node }));
    }
    expect(within(graph).getByRole("button", { name: "J" })).toBeTruthy();
  });

  it("updates the binary search tree comparison after a branch choice", async () => {
    const user = await openGame("Branch Finder");
    const game = await screen.findByLabelText(
      "Binary search tree branch finder",
    );
    await user.click(within(game).getByRole("button", { name: "75" }));
    expect(within(game).getByText("Target is smaller")).toBeTruthy();
  });

  it("locks the cheapest Dijkstra frontier node", async () => {
    const user = await openGame("Shortest Route");
    const game = await screen.findByLabelText("Dijkstra route dispatcher");
    await user.click(
      within(game).getByRole("button", { name: "FRONTIERBcost 3" }),
    );
    expect(within(game).getByText("1 OF 7 LOCATIONS LOCKED")).toBeTruthy();
  });

  it("advances the greedy scheduling cursor", async () => {
    const user = await openGame("Interval Planner");
    const game = await screen.findByLabelText("Greedy interval planner");
    await user.click(
      within(game).getByRole("button", { name: "EVENT B1:00-3:00" }),
    );
    expect(game.querySelector(".greedy-cursor strong")?.textContent).toBe(
      "3:00",
    );
  });

  it("shows Fibonacci as two cached sources feeding one new cell", async () => {
    const user = await openGame("Memo Forge");
    const game = await screen.findByLabelText("Dynamic programming memo forge");
    expect(within(game).getByText("TWO STEPS BACK")).toBeTruthy();
    expect(within(game).getByText("ONE STEP BACK")).toBeTruthy();
    expect(within(game).getByText("NEW SAVED CELL")).toBeTruthy();
    await user.click(within(game).getByRole("button", { name: "Save 1" }));
    await waitFor(() => {
      expect(game.querySelector(".fib-target-cell")?.textContent).toContain(
        "fib(3)",
      );
    });
  });

  it("advances the first sorting workshop mission", async () => {
    const user = await openGame("Sorting Arsenal");
    const game = await screen.findByLabelText(
      "Advanced sorting algorithm gauntlet",
    );
    await user.click(
      within(game).getByRole("button", { name: "Gap after 3" }),
    );
    expect(within(game).getByText("MISSION 2 / 12")).toBeTruthy();
  });

  it("supports DFS descent and explicit backtracking", async () => {
    const user = await openGame("Depth Dive");
    const game = await screen.findByLabelText("Depth-first search expedition");
    await user.click(within(game).getByRole("button", { name: "B" }));
    await user.click(within(game).getByRole("button", { name: "D" }));
    await user.click(within(game).getByRole("button", { name: "H" }));
    await user.click(
      within(game).getByRole("button", { name: "Backtrack one level" }),
    );
    expect(within(game).getByText("1", { exact: true })).toBeTruthy();
  });

  it("accepts safe Kruskal edges and rejects a cycle", async () => {
    const user = await openGame("Grid Architect");
    const game = await screen.findByLabelText("Minimum spanning tree builder");
    await user.click(
      within(game).getByRole("button", { name: "Accept cable" }),
    );
    await user.click(
      within(game).getByRole("button", { name: "Accept cable" }),
    );
    await user.click(
      within(game).getByRole("button", { name: "Skip cycle" }),
    );
    expect(within(game).getByText("COST 5")).toBeTruthy();
  });

  it("fuses the two minimum Huffman signals and records the merge", async () => {
    const user = await openGame("Code Compressor");
    const game = await screen.findByLabelText("Huffman compression tree builder");
    await user.click(within(game).getByRole("button", { name: "A2" }));
    await user.click(within(game).getByRole("button", { name: "B3" }));
    await user.click(
      within(game).getByRole("button", { name: "Fuse selected signals" }),
    );
    expect(within(game).getByText("1 / 4 fusions")).toBeTruthy();
  });

  it("remounts clean state when moving from Game 4 to Game 5", async () => {
    const user = await openGame("Branch Finder");
    await user.click(screen.getByRole("button", { name: "Exit" }));
    const queueHeading = await screen.findByRole("heading", {
      name: "Queue Rescue",
    });
    const queueCard = queueHeading.closest("article");
    await user.click(
      within(queueCard as HTMLElement).getByRole("button", {
        name: "Replay mini-game",
      }),
    );
    expect(await screen.findByLabelText("BFS queue rescue")).toBeTruthy();
  });
});
