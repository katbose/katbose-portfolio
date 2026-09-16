import { expect, portfolio, test, waitForHydration } from "./fixtures";

test("loads GitHub contributions only when their section approaches the viewport", async ({
  page,
}) => {
  const section = portfolio.sections.find((item) => item.type === "github");
  test.skip(!section, "Portfolio has no GitHub section");
  if (!section) return;

  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("github-contributions-api")) requests.push(request.url());
  });
  await page.goto("/");
  await waitForHydration(page);
  await expect(page.getByTestId("local-time")).not.toHaveText("00:00:00");
  expect(requests).toHaveLength(0);

  await page.getByRole("heading", { name: section.title, exact: true }).scrollIntoViewIfNeeded();
  await expect.poll(() => requests.length).toBeGreaterThan(0);
});
