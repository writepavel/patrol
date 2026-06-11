import { test as base } from "@playwright/test"
import { initialise } from "./initialise"
import { logger } from "./logger"
import { exposePatrolPlatformHandler } from "./patrolPlatformHandler"
import { PatrolTestEntry } from "./types"

const tests: PatrolTestEntry[] = process.env.PATROL_TESTS ? JSON.parse(process.env.PATROL_TESTS) : []
if (tests.length === 0) {
  logger.error("PATROL_TESTS env is empty")
}

export const patrolTest = base.extend({
  page: async ({ page }, use) => {
    // Expose screenshot function to the Flutter app
    await page.exposeFunction('takeScreenshot', async (name: string) => {
      const filename = typeof name === 'string' ? name : 'screenshot';
      const path = `patrol_test/screenshots/${filename}.png`;
      await page.screenshot({ path: path, fullPage: false });
      console.log(`Screenshot saved: ${path}`);
    });

    // Handle console messages (including screenshot signals)
    page.on("console", message => {
      const text = message.text()
      if (text.startsWith("PATROL_LOG")) {
        // eslint-disable-next-line no-console
        console.log(text)
        return
      }

      // Screenshot signal handler - format: "SCREENSHOT:filename"
      if (text.startsWith("SCREENSHOT:")) {
        const filename = text.split(":")[1]
        const path = `patrol_test/screenshots/${filename}.png`
        page.screenshot({ path: path, fullPage: false })
          .then(() => console.log(`Screenshot saved: ${path}`))
          .catch(err => console.error(`Screenshot failed: ${err}`))
        return
      }

      // eslint-disable-next-line no-console
      console.log(`Playwright: ${text}`)
    })

    // Handle page errors
    page.on("pageerror", error => {
      // eslint-disable-next-line no-console
      console.error(`Page error: ${error.message}`)
    })

    await page.goto("/", { waitUntil: "load" })

    await exposePatrolPlatformHandler(page)

    await initialise(page)

    await use(page)
  },
})

for (const { name, skip, tags } of tests) {
  patrolTest(name, { tag: tags }, async ({ page }) => {
    patrolTest.skip(skip)

    await page.waitForFunction(() => window.__patrol__runTest, {
      timeout: 300000,
    })

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const result = await page.evaluate(async name => await window.__patrol__runTest!(name), name)
    if (result?.result === "failure") {
      throw new Error(result.details ?? `Test "${name}" failed`)
    }
  })
}
