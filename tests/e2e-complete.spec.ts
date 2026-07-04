import { test, expect } from '@playwright/test';
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load env from backend/.env
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const connectionString = process.env.DATABASE_URL;

test('complete user journey: signup, verify email, login, solve problem, run and submit', async ({ page }) => {
  // 1. Generate randomized user info
  const randomId = Math.floor(100000 + Math.random() * 900000);
  const username = `e2e_user_${randomId}`;
  const email = `e2e_user_${randomId}@example.com`;
  const password = `Password123!`;

  console.log(`E2E Test: Registering user ${username} (${email})...`);

  // 2. Navigate to signup page
  await page.goto('/signup');
  
  // 3. Fill and submit registration form
  await page.fill('#username', username);
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.fill('#confirmPassword', password);
  await page.click('button[type="submit"]');

  // Wait for registration to complete and show success message
  const statusAlert = page.locator('[role="status"], [role="alert"], text=Registration successful');
  await expect(statusAlert.first()).toBeVisible({ timeout: 15000 });

  // 4. Retrieve verification token from PostgreSQL database
  expect(connectionString).toBeDefined();
  const pgClient = new Client({ connectionString });
  await pgClient.connect();
  
  let token: string | null = null;
  try {
    const res = await pgClient.query('SELECT "verification_token" FROM "user" WHERE email = $1', [email]);
    if (res.rows.length > 0) {
      token = res.rows[0].verification_token;
    }
  } finally {
    await pgClient.end();
  }

  expect(token).not.toBeNull();
  console.log(`E2E Test: verification token retrieved from DB: ${token}`);

  // 5. Verify email via endpoint
  // Note: the verification endpoint is handled by backend. We can hit the backend verify-email endpoint
  // which will redirect or return success. Let's make an API request using page.request
  const verifyRes = await page.request.get(`http://localhost:8000/api/v1/auth/verify-email?token=${token}`);
  expect(verifyRes.ok()).toBeTruthy();
  console.log('E2E Test: email verified successfully via API request.');

  // 6. Go to Login page
  await page.goto('/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');

  // 7. Verify we are redirected to the homepage or dashboard and logged in
  await expect(page).toHaveURL('/', { timeout: 15000 });
  console.log('E2E Test: successfully logged in and redirected to root.');

  // 8. Go to problems list and select a problem
  await page.goto('/problems');
  
  // Find a problem link and click it. Since "Contains Duplicate" or "Two Sum" should be there
  // Let's look for a card and click its link
  const problemLink = page.locator('a[href*="/problems/"]').first();
  await expect(problemLink).toBeVisible({ timeout: 20000 });
  await problemLink.click();

  // Verify we are on the problem detail page
  await expect(page).toHaveURL(/\/problems\/.+/);
  console.log('E2E Test: navigated to problem detail page.');

  // 9. Monaco editor interactions
  // Wait for editor to render
  const editor = page.locator('.monaco-editor').first();
  await expect(editor).toBeVisible({ timeout: 20000 });
  
  // Wait for the Monaco language dropdown to select Python if we want to submit Python code, or let it stay default
  const langSelect = page.locator('select').first(); // Language select is usually a select element
  if (await langSelect.isVisible()) {
    // Check if Python option exists, select it
    const pythonOption = langSelect.locator('option[value="python"]').or(langSelect.locator('option[value="PYTHON"]'));
    if (await pythonOption.count() > 0) {
      await langSelect.selectOption({ label: 'Python' });
    }
  }

  // Type the code
  await editor.click();
  // Clear existing code
  // Press Command+A / Control+A then Backspace
  const isMac = process.platform === 'darwin';
  const modifier = isMac ? 'Meta' : 'Control';
  await page.keyboard.press(`${modifier}+A`);
  await page.keyboard.press('Backspace');

  // Input simple Python code that prints the input (mirroring fallback solution)
  // This will read the input and print it out to pass sample testcases
  const pythonCode = `import sys
input_data = sys.stdin.read().strip()
print(input_data)
`;
  await page.keyboard.type(pythonCode);
  console.log('E2E Test: typed solution code into Monaco editor.');

  // 10. Click submit button and verify verdict
  const submitBtn = page.getByRole('button', { name: 'Submit' });
  await expect(submitBtn).toBeVisible();
  await submitBtn.click();
  console.log('E2E Test: clicked Submit button. Waiting for execution result...');

  // Verify submission result updates in the console panel
  // Let's wait for a heading that shows the result
  const verdictHeading = page.locator('h3').filter({ hasText: /ACCEPTED|COMPLETED|WRONG_ANSWER|TIME_LIMIT_EXCEEDED|RUNTIME_ERROR/i });
  await expect(verdictHeading.first()).toBeVisible({ timeout: 45000 });

  const finalVerdict = await verdictHeading.first().innerText();
  console.log(`E2E Test: Submission completed with verdict: ${finalVerdict}`);
  
  // The test should pass as long as it reaches a terminal verdict
  expect(finalVerdict).toMatch(/ACCEPTED|COMPLETED|WRONG_ANSWER/i);
});
