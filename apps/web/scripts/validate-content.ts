/**
 * Build-time content gate. Runs before `next build` via the `prebuild` script.
 *
 * `portfolio.ts` asserts the JSON's type rather than parsing it, so that the
 * schema and `zod` never enter the application bundle. This script is the other
 * half of that trade: it proves the assertion holds against the real file, and
 * fails the build if it does not.
 *
 * Kept separate from the test suite on purpose. `bun test` proves the schema is
 * correct; this proves the *content* is valid, and it has to run even when
 * someone builds without testing.
 */

import portfolioJson from "../app/data/portfolio.json";
import { PortfolioSchema } from "../app/data/portfolio.schema";

const result = PortfolioSchema.safeParse(portfolioJson);

if (!result.success) {
  const report = result.error.issues
    .map((issue) => {
      const path = issue.path.join(".") || "<root>";
      return `  ${path}\n      ${issue.message}`;
    })
    .join("\n");

  console.error(
    [
      "",
      "  portfolio.json is not valid content.",
      "",
      `  ${result.error.issues.length} problem(s) found:`,
      "",
      report,
      "",
      "  Fix app/data/portfolio.json, or update app/data/portfolio.schema.ts if",
      "  the rule itself is wrong. The build stops here because invalid content",
      "  renders as a blank region in the browser rather than an error.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

const { sections, posts, socials } = result.data;
console.log(
  `  content ok — ${sections.length} sections, ${posts.length} posts, ${socials.length} socials`,
);
