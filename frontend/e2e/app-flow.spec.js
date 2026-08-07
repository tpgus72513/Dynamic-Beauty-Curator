import { expect, test } from '@playwright/test'


test('nickname, camera analysis, recommendation, and logout flow', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()

  await page.getByLabel('닉네임').fill('민지')
  await page.getByRole('button', { name: '계속하기' }).click()
  await page.getByRole('button', { name: '시작하기' }).click()

  await expect(page.getByRole('heading', { name: '위치 정보 허용' })).toBeVisible()
  await page.getByRole('button', { name: '허용하기' }).click()
  await expect(page.getByRole('heading', { name: '카메라 접근 허용' })).toBeVisible()
  await page.getByRole('button', { name: '허용하기' }).click()

  await expect(page.getByRole('heading', { name: /평소 피부 타입/ })).toBeVisible()
  await page.getByRole('button', { name: '시작하기' }).click()
  await expect(page.getByText(/민지님/).first()).toBeVisible()

  await page.getByRole('button', { name: '얼굴 분석 시작' }).click()
  await expect.poll(
    () => page.locator('video').evaluate(video => (
      Boolean(video.srcObject) && video.videoWidth > 0 && video.videoHeight > 0
    )),
  ).toBe(true)
  const analyzeResponsePromise = page.waitForResponse(response => (
    response.url().endsWith('/api/analyze')
    && response.request().method() === 'POST'
  ))
  await page.getByRole('button', { name: '얼굴 사진 촬영' }).click()

  const analyzeResponse = await analyzeResponsePromise
  expect(analyzeResponse.status()).toBe(200)
  const analyzeBody = await analyzeResponse.json()
  expect(analyzeBody.model).toEqual({
    name: 'efficientnetb2_skin_multitask',
    version: 'e835bb5686ff',
  })
  expect(Object.keys(analyzeBody.skin_analysis)).toEqual([
    'pigmentation',
    'dryness',
    'pore',
    'wrinkle',
    'sensitivity',
  ])

  await expect(page.getByText('분석 결과', { exact: true })).toBeVisible({ timeout: 90_000 })
  const riskList = page.getByRole('list', { name: '5가지 피부 위험도' })
  await expect(riskList.getByRole('listitem')).toHaveCount(5)
  for (const label of ['색소침착', '건조', '모공', '주름', '민감']) {
    await expect(riskList.getByText(label, { exact: true })).toBeVisible()
  }
  await expect(page.getByText(/의료 진단이 아닌/)).toBeVisible()

  await page.getByRole('button', { name: '맞춤 제품 보기' }).click()
  const productList = page.getByRole('list', { name: '맞춤 추천 제품' })
  await expect(productList.getByRole('listitem').first()).toBeVisible()

  await page.getByRole('button', { name: '뒤로' }).click()
  await page.getByRole('button', { name: '뒤로' }).click()
  await page.getByRole('button', { name: '마이 페이지' }).click()
  await expect(page.getByText('민지', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '로그아웃' }).click()
  await expect(page.getByLabel('닉네임')).toBeVisible()
})
