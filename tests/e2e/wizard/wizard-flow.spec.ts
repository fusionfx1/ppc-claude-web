import { test, expect } from '@playwright/test';

/**
 * E2E Tests for LP Wizard Flow
 *
 * These tests verify the complete wizard flow for creating landing pages:
 * 1. Step 1: Brand & Domain
 * 2. Step 2: Product Configuration
 * 3. Step 3: Design Selection
 * 4. Step 4: Copy & Content
 * 5. Step 5: Tracking & Conversion
 * 6. Step 6: Review & Build
 */

test.describe('LP Wizard - Complete Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Click Create LP button
    const createBtn = page.getByRole('button').filter({ hasText: /Create LP/i });
    await createBtn.click();

    // Wait for wizard to appear
    await expect(page.getByText(/Brand/i)).toBeVisible({ timeout: 10000 });
  });

  /**
   * Test 1: Step 1 - Brand and Domain
   */
  test('should complete Step 1 - Brand and Domain', async ({ page }) => {
    // Verify we're on step 1
    await expect(page.getByText(/Brand/i)).toBeVisible();
    await expect(page.getByText(/Domain/i)).toBeVisible();

    // Fill in brand name
    const brandInput = page.getByPlaceholderText(/Brand Name/i);
    await brandInput.fill('E2E Test Brand');

    // Fill in domain
    const domainInput = page.getByPlaceholderText(/loanbridge/i);
    await domainInput.fill('e2e-test-loan.com');

    // Fill optional fields
    const taglineInput = page.getByPlaceholderText(/Fast. Simple. Trusted./i);
    await taglineInput.fill('Quick Loans, Simple Process');

    const emailInput = page.getByPlaceholderText(/support@/i);
    await emailInput.fill('support@e2e-test.com');

    // Click Next to proceed
    const nextBtn = page.getByRole('button').filter({ hasText: /Next.*→/i });
    await nextBtn.click();

    // Should now be on Product step
    await expect(page.getByText(/Product/i)).toBeVisible({ timeout: 5000 });
  });

  /**
   * Test 2: Step 1 - Validation errors
   */
  test('should show validation errors on Step 1 with empty fields', async ({ page }) => {
    // Try to proceed without filling fields
    const nextBtn = page.getByRole('button').filter({ hasText: /Next.*→/i });
    await nextBtn.click();

    // Should show validation errors
    await expect(page.getByText(/Brand Name is required/i)).toBeVisible();
    await expect(page.getByText(/Domain is required/i)).toBeVisible();
  });

  /**
   * Test 3: Step 1 - Invalid domain format
   */
  test('should reject invalid domain format', async ({ page }) => {
    // Fill brand but invalid domain
    const brandInput = page.getByPlaceholderText(/Brand Name/i);
    await brandInput.fill('Test Brand');

    const domainInput = page.getByPlaceholderText(/loanbridge/i);
    await domainInput.fill('invalid-domain-format');

    const nextBtn = page.getByRole('button').filter({ hasText: /Next.*→/i });
    await nextBtn.click();

    // Should show domain format error
    await expect(page.getByText(/Invalid domain format/i)).toBeVisible();
  });

  /**
   * Test 4: Step 2 - Product Configuration
   */
  test('should complete Step 2 - Product Configuration', async ({ page }) => {
    // Complete Step 1 first
    const brandInput = page.getByPlaceholderText(/Brand Name/i);
    await brandInput.fill('E2E Test Brand');

    const domainInput = page.getByPlaceholderText(/loanbridge/i);
    await domainInput.fill('e2e-test-loan.com');

    await page.getByRole('button').filter({ hasText: /Next.*→/i }).click();

    // Wait for Step 2
    await expect(page.getByText(/Product/i)).toBeVisible();

    // Select loan type
    const loanTypeDropdown = page.getByRole('combobox').first();
    await loanTypeDropdown.click();
    await page.getByRole('option', { name: /Personal/i }).click();

    // Fill amounts
    const minAmount = page.getByPlaceholderText(/100/i);
    await minAmount.fill('500');

    const maxAmount = page.getByPlaceholderText(/5000/i);
    await maxAmount.fill('10000');

    // Fill APR
    const minApr = page.getByPlaceholderText(/5.99/i);
    await minApr.fill('7.99');

    const maxApr = page.getByPlaceholderText(/35.99/i);
    await maxApr.fill('39.99');

    // Proceed to Step 3
    await page.getByRole('button').filter({ hasText: /Next.*→/i }).click();

    // Should be on Design step
    await expect(page.getByText(/Design/i)).toBeVisible({ timeout: 5000 });
  });

  /**
   * Test 5: Step 2 - Amount validation
   */
  test('should validate amount range on Step 2', async ({ page }) => {
    // Complete Step 1
    const brandInput = page.getByPlaceholderText(/Brand Name/i);
    await brandInput.fill('Test Brand');

    const domainInput = page.getByPlaceholderText(/loanbridge/i);
    await domainInput.fill('test.com');

    await page.getByRole('button').filter({ hasText: /Next.*→/i }).click();

    // Wait for Step 2
    await expect(page.getByText(/Product/i)).toBeVisible();

    // Select loan type
    const loanTypeDropdown = page.getByRole('combobox').first();
    await loanTypeDropdown.click();
    await page.getByRole('option').first().click();

    // Set Min >= Max (invalid)
    const minAmount = page.getByPlaceholderText(/100/i);
    await minAmount.fill('10000');

    const maxAmount = page.getByPlaceholderText(/5000/i);
    await maxAmount.fill('5000');

    // Try to proceed
    await page.getByRole('button').filter({ hasText: /Next.*→/i }).click();

    // Should show validation error
    await expect(page.getByText(/Min Amount must be less than Max/i)).toBeVisible();
  });

  /**
   * Test 6: Step 3 - Design Selection
   */
  test('should complete Step 3 - Design Selection', async ({ page }) => {
    // Complete Steps 1 and 2
    await completeStep1(page);
    await completeStep2(page);

    // Wait for Step 3
    await expect(page.getByText(/Design/i)).toBeVisible();

    // Select a color scheme
    const colorOption = page.locator('[data-color-id]').first();
    await colorOption.click();

    // Select a font
    const fontOption = page.locator('[data-font-id]').first();
    await fontOption.click();

    // Select a layout
    const layoutOption = page.locator('[data-layout-id]').first();
    await layoutOption.click();

    // Select border radius
    const radiusOption = page.locator('[data-radius-id]').first();
    await radiusOption.click();

    // Proceed to Step 4
    await page.getByRole('button').filter({ hasText: /Next.*→/i }).click();

    // Should be on Copy step
    await expect(page.getByText(/Copy/i)).toBeVisible({ timeout: 5000 });
  });

  /**
   * Test 7: Step 3 - Color selection required
   */
  test('should require color selection on Step 3', async ({ page }) => {
    // Complete Steps 1 and 2
    await completeStep1(page);
    await completeStep2(page);

    // Wait for Step 3
    await expect(page.getByText(/Design/i)).toBeVisible();

    // Try to proceed without selecting color
    await page.getByRole('button').filter({ hasText: /Next.*→/i }).click();

    // Should show validation error
    await expect(page.getByText(/Color Scheme is required/i)).toBeVisible();
  });

  /**
   * Test 8: Step 4 - Copy & Content
   */
  test('should complete Step 4 - Copy & Content', async ({ page }) => {
    // Complete Steps 1-3
    await completeStep1(page);
    await completeStep2(page);
    await completeStep3(page);

    // Wait for Step 4
    await expect(page.getByText(/Copy/i)).toBeVisible();

    // Fill headline
    const headlineInput = page.getByPlaceholderText(/Get Fast/i);
    await headlineInput.fill('Get Your E2E Test Loan Today');

    // Fill subheadline
    const subheadlineInput = page.getByPlaceholderText(/Simple. Fast./i);
    await subheadlineInput.fill('Quick approval in minutes');

    // Fill CTA text
    const ctaInput = page.getByPlaceholderText(/Apply Now/i);
    await ctaInput.fill('Get Started');

    // Fill benefits
    const benefitsInput = page.getByPlaceholderText(/No credit check/i);
    await benefitsInput.fill('Fast approval\nNo hidden fees\nFlexible terms');

    // Proceed to Step 5
    await page.getByRole('button').filter({ hasText: /Next.*→/i }).click();

    // Should be on Tracking step
    await expect(page.getByText(/Tracking/i)).toBeVisible({ timeout: 5000 });
  });

  /**
   * Test 9: Step 5 - Tracking & Conversion
   */
  test('should complete Step 5 - Tracking & Conversion', async ({ page }) => {
    // Complete Steps 1-4
    await completeStep1(page);
    await completeStep2(page);
    await completeStep3(page);
    await completeStep4(page);

    // Wait for Step 5
    await expect(page.getByText(/Tracking/i)).toBeVisible();

    // Fill redirect URL
    const redirectInput = page.getByPlaceholderText(/https:\/\//i);
    await redirectInput.fill('https://example.com/apply');

    // Fill tracking pixel (optional)
    const pixelInput = page.getByPlaceholderText(/FB/i);
    await pixelInput.fill('facebook-pixel-code-123');

    // Proceed to Step 6
    await page.getByRole('button').filter({ hasText: /Next.*→/i }).click();

    // Should be on Review step
    await expect(page.getByText(/Review/i)).toBeVisible({ timeout: 5000 });
  });

  /**
   * Test 10: Step 5 - Requires redirect URL or form embed
   */
  test('should require redirect URL or form embed on Step 5', async ({ page }) => {
    // Complete Steps 1-4
    await completeStep1(page);
    await completeStep2(page);
    await completeStep3(page);
    await completeStep4(page);

    // Wait for Step 5
    await expect(page.getByText(/Tracking/i)).toBeVisible();

    // Try to proceed without filling redirect or form embed
    await page.getByRole('button').filter({ hasText: /Next.*→/i }).click();

    // Should show validation error
    await expect(page.getByText(/At least one destination required/i)).toBeVisible();
  });

  /**
   * Test 11: Step 5 - Invalid URL validation
   */
  test('should reject invalid redirect URL format', async ({ page }) => {
    // Complete Steps 1-4
    await completeStep1(page);
    await completeStep2(page);
    await completeStep3(page);
    await completeStep4(page);

    // Wait for Step 5
    await expect(page.getByText(/Tracking/i)).toBeVisible();

    // Fill invalid URL
    const redirectInput = page.getByPlaceholderText(/https:\/\//i);
    await redirectInput.fill('not-a-valid-url');

    await page.getByRole('button').filter({ hasText: /Next.*→/i }).click();

    // Should show URL format error
    await expect(page.getByText(/Redirect URL must be a valid URL/i)).toBeVisible();
  });

  /**
   * Test 12: Step 6 - Review & Build
   */
  test('should show review summary on Step 6', async ({ page }) => {
    // Complete all steps
    await completeStep1(page);
    await completeStep2(page);
    await completeStep3(page);
    await completeStep4(page);
    await completeStep5(page);

    // Wait for Step 6
    await expect(page.getByText(/Review/i)).toBeVisible();

    // Verify review elements are shown
    await expect(page.getByText(/Build & Deploy/i)).toBeVisible();

    // Should show summary of selections
    // Brand info
    await expect(page.getByText(/E2E Test Brand/i)).toBeVisible();

    // Product info
    await expect(page.getByText(/\$500/i)).toBeVisible(); // Min amount

    // Action buttons
    await expect(page.getByRole('button').filter({ hasText: /Back/i })).toBeVisible();
    await expect(page.getByRole('button').filter({ hasText: /Cancel/i })).toBeVisible();
  });

  /**
   * Test 13: Navigate back through steps
   */
  test('should navigate back to previous steps', async ({ page }) => {
    // Complete Step 1
    await completeStep1(page);

    // Complete Step 2
    const loanTypeDropdown = page.getByRole('combobox').first();
    await loanTypeDropdown.click();
    await page.getByRole('option').first().click();

    await page.getByRole('button').filter({ hasText: /Next.*→/i }).click();

    // Now on Step 3, click Back
    const backBtn = page.getByRole('button').filter({ hasText: /←.*Back/i });
    await backBtn.click();

    // Should be back on Step 2
    await expect(page.getByText(/Product/i)).toBeVisible();
  });

  /**
   * Test 14: Cancel wizard
   */
  test('should cancel wizard and return to dashboard', async ({ page }) => {
    // Click Cancel button
    const cancelBtn = page.getByRole('button').filter({ hasText: /Cancel/i });
    await cancelBtn.click();

    // Should be back on main page
    await expect(page.getByText(/My Sites/i)).toBeVisible({ timeout: 5000 });
  });

  /**
   * Test 15: Complete wizard flow with minimal data
   */
  test('should complete full wizard with minimal valid data', async ({ page }) => {
    // This test fills only required fields
    // Step 1
    const brandInput = page.getByPlaceholderText(/Brand Name/i);
    await brandInput.fill('Minimal Brand');

    const domainInput = page.getByPlaceholderText(/loanbridge/i);
    await domainInput.fill('minimal.com');

    await page.getByRole('button').filter({ hasText: /Next.*→/i }).click();

    // Step 2
    const loanTypeDropdown = page.getByRole('combobox').first();
    await loanTypeDropdown.click();
    await page.getByRole('option').first().click();

    await page.getByRole('button').filter({ hasText: /Next.*→/i }).click();

    // Step 3
    const colorOption = page.locator('[data-color-id]').first();
    await colorOption.click();

    await page.getByRole('button').filter({ hasText: /Next.*→/i }).click();

    // Step 4
    await page.getByRole('button').filter({ hasText: /Next.*→/i }).click();

    // Step 5
    const redirectInput = page.getByPlaceholderText(/https:\/\//i);
    await redirectInput.fill('https://example.com');

    await page.getByRole('button').filter({ hasText: /Next.*→/i }).click();

    // Step 6 - Review
    await expect(page.getByText(/Review/i)).toBeVisible();
    await expect(page.getByText(/Build & Deploy/i)).toBeVisible();
  });
});

/**
 * Helper functions to complete wizard steps
 */
async function completeStep1(page: any) {
  const brandInput = page.getByPlaceholderText(/Brand Name/i);
  await brandInput.fill('E2E Test Brand');

  const domainInput = page.getByPlaceholderText(/loanbridge/i);
  await domainInput.fill('e2e-test-loan.com');

  await page.getByRole('button').filter({ hasText: /Next.*→/i }).click();
  await page.waitForTimeout(500);
}

async function completeStep2(page: any) {
  const loanTypeDropdown = page.getByRole('combobox').first();
  await loanTypeDropdown.click();
  await page.getByRole('option', { name: /Personal/i }).click();

  const minAmount = page.getByPlaceholderText(/100/i);
  await minAmount.fill('500');

  const maxAmount = page.getByPlaceholderText(/5000/i);
  await maxAmount.fill('10000');

  const minApr = page.getByPlaceholderText(/5.99/i);
  await minApr.fill('7.99');

  const maxApr = page.getByPlaceholderText(/35.99/i);
  await maxApr.fill('39.99');

  await page.getByRole('button').filter({ hasText: /Next.*→/i }).click();
  await page.waitForTimeout(500);
}

async function completeStep3(page: any) {
  const colorOption = page.locator('[data-color-id]').first();
  await colorOption.click();

  const fontOption = page.locator('[data-font-id]').first();
  await fontOption.click();

  await page.getByRole('button').filter({ hasText: /Next.*→/i }).click();
  await page.waitForTimeout(500);
}

async function completeStep4(page: any) {
  const headlineInput = page.getByPlaceholderText(/Get Fast/i);
  await headlineInput.fill('Get Your E2E Test Loan Today');

  await page.getByRole('button').filter({ hasText: /Next.*→/i }).click();
  await page.waitForTimeout(500);
}

async function completeStep5(page: any) {
  const redirectInput = page.getByPlaceholderText(/https:\/\//i);
  await redirectInput.fill('https://example.com/apply');

  await page.getByRole('button').filter({ hasText: /Next.*→/i }).click();
  await page.waitForTimeout(500);
}
