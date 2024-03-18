import { PNG } from "pngjs";
import { fixture, test,ClientFunction  } from "testcafe";
import { readFileSync } from "fs";
import { join as joinPath } from "path";

const allowedChars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_";
export function mkValidPath(path: string): string {
	return path.split("").map(char => allowedChars.includes(char) ? char : "_").join("");
}

export const getWindowInnerDimensions = ClientFunction(() => ({width: window.innerWidth, height: window.innerHeight}));
// @ts-expect-error
export const getWindowJQueryDimensions = ClientFunction(() => ({width: jQuery(window).width(), height: jQuery(window).height()}));
export const getWindowDevicePixelRatio = ClientFunction(() => window.devicePixelRatio);

const targetDimensions = {width: 640, height: 480};

async function getDpAdjustedExpectedScreenshotDimensions() {
    // on retina displays the screenshots are twice as big
    const devicePixelRatio = await getWindowDevicePixelRatio();
    const width = targetDimensions.width * devicePixelRatio;
    const height = targetDimensions.height * devicePixelRatio;
    return {width, height}
}
function getScreenshotDimensions(screenshotPath: string) {
    const png = PNG.sync.read(readFileSync(joinPath("screenshots", `${screenshotPath}.png`)));
    return {width: png.width, height: png.height};
}

for (const withOrWithoutScrollbars of ["without", "with"] as const) {
    for (const contentViewportRelation of ["smaller", "greater"] as const) {
        fixture(`${withOrWithoutScrollbars} scrollbars, where the content is ${contentViewportRelation} than the viewport`)
            .page("about:blank")
            .clientScripts([
                {content: `import("https://code.jquery.com/jquery-3.7.1.js")`}
            ])
            .beforeEach(async t => {
                if (withOrWithoutScrollbars === "with") await t.eval(() => document.body.style.overflow = "scroll");
                else await t.eval(() => document.body.style.overflow = "hidden");

                if (contentViewportRelation === "greater") await t.eval(() => {
                    document.body.style.width = "2000px";
                    document.body.style.height = "1000px";
                });
            })
            // set size to something else so resize is necessary
            .afterEach(async t => t.resizeWindow(targetDimensions.width+13, targetDimensions.height+13));

        test(`screenshot`, async t => {
            await t.resizeWindow(targetDimensions.width, targetDimensions.height);
        
            const screenshotPath = mkValidPath(`${t.browser.alias}--${t.fixture.name}--${t.test.name}`);
            await t.takeScreenshot(screenshotPath);
        
            const expectedDimensions = await getDpAdjustedExpectedScreenshotDimensions();
        
            const screenshotDimensions = getScreenshotDimensions(screenshotPath);
            await t.expect(screenshotDimensions).eql(expectedDimensions, "Screenshot does not have the same dimensions as the window!");
        });

        test.only(`getWindowJQueryDimensions`, async t => {
            await t.resizeWindow(targetDimensions.width, targetDimensions.height);
        
            const measuredDimensions = getWindowJQueryDimensions();
        
            await t.expect(measuredDimensions).eql(targetDimensions, "The measured dimensions are not the resized dimensions!");
        });

        test(`getWindowInnerDimensions`, async t => {
            await t.resizeWindow(targetDimensions.width, targetDimensions.height);
        
            const measuredDimensions = getWindowInnerDimensions();
        
            await t.expect(measuredDimensions).eql(targetDimensions, "The measured dimensions are not the resized dimensions!");
        });
    }
}
