import { Page } from "playwright"
import fs from "fs"
import path from "path"
import process from "process"

/**
 * Takes a screenshot of the current page and saves it as a PNG file.
 *
 * @param page - Playwright Page object
 * @param params - Screenshot parameters
 * @param params.name - Filename for the screenshot (without extension). Defaults to 'screenshot'.
 * @param params.path - Full directory path to save the screenshot. 
 *                      Defaults to 'test-results/screenshots/' relative to cwd.
 *
 * @example
 * // Simple screenshot
 * await screenshot(page, { name: 'home' });
 *
 * // Screenshot with custom path
 * await screenshot(page, { name: 'home', path: '/Users/me/project/test-results/screenshots' });
 */
export async function screenshot(page: Page, params: { name?: string; path?: string }) {
  const filename = params?.name || 'screenshot';
  
  // Determine base directory
  let baseDir = params?.path;
  
  if (!baseDir) {
    // Try PATROL_TEST_RESULTS_DIR env var (contains test-results path)
    if (process.env.PATROL_TEST_RESULTS_DIR) {
      baseDir = path.join(
        path.dirname(process.env.PATROL_TEST_RESULTS_DIR),
        'test-results',
        'screenshots'
      );
    } else {
      // Fall back to current working directory
      baseDir = path.join(process.cwd(), 'test-results', 'screenshots');
    }
  } else {
    // If relative path provided, make it absolute relative to cwd
    if (!path.isAbsolute(baseDir)) {
      baseDir = path.join(process.cwd(), baseDir);
    }
  }
  
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  
  const fullPath = path.join(baseDir, `${filename}.png`);
  
  await page.screenshot({ path: fullPath, fullPage: false });
}
