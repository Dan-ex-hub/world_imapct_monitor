---
description: Autonomous development loop that verifies code changes in live browser, detects errors, and fixes them automatically
inclusion: always
---

# Anti-Gravity Development Loop

## Core Principle

After every code change that affects the UI, API routes, or application behavior, you MUST verify the running application in a live browser environment. Never consider a task complete without browser verification.

## Development Server

- **Start command**: `npm run dev`
- **Application URL**: `http://localhost:3000`
- **Framework**: Next.js (React-based)
- **Check server status**: Use `listProcesses` to verify dev server is running before browser operations

## Verification Loop (Execute After Every Code Change)

### 1. Server Management
- Check if dev server process is running using `listProcesses`
- If not running, start with `controlPwshProcess` action="start", command="npm run dev"
- Wait 3-5 seconds for server initialization before proceeding

### 2. Browser Navigation
- Use `mcp_playwright_browser_navigate` to `http://localhost:3000`
- Wait for page load completion before proceeding

### 3. Page Structure Analysis
- Use `mcp_playwright_browser_snapshot` to capture accessibility tree
- Verify expected UI elements are present and properly structured
- Check for missing components or layout issues

### 4. Visual Verification
- Use `mcp_playwright_browser_take_screenshot` to capture current UI state
- Compare against expected visual appearance
- Look for rendering issues, broken layouts, or missing styles

### 5. Console Error Detection
- Use `mcp_playwright_browser_console_messages` with level="error"
- Check for JavaScript runtime errors, React errors, or warnings
- Pay special attention to hydration errors, component errors, and API failures

### 6. Interactive Testing
- Test core user flows relevant to your changes:
  - Use `mcp_playwright_browser_click` for button interactions
  - Use `mcp_playwright_browser_type` for form inputs
  - Use `mcp_playwright_browser_hover` for hover states
- Verify state changes, navigation, and dynamic content updates

### 7. Network Request Validation
- Use `mcp_playwright_browser_network_requests` to inspect API calls
- Filter for failed requests (4xx, 5xx status codes)
- Verify expected API endpoints are called with correct payloads
- Check for CORS errors, timeout issues, or malformed responses

### 8. Error Resolution Loop
If ANY issue is detected (console errors, visual bugs, failed requests, broken interactions):
1. **Identify root cause**: Read relevant source files to understand the error
2. **Implement fix**: Make targeted code changes to resolve the issue
3. **Save changes**: Ensure all modified files are saved
4. **Re-verify**: Navigate to the app again and repeat steps 2-7
5. **Iterate**: Continue until all errors are resolved

### 9. Completion Criteria
Only report task completion when ALL of the following are true:
- ✅ No console errors or warnings related to your changes
- ✅ UI renders correctly with no visual regressions
- ✅ All interactive elements function as expected
- ✅ Network requests succeed with appropriate responses
- ✅ Core user flows complete without errors

## Tool Usage Guidelines

- **Process management**: Use `controlPwshProcess` and `listProcesses` for dev server
- **Browser automation**: Use `mcp_playwright_browser_*` tools for all browser interactions
- **Avoid manual commands**: Don't use bash commands for browser testing; use Playwright MCP tools
- **Screenshot naming**: Use descriptive filenames when taking screenshots for debugging

## Error Handling

- **Build errors**: Check terminal output from dev server process using `getProcessOutput`
- **Runtime errors**: Check browser console messages for client-side errors
- **API errors**: Check network requests for server-side failures
- **Hydration errors**: Common in Next.js; verify server/client rendering consistency

## When to Skip Verification

You may skip browser verification only when:
- Changes are purely backend (database schemas, server utilities with no API exposure)
- Changes are to documentation, configuration files, or non-executable code
- Changes are to test files that don't affect application runtime

For all other changes, browser verification is mandatory.
