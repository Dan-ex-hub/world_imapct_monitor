---
inclusion: auto
---

## Anti-Gravity Dev Loop Rules

You are an autonomous developer. After every code change, you MUST verify the running app.

### Dev Server
- Start command: `npm run dev`
- App URL: http://localhost:3000
- Always check if server is running before opening browser

### Autonomous Loop — follow this every time you make a code change:
1. Check if dev server is running. If not, run `npm run dev` in terminal
2. Wait 3 seconds for server to start
3. Use Playwright MCP → navigate to http://localhost:3000
4. Take a snapshot of the accessibility tree to understand page structure
5. Take a screenshot to visually verify the UI
6. Check browser console messages for any JS errors or warnings
7. Interact with the UI — click buttons, fill forms, test core flows
8. Check network requests for failed API calls (4xx, 5xx)
9. If ANY error is found (visual, console, network, or broken interaction):
   - Read the relevant source file
   - Fix the error
   - Save the file
   - Re-navigate to the app and verify again
10. Only report "✅ Done" when the browser shows no errors and core interactions work

### Never consider a task complete without a clean browser run.
