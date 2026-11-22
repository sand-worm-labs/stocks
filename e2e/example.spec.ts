import { expect, test } from "@playwright/test"

test("opens on the home screen", async ({ page }) => {
  await page.goto("./")

  await expect(page).toHaveTitle(/Home/)
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
})

test("switches the markets filter", async ({ page }) => {
  await page.goto("./markets")
  await page.getByRole("link", { name: /^You hold/ }).click()

  await expect(page).toHaveURL(/filter=held/)
})
