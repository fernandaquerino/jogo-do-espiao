import { expect, test } from '@playwright/test'
import type { Browser, Page } from '@playwright/test'

async function newPlayer(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  return context.newPage()
}

async function readRole(page: Page): Promise<{ spy: boolean; text: string }> {
  await page.getByRole('button', { name: 'Reveal role' }).click()
  const text = (await page.locator('.role-box').innerText()).replace(/\s+/g, ' ').trim()
  return { spy: text.includes('You are the spy'), text }
}

test('three players: create room, join, play one round and see a matching result', async ({ browser }) => {
  const host = await newPlayer(browser)
  const bia = await newPlayer(browser)
  const cal = await newPlayer(browser)

  // Host creates the room.
  await host.goto('/online')
  await host.getByLabel('Your nickname').first().fill('Ana')
  await host.getByRole('button', { name: 'Create room' }).click()
  await host.waitForURL(/\/room\/[A-Z0-9]{6}$/)
  const code = host.url().split('/').pop()!
  await expect(host.getByRole('heading', { level: 1 })).toHaveText(code)

  // Two players join through the share link.
  for (const [page, nickname] of [[bia, 'Bia'], [cal, 'Cal']] as const) {
    await page.goto(`/room/${code}`)
    await page.getByLabel('Your nickname').fill(nickname)
    await page.getByRole('button', { name: 'Join room' }).click()
  }
  await expect(host.getByText('Players (3)')).toBeVisible()
  await expect(bia.getByText('Waiting for the host to start the round')).toBeVisible()
  await expect(bia.getByRole('button', { name: 'Start round' })).toHaveCount(0)

  // Start the round: everyone gets exactly one private role.
  await host.getByRole('button', { name: 'Start round' }).click()
  const players = [host, bia, cal]
  const roles = []
  for (const page of players) {
    roles.push(await readRole(page))
  }

  expect(roles.filter((role) => role.spy)).toHaveLength(1)
  const regulars = roles.filter((role) => !role.spy)
  expect(regulars).toHaveLength(2)
  expect(regulars[0]!.text).toBe(regulars[1]!.text)
  const location = regulars[0]!.text.replace(/^Location\s*/, '')

  // Nobody's page shows another player's role or the spy's identity yet.
  for (const [index, page] of players.entries()) {
    if (roles[index]!.spy) {
      await expect(page.locator('body')).not.toContainText(location)
    }
    await expect(page.getByText('Regular player')).toHaveCount(0)
  }

  // Playing: shared countdown, first asker visible, only the host can end.
  for (const page of players) {
    await page.getByRole('button', { name: 'I am ready' }).click()
    await expect(page.getByText('Asks first')).toBeVisible()
    await expect(page.getByRole('timer')).toContainText(/0[45]:\d\d/)
  }
  await expect(bia.getByRole('button', { name: 'End round' })).toHaveCount(0)

  // Host ends the round: everyone sees the same location and the right spy.
  await host.getByRole('button', { name: 'End round' }).click()
  const spyName = ['Ana', 'Bia', 'Cal'][roles.findIndex((role) => role.spy)]!
  for (const page of players) {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(location)
    await expect(page.getByRole('heading', { level: 2 }).first()).toHaveText(spyName)
  }

  // Host goes back to the lobby; everyone follows.
  await host.getByRole('button', { name: 'Back to lobby' }).click()
  await expect(bia.getByText('Waiting for the host to start the round')).toBeVisible()
})

test('a player who reloads the page keeps their seat and role', async ({ browser }) => {
  const host = await newPlayer(browser)
  const bia = await newPlayer(browser)
  const cal = await newPlayer(browser)

  await host.goto('/online')
  await host.getByLabel('Your nickname').first().fill('Ana')
  await host.getByRole('button', { name: 'Create room' }).click()
  await host.waitForURL(/\/room\/[A-Z0-9]{6}$/)
  const code = host.url().split('/').pop()!

  for (const [page, nickname] of [[bia, 'Bia'], [cal, 'Cal']] as const) {
    await page.goto(`/room/${code}`)
    await page.getByLabel('Your nickname').fill(nickname)
    await page.getByRole('button', { name: 'Join room' }).click()
  }
  await expect(host.getByText('Players (3)')).toBeVisible()
  await host.getByRole('button', { name: 'Start round' }).click()

  const before = await readRole(bia)
  await bia.reload()
  const after = await readRole(bia)
  expect(after.text).toBe(before.text)
  await expect(host.getByText('Players (3)')).toHaveCount(0)
})
