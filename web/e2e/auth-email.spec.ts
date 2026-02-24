import { expect, test } from '@playwright/test';

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe('auth (email/password)', () => {
  test('redirects to login and returns to intended route after sign-in', async ({ page }) => {
    test.skip(!email || !password, 'Set E2E_EMAIL and E2E_PASSWORD to run this smoke test.');

    await page.goto('/transactions');

    await expect(page).toHaveURL(/\/login\?next=/);

    await page.getByLabel('Email').fill(email!);
    await page.getByLabel('Password').fill(password!);
    await page.getByRole('button', { name: 'Sign in with email' }).click();

    await expect(page).toHaveURL(/\/transactions\/?$/);
    await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible();
  });
});

