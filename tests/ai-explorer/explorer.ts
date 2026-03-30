import { chromium, type Page } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';

const GAME_URL = process.argv[2] ?? 'http://localhost:5173';
const SEED = process.argv[3] ?? '42';
const MAX_TURNS = Number.parseInt(process.argv[4] ?? '200', 10);
const OUTPUT = process.argv[5] ?? `reports/explorer-${Date.now()}.json`;

interface BugReport {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  reproSteps: Record<string, unknown>;
  turn: number;
}

async function executeAction(page: Page, action: Record<string, unknown>): Promise<void> {
  const type = String(action.type ?? 'stepFrames');
  if (type === 'stepFrames') {
    await page.evaluate((frames: number) => window.__game?.stepFrames(frames), Number(action.count ?? 60));
    return;
  }
  if (type === 'pressKey') {
    const key = String(action.key ?? 'ArrowDown');
    await page.keyboard.down(key);
    await page.evaluate((frames: number) => window.__game?.stepFrames(frames), Number(action.frames ?? 10));
    await page.keyboard.up(key);
    return;
  }
  if (type === 'skipDialog') {
    await page.evaluate(() => window.__game?.skipDialog());
    return;
  }
  if (type === 'choose') {
    await page.evaluate((idx: number) => window.__game?.choose(idx), Number(action.index ?? 0));
    return;
  }
  if (type === 'changeScene') {
    await page.evaluate((scene: string) => window.__game?.changeScene(scene), String(action.scene ?? 'TownScene'));
    return;
  }
  if (type === 'startBattle') {
    await page.evaluate((enemyIds: string[]) => window.__game?.startBattle(enemyIds), (action.enemyIds as string[]) ?? ['slime']);
    return;
  }
  if (type === 'teleport') {
    const map = typeof action.map === 'string' ? action.map : undefined;
    await page.evaluate(
      (args: { x: number; y: number; map?: string }) => window.__game?.teleport(args.x, args.y, args.map),
      {
        x: Number(action.x ?? 0),
        y: Number(action.y ?? 0),
        map,
      },
    );
  }
}

async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  await page.goto(`${GAME_URL}?seed=${SEED}&testMode=true`);
  await page.waitForTimeout(300);

  const bugs: BugReport[] = [];
  const scenesVisited = new Set<string>();
  let completed = false;

  for (let turn = 1; turn <= MAX_TURNS; turn++) {
    const state = await page.evaluate(() => ({
      scene: window.__game?.getScene(),
      player: window.__game?.getPlayer(),
      inventory: window.__game?.getInventory(),
      quests: window.__game?.getQuestLog(),
      dialog: window.__game?.getDialogState(),
      battle: window.__game?.getBattleState(),
      mapPos: window.__game?.getMapPosition(),
    }));

    if (typeof state.scene === 'string') scenesVisited.add(state.scene);
    if (state.scene === 'VictoryScene') {
      completed = true;
      break;
    }

    if ((state.player?.hp ?? 0) < 0) {
      bugs.push({
        severity: 'HIGH',
        description: 'Player HP is negative',
        reproSteps: { state },
        turn,
      });
    }

    if (state.dialog) {
      await executeAction(page, { type: 'skipDialog' });
    } else if (state.scene === 'TitleScene') {
      await executeAction(page, { type: 'changeScene', scene: 'TownScene' });
    } else {
      await executeAction(page, { type: 'stepFrames', count: 10 });
    }
  }

  const report = {
    summary: {
      scenesVisited: [...scenesVisited],
      bugsFound: bugs.length,
      completed,
      seed: SEED,
      maxTurns: MAX_TURNS,
    },
    bugs,
  };

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(report, null, 2));
  await browser.close();
}

main().catch((error) => {
  process.stderr.write(`${String(error)}\n`);
  process.exitCode = 1;
});
