import test, { BrowserContext, Page, Response, chromium, expect } from '@playwright/test';

const playerLength = Number(process.env.TEST_STOCK_PLAYER_LENGTH);

test('stock', async () => {
  // 브라우저 인스턴스 생성
  const browser = await chromium.launch({
    headless: false, // GUI로 확인하기 위해 headless 모드 비활성화
  });

  const sessions: { context: BrowserContext; page: Page; isAdmin: boolean }[] = [];

  for (let i = 0; i < playerLength + 1; i++) {
    // 각 세션마다 새로운 컨텍스트(=세션) 생성
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('http://local.socialdev.club:5173');

      // 마지막 세션은 백오피스 관리하는 관리자
      const isAdmin = i === playerLength;
      sessions.push({ context, isAdmin, page });

      console.log(`세션 ${i + 1} 생성 완료`);
    } catch (error) {
      console.error(`세션 ${i + 1} 생성 실패:`, error);
    }
  }

  // 세션 하나씩 `다른 방법으로 로그인` 버튼이 노출되면 클릭
  for (const session of sessions) {
    const loginButton = await session.page.locator('button:has-text("다른 방법으로 로그인")');
    await loginButton.click();
  }

  // 세션 로그인 시키기
  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i];

    const emailInput = session.page.locator('input[name="email"]');
    await emailInput.fill(`test${i + 1 < 10 ? '0' : ''}${i + 1}@socialdev.club`);

    const passwordInput = session.page.locator('input[name="password"]');
    await passwordInput.fill(process.env.TEST_PASSWORD || '');

    const loginButton = session.page.locator('button:has-text("로그인")');
    await loginButton.click();
    await loginButton.waitFor({ state: 'hidden' });

    const loginingButton = session.page.locator('button:has-text("로그인 중...")');
    await loginingButton.waitFor({ state: 'hidden' });

    // `Request rate limit reached` 노출되면 테스트 실패
    const errorMessage = session.page.locator('span:has-text("Request rate limit reached")');
    if (await errorMessage.isVisible()) {
      throw new Error(`세션 ${i + 1} 로그인 실패: Request rate limit reached`);
    }

    console.log(`세션 ${i + 1} 로그인 완료`);
  }

  const backofficeSession = sessions.find(({ isAdmin }) => isAdmin)!;
  await backofficeSession.page.goto('http://local.socialdev.club:5173/backoffice/party');

  // title 지정
  const title = `TEST_PARTY_${new Date().getTime()}`;
  const titleInput = backofficeSession.page.locator('input[name="title"]');
  await titleInput.fill(title);

  // 전체 인원 지정
  const limitAllCountInput = backofficeSession.page.locator('input[name="limitAllCount"]');
  await limitAllCountInput.fill('100');

  const partyId = await new Promise<string>((resolve) => {
    const handlerResponse = async (response: Response): Promise<void> => {
      if (response.url().endsWith('/party') && response.request().method() === 'POST') {
        const responseJson = await response.json();

        const partyId = responseJson._id;
        backofficeSession.context.off('response', handlerResponse);
        resolve(partyId);
      }
    };
    backofficeSession.context.on('response', handlerResponse);

    // 파티 생성 버튼 클릭
    const partyCreateButton = backofficeSession.page.locator('button:has-text("생성")');
    partyCreateButton.click();
  });

  await Promise.all(
    sessions.map(async (session) => {
      if (session.isAdmin) {
        return;
      }

      await session.page.reload();
      await session.page.waitForLoadState('domcontentloaded');

      // data-id === partyId 인 버튼 클릭
      const partyButton = session.page.locator(`button[data-id="${partyId}"]`);
      await partyButton.click({ timeout: 5000 });

      // 주소 바뀔때까지 대기
      await session.page.waitForURL((url) => url.pathname.includes(`party`), { timeout: 5000 });
    }),
  );

  await backofficeSession.page.goto(`http://local.socialdev.club:5173/backoffice/stock`);

  const stockId = await new Promise<string>((resolve) => {
    const handlerResponse = async (response: Response): Promise<void> => {
      if (response.url().endsWith('/stock/create') && response.request().method() === 'POST') {
        if (!`${response.status()}`.startsWith('2')) {
          throw new Error(`파티 생성 실패: ${response.status()}`);
        }
        const responseJson = await response.json();

        const stockId = responseJson._id;
        backofficeSession.context.off('response', handlerResponse);
        resolve(stockId);
      }
    };
    backofficeSession.context.on('response', handlerResponse);

    // `주식게임 세션 생성` 버튼 클릭
    const stockCreateButton = backofficeSession.page.locator('button:has-text("주식게임 세션 생성")');
    stockCreateButton.click();
  });

  await backofficeSession.page.goto(`http://local.socialdev.club:5173/backoffice/party/${partyId}`);

  // input type="radio" and value="STOCK"
  const stockRadio = backofficeSession.page.locator('input[type="radio"][value="STOCK"]');
  await stockRadio.click();

  const activityNameInput = backofficeSession.page.locator('input[name="activityName"]');
  await activityNameInput.fill(stockId);

  // `적용` 버튼 클릭
  const applyButton = backofficeSession.page.locator('button:has-text("적용")');
  await applyButton.click();

  // 주식게임 백오피스 이동
  await backofficeSession.page.goto(`http://local.socialdev.club:5173/backoffice/stock/${stockId}`);

  // 주식게임 백오피스 이동 후 참가자 등록 대기
  await new Promise((resolve) => {
    setTimeout(resolve, 2000);
  });

  // `주식 초기화` 버튼 클릭
  const stockResetButton = backofficeSession.page.locator('button:has-text("주식 초기화")');
  await stockResetButton.click();

  // 주식 초기화 대기
  await new Promise((resolve) => {
    setTimeout(resolve, 2000);
  });

  // `주식 거래 활성화` 버튼 클릭
  const stockTradeActivateButton = backofficeSession.page.locator('button:has-text("주식 거래 활성화")');
  await stockTradeActivateButton.click();

  while (true) {
    await Promise.all([
      sessions.map(async (session, i) => {
        if (session.isAdmin) {
          return;
        }

        try {
          await session.page.goto(`http://local.socialdev.club:5173/party/${partyId}?page=사기`);
          await session.page.waitForLoadState('domcontentloaded');

          // 여러 개의 활성화된 `사기` 버튼 중 하나 클릭
          const buyButtons = session.page.locator('button[name="buy"]');
          await expect(buyButtons.first()).toBeVisible();
          const buyButtonCount = await buyButtons.count();
          await buyButtons.nth(Math.floor(Math.random() * buyButtonCount)).click();

          await session.page.goto(`http://local.socialdev.club:5173/party/${partyId}?page=팔기`);
          await session.page.waitForLoadState('domcontentloaded');

          // 여러 개의 활성화된 `팔기` 버튼 중 하나 클릭
          const sellButtons = session.page.locator('button[name="sell"]');
          const sellButtonCount = await sellButtons.count();
          await sellButtons.nth(Math.floor(Math.random() * sellButtonCount)).click();
        } catch (error) {
          console.error(`세션 ${i + 1} 사기/팔기 에러:`, error);
        }
      }),
      new Promise((resolve) => {
        setTimeout(resolve, 5000);
      }),
    ]);
  }

  // 모든 세션이 유지되도록 대기
  await new Promise((resolve) => {
    setTimeout(resolve, 5000);
  });

  // 정리: 모든 세션 종료
  for (const session of sessions) {
    await session.page.close();
    await session.context.close();
  }
  await browser.close();
});
