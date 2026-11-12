import { expect, test } from '@playwright/test'
import type { Browser, Page } from '@playwright/test'

async function newPlayer(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  return context.newPage()
}

async function readRole(page: Page): Promise<{ spy: boolean; text: string }> {
  await page.getByRole('button', { name: 'Revelar papel' }).click()
  const text = (await page.locator('.role-box').innerText()).replace(/\s+/g, ' ').trim()
  return { spy: text.includes('Você é o espião'), text }
}

test('three players: create room, join, play one round and see a matching result', async ({ browser }) => {
  const host = await newPlayer(browser)
  const bia = await newPlayer(browser)
  const cal = await newPlayer(browser)

  // Host creates the room.
  await host.goto('/online')
  await host.getByLabel('Seu apelido').first().fill('Ana')
  await host.getByRole('button', { name: 'Criar sala' }).click()
  await host.waitForURL(/\/sala\/[A-Z0-9]{6}$/)
  const code = host.url().split('/').pop()!
  await expect(host.getByRole('heading', { level: 1 })).toHaveText(code)

  // Two players join through the share link.
  for (const [page, nickname] of [[bia, 'Bia'], [cal, 'Cal']] as const) {
    await page.goto(`/sala/${code}`)
    await page.getByLabel('Seu apelido').fill(nickname)
    await page.getByRole('button', { name: 'Entrar na sala' }).click()
  }
  await expect(host.getByText('Jogadores (3)')).toBeVisible()
  await expect(bia.getByText('Aguardando o anfitrião iniciar a rodada')).toBeVisible()
  await expect(bia.getByRole('button', { name: 'Iniciar rodada' })).toHaveCount(0)

  // Start the round: everyone gets exactly one private role.
  await host.getByRole('button', { name: 'Iniciar rodada' }).click()
  const players = [host, bia, cal]
  const roles = []
  for (const page of players) {
    roles.push(await readRole(page))
  }

  expect(roles.filter((role) => role.spy)).toHaveLength(1)
  const regulars = roles.filter((role) => !role.spy)
  expect(regulars).toHaveLength(2)
  expect(regulars[0]!.text).toBe(regulars[1]!.text)
  const location = regulars[0]!.text.replace(/^Lugar\s*/, '')

  // Nobody's page shows another player's role or the spy's identity yet.
  for (const [index, page] of players.entries()) {
    if (roles[index]!.spy) {
      await expect(page.locator('body')).not.toContainText(location)
    }
    await expect(page.getByText('Jogador comum')).toHaveCount(0)
  }

  // Playing: shared countdown, first asker visible, only the host can end.
  for (const page of players) {
    await page.getByRole('button', { name: 'Estou pronto' }).click()
    await expect(page.getByText('Começa perguntando')).toBeVisible()
    await expect(page.getByRole('timer')).toContainText(/0[45]:\d\d/)
  }
  await expect(bia.getByRole('button', { name: 'Finalizar rodada' })).toHaveCount(0)

  // Host ends the round: everyone sees the same location and the right spy.
  await host.getByRole('button', { name: 'Finalizar rodada' }).click()
  const spyName = ['Ana', 'Bia', 'Cal'][roles.findIndex((role) => role.spy)]!
  for (const page of players) {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(location)
    await expect(page.getByRole('heading', { level: 2 }).first()).toHaveText(spyName)
  }

  // Host goes back to the lobby; everyone follows.
  await host.getByRole('button', { name: 'Voltar ao lobby' }).click()
  await expect(bia.getByText('Aguardando o anfitrião iniciar a rodada')).toBeVisible()
})

test('a player who reloads the page keeps their seat and role', async ({ browser }) => {
  const host = await newPlayer(browser)
  const bia = await newPlayer(browser)
  const cal = await newPlayer(browser)

  await host.goto('/online')
  await host.getByLabel('Seu apelido').first().fill('Ana')
  await host.getByRole('button', { name: 'Criar sala' }).click()
  await host.waitForURL(/\/sala\/[A-Z0-9]{6}$/)
  const code = host.url().split('/').pop()!

  for (const [page, nickname] of [[bia, 'Bia'], [cal, 'Cal']] as const) {
    await page.goto(`/sala/${code}`)
    await page.getByLabel('Seu apelido').fill(nickname)
    await page.getByRole('button', { name: 'Entrar na sala' }).click()
  }
  await expect(host.getByText('Jogadores (3)')).toBeVisible()
  await host.getByRole('button', { name: 'Iniciar rodada' }).click()

  const before = await readRole(bia)
  await bia.reload()
  const after = await readRole(bia)
  expect(after.text).toBe(before.text)
  await expect(host.getByText('Jogadores (3)')).toHaveCount(0)
})
