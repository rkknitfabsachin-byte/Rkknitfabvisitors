# RK KNIT FAB Visitor Management System Setup

Welcome to your new visitor management system! Follow these simple steps to connect your beautiful new website to Google Sheets.

## Step 1: Set Up Google Sheets
1. Go to [Google Sheets](https://sheets.google.com/) and create a new Blank Spreadsheet.
2. Name it something like "RK Knit Fab Visitors".
3. In the top menu, click **Extensions** > **Apps Script**.

## Step 2: Add the Backend Code
1. Delete any code in the Apps Script editor (usually just an empty `myFunction`).
2. Open the `backend.gs` file from this project folder.
3. Copy all the code inside `backend.gs` and paste it into the Apps Script editor.
4. Click the **Save** icon (the floppy disk).

## Step 3: Deploy as Web App
1. **[CRITICAL STEP]** In the code editor, look for the function named `setupDrivePermissions`. Select `setupDrivePermissions` from the dropdown menu at the top center of the editor and click the **Run** button. This will force Google to ask you for Drive permissions. Authorize it (choose your account, click Advanced -> Go to Untitled project).
2. After doing that, click the blue **Deploy** button in the top right and select **New deployment**.
3. Click the gear icon next to "Select type" and choose **Web app**.
4. Fill out the details:
   - **Description**: Initial Deployment
   - **Execute as**: Me (your email)
   - **Who has access**: Anyone (This is critical so the form can send data without asking visitors to log in).
4. Click **Deploy**.
5. Google will ask for authorization. Click **Authorize access**, choose your account, click **Advanced** at the bottom, and click **Go to Untitled project (unsafe)**. Allow the permissions.
6. Once deployed, you will get a **Web app URL** in a popup. **Copy this URL.**

## Step 4: Connect the Website
1. Open up `js/form.js` in a text editor (like Notepad).
2. At the very top, replace `'YOUR_GOOGLE_SCRIPT_WEB_APP_URL'` with the URL you just copied. Keep the quotes around it.
3. Save `js/form.js`.
4. Open up `js/admin.js` in a text editor.
5. At the very top, replace `'YOUR_GOOGLE_SCRIPT_WEB_APP_URL'` with the same URL you copied. Keep the quotes.
6. Save `js/admin.js`.

## Step 5: Test It Out!
1. Double click `index.html` to open the visitor form in your browser. Fill it out and submit it.
2. Check your Google Sheet. You should see a new tab called "All Data" and another tab with the category you chose, both populated with the data!
3. Double click `admin.html`. You should see the visitor you just added. Click "Check Out", refresh the page, and check the Google Sheet to see the Time Out recorded.

## Step 6: Host on GitHub Pages
1. Upload this entire folder to a new GitHub repository.
2. Go to the repository **Settings** > **Pages**.
3. Select the `main` branch and save.
4. In a few minutes, your site will be live!

Enjoy your sleek new check-in experience!
