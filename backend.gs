// Google Apps Script Backend for RK KNIT FAB Visitor Form

// Configuration
const SHEET_ALL_DATA = "All Data";

// Admin Configuration
// Replace these with your actual links
const ADMIN_EMAIL_REPLY_TO = "rkknitfabsachin@gmail.com"; 
const GOOGLE_REVIEW_LINK = "https://g.page/r/insert-your-link-here/review";
const INSTAGRAM_LINK = "https://instagram.com/rkknitfab";

// Headers
const HEADERS = [
  "ID", "Time In", "Name", "Phone", "Email", "Address", 
  "Company", "Category", "Reason", "Meet Who", "Time Out", 
  "Rated on Google", "Followed Instagram"
];

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Create All Data sheet if not exists
  let allDataSheet = ss.getSheetByName(SHEET_ALL_DATA);
  if (!allDataSheet) {
    allDataSheet = ss.insertSheet(SHEET_ALL_DATA);
    allDataSheet.appendRow(HEADERS);
    allDataSheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
    allDataSheet.setFrozenRows(1);
  } else {
      // Ensure Header matches in case we added the Proof URL column later
      const currentHeaders = allDataSheet.getRange(1, 1, 1, allDataSheet.getLastColumn()).getValues()[0];
      if (currentHeaders.length < HEADERS.length) {
          allDataSheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
      }
  }
}

function getOrCreateCategorySheet(category) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(category);
  if (!sheet) {
    sheet = ss.insertSheet(category);
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  } else {
      // Ensure Header matches 
      const currentHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
      if (currentHeaders.length < HEADERS.length) {
          sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
      }
  }
  return sheet;
}

// Handle GET requests (Admin dashboard fetching active visitors)
function doGet(e) {
  try {
    const action = e.parameter.action;
    
    if (action === "getActive") {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(SHEET_ALL_DATA);
      if (!sheet) return createResponse({ status: "success", data: [] });

      const data = sheet.getDataRange().getValues();
      const activeVisitors = [];
      
      // Skip header row (index 0)
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const timeOut = row[10]; // Column K (index 10)
        
        // If Time Out is empty, visitor is still active
        if (!timeOut) {
          activeVisitors.push([
            row[0], // ID
            row[1], // Time In
            row[2], // Name
            row[6], // Company
            row[7], // Category
            row[9]  // Meet Who
          ]);
        }
      }
      
      return createResponse({ status: "success", data: activeVisitors });
    }
    
    return createResponse({ status: "error", message: "Invalid action" });
    
  } catch (error) {
    return createResponse({ status: "error", message: error.toString() });
  }
}

// Handle POST requests (Check-in and Check-out)
function doPost(e) {
  try {
    // Setup sheets if they don't exist
    setup();
    
    // Parse form data
    const payload = e.parameter;
    const action = payload.action;
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const allDataSheet = ss.getSheetByName(SHEET_ALL_DATA);
    
    if (action === "checkin") {
      const id = Utilities.getUuid();
      const timeIn = new Date();
      
      const rowData = [
        id,
        timeIn,
        payload.fullName,
        payload.phone,
        payload.email || "N/A",
        payload.address,
        payload.company || "N/A",
        payload.category,
        payload.reason,
        payload.meetWho,
        "", // Empty Time Out
        "No", // Rated on Google
        "No"  // Followed Instagram
      ];
      
      // 1. Save to All Data
      allDataSheet.appendRow(rowData);
      
      // 2. Save to Category Sheet
      if (payload.category !== 'Pending') {
        const categorySheet = getOrCreateCategorySheet(payload.category);
        categorySheet.appendRow(rowData);
      }

      // 3. Send Automated Email if provided
      if (payload.email && payload.email !== "N/A") {
          sendWelcomeEmail(payload.email, payload.fullName);
      }
      
      return createResponse({ status: "success", message: "Check-in recorded", id: id });
    } 
    else if (action === "checkout") {
      const targetId = payload.rowId; // This is the UUID
      const category = payload.category; // The finalized category from admin
      const timeOut = new Date();
      
      // 1. Update in All Data and retrieve the row data
      let rowDataToCopy = null;
      const data = allDataSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === targetId) {
          // Note: arrays are 0-indexed, but getRange is 1-indexed
          allDataSheet.getRange(i + 1, 8).setValue(category); // Update Category in Column H (Index 8)
          allDataSheet.getRange(i + 1, 11).setValue(timeOut); // Update Time Out in Column K (Index 11)
          rowDataToCopy = allDataSheet.getRange(i + 1, 1, 1, allDataSheet.getLastColumn()).getValues()[0];
          break;
        }
      }
      
      // 2. Add to the chosen Category Sheet for record keeping
      if (rowDataToCopy && category && category !== 'Pending') {
        const categorySheet = getOrCreateCategorySheet(category);
        categorySheet.appendRow(rowDataToCopy);
      }
      
      // 3. In case it was already in a category sheet (e.g. returning visitor old logic), update checkout time there over all existing sheets
      const categories = ["Visitor", "Client", "Courier", "Delivery", "Other", "Pending"];
      categories.forEach(cat => {
        const sheet = ss.getSheetByName(cat);
        if (sheet) {
          updateCheckoutTime(sheet, targetId, timeOut);
        }
      });
      
      return createResponse({ status: "success", message: "Check-out recorded", updatedCategory: category });
    }
    else if (action === "socialClick") {
      const id = payload.id;
      const type = payload.type; // 'google' or 'instagram'
      
      // Update All Data
      updateSocialStatus(allDataSheet, id, type);
      
      // Update Category Sheets
      const categories = ["Visitor", "Client", "Courier", "Delivery", "Other"];
      categories.forEach(cat => {
        const sheet = ss.getSheetByName(cat);
        if (sheet) {
          updateSocialStatus(sheet, id, type);
        }
      });
      
      return createResponse({ status: "success", message: "Social click recorded" });
    }
    
    return createResponse({ status: "error", message: "Invalid action" });
  } catch (error) {
    return createResponse({ status: "error", message: error.toString() });
  }
}

// Helper to find ID and update Time Out
function updateCheckoutTime(sheet, id, timeOut) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) { // Column A is ID
      sheet.getRange(i + 1, 11).setValue(timeOut); 
      break;
    }
  }
}

// Helper to find ID and update Social Status (Google Review / Instagram)
function updateSocialStatus(sheet, id, type) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) { 
      if (type === 'google') {
          sheet.getRange(i + 1, 12).setValue("Yes"); // Column L (12)
      } else if (type === 'instagram') {
          sheet.getRange(i + 1, 13).setValue("Yes"); // Column M (13)
      }
      break;
    }
  }
}

// Automatically send Welcome Email
function sendWelcomeEmail(recipientEmail, userName) {
    const subject = "Thank you for visiting RK KNIT FAB!";
    
    const bodyText = `
Dear ${userName},

Thank you for visiting RK KNIT FAB today. We hope you had a great experience with us.

If you have a moment, we would love to hear your thoughts. Please rate and review us on Google:
${GOOGLE_REVIEW_LINK}

You can also follow us on Instagram for our latest fabric updates:
${INSTAGRAM_LINK}

Warm Regards,
RK KNIT FAB Team
${ADMIN_EMAIL_REPLY_TO}
`;

    const htmlBody = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ccc; border-radius: 10px;">
            <h2 style="color: #1a365d;">Thank you for visiting RK KNIT FAB!</h2>
            <p>Dear ${userName},</p>
            <p>Thank you for visiting us today. We hope you had a great experience.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p>If you have a moment, we would love to hear your thoughts. Your feedback helps us improve:</p>
            <p style="text-align: center;">
                <a href="${GOOGLE_REVIEW_LINK}" style="background-color: #ef4444; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Rate us on Google</a>
            </p>
            <br>
            <p>Stay updated with our latest collections by following us on Instagram:</p>
            <p style="text-align: center;">
                <a href="${INSTAGRAM_LINK}" style="background-color: #833ab4; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Follow on Instagram</a>
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 0.9em; color: #777;">Warm Regards,<br><strong>RK KNIT FAB Team</strong><br>${ADMIN_EMAIL_REPLY_TO}</p>
        </div>
    `;

    try {
        MailApp.sendEmail({
            to: recipientEmail,
            subject: subject,
            body: bodyText,
            htmlBody: htmlBody,
            replyTo: ADMIN_EMAIL_REPLY_TO,
            name: "RK KNIT FAB"
        });
    } catch(e) {
        console.error("Failed to send email: " + e.toString());
    }
}

// Helper to return JSON response with CORS headers
function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
