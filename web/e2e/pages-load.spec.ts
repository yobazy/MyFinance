import { expect, test } from '@playwright/test';

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

async function signInWithEmail(page: import('@playwright/test').Page, opts?: { next?: string }) {
  const next = opts?.next ?? '/';
  await page.goto(`/login?next=${encodeURIComponent(next)}`);

  await page.getByLabel('Email').fill(email!);
  await page.getByLabel('Password').fill(password!);
  await page.getByRole('button', { name: 'Sign in with email' }).click();

  // Wait for redirect away from /login (PublicLanding pushes to next on auth state change).
  await expect(page).not.toHaveURL(/\/login(\?|$)/);
}

test.describe('pages load', () => {
  test('public /login loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue with GitHub' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
  });

  test('authenticated pages load (headings render)', async ({ page }) => {
    test.skip(!email || !password, 'Set E2E_EMAIL and E2E_PASSWORD to run authenticated page-load tests.');

    await signInWithEmail(page, { next: '/' });

    const routes: Array<{ path: string; heading: string | RegExp }> = [
      { path: '/', heading: 'Dashboard' },
      { path: '/accounts', heading: 'Manage Accounts' },
      { path: '/upload', heading: 'Upload statements' },
      { path: '/transactions', heading: 'Transactions' },
      { path: '/visualizations', heading: 'Analytics' },
      { path: '/categorization', heading: 'Categories' },
      { path: '/rules', heading: 'Rules' },
      { path: '/help', heading: 'Help' },
      { path: '/user-settings', heading: 'Settings' },
    ];

    for (const r of routes) {
      await page.goto(r.path);
      await expect(page.getByRole('heading', { name: r.heading })).toBeVisible();
    }
  });
});

