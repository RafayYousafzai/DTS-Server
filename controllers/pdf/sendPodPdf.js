import { getFirestore, doc as firestoreDoc, getDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import PDFDocument from "pdfkit";
import getStream from "get-stream";
import axios from "axios";
import app, { authenticate } from "../../lib/firebase/firebaseConfig.js";
import { Resend } from "resend";

const resend = new Resend("re_PFXtcaog_JKb5YwCbLfq2epPBK729Tgja");

const db = getFirestore(app);
const storage = getStorage(app);

const fetchImageBuffer = async (url) => {
  const res = await axios.get(url, { responseType: "arraybuffer" });
  return Buffer.from(res.data, "binary");
};

const sendPodPdf = async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    await authenticate();

    const bookingRef = firestoreDoc(db, "place_bookings", bookingId);
    const bookingSnap = await getDoc(bookingRef);

    if (!bookingSnap.exists()) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const booking = bookingSnap.data();

    if (booking.currentStatus !== "delivered") {
      return res.status(400).json({ message: "Booking is not delivered yet" });
    }

    const userRef = firestoreDoc(db, "users", booking.userEmail);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return res.status(404).json({ message: "user not found" });
    }

    const user = userSnap.data();

    if (
      booking.currentStatus !== "delivered" ||
      user.sendPodEmails !== true ||
      !user.podsEmail
    ) {
      return res.status(400).json({ message: "Booking is not delivered yet" });
    }

    console.log("User POD email are active", user.podsEmail);

    // Generate Professional PDF Design with Fixed Spacing
    const pdfDoc = new PDFDocument({
      size: "A4",
      margin: 50,
      bufferPages: true,
      info: {
        Title: `Proof of Delivery - ${booking.docId}`,
        Author: "Direct Transport Solutions",
        Subject: "Proof of Delivery Document",
        Creator: "Direct Transport Solutions",
      },
    });
    const buffers = [];

    pdfDoc.on("data", buffers.push.bind(buffers));
    pdfDoc.on("end", async () => {
      const pdfBuffer = Buffer.concat(buffers);

      const fileName = `pods/${bookingId}.pdf`;
      const storageRef = ref(storage, fileName);

      await uploadBytes(storageRef, pdfBuffer, {
        contentType: "application/pdf",
      });

      const downloadURL = await getDownloadURL(storageRef);

      // Professional Email HTML Template (keeping the same)
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Proof of Delivery - ${booking.docId}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #2c3e50;
                    background-color: #f8f9fa;
                }
                .email-container {
                    max-width: 650px;
                    margin: 20px auto;
                    background: #ffffff;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.1);
                }
                .header {
                    background: linear-gradient(135deg, #3498db 0%, #2280bf 100%);
                    padding: 40px 30px;
                    text-align: center;
                    position: relative;
                }
                .header::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="75" cy="75" r="1" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
                    opacity: 0.3;
                }
                .header h1 {
                    color: #ffffff;
                    font-size: 28px;
                    font-weight: 700;
                    margin-bottom: 8px;
                    position: relative;
                    z-index: 1;
                }
                .header p {
                    color: rgba(255,255,255,0.9);
                    font-size: 16px;
                    position: relative;
                    z-index: 1;
                }
                .content {
                    padding: 40px 30px;
                }
                .booking-badge {
                    background: linear-gradient(135deg, #2280bf 0%, #3498db 100%);
                    color: white;
                    padding: 16px 24px;
                    border-radius: 50px;
                    font-weight: 700;
                    font-size: 18px;
                    text-align: center;
                    margin: 0 auto 30px;
                    display: inline-block;
                    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                }
                .greeting {
                    font-size: 18px;
                    color: #2c3e50;
                    margin-bottom: 20px;
                    font-weight: 600;
                }
                .message {
                    font-size: 16px;
                    color: #5a6c7d;
                    margin-bottom: 30px;
                    line-height: 1.7;
                }
                .details-card {
                    background: #f8f9fa;
                    border-radius: 12px;
                    padding: 25px;
                    margin: 25px 0;
                    border-left: 4px solid #3498db;
                }
                .details-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                    margin-top: 15px;
                }
                .detail-item {
                    display: flex;
                    flex-direction: column;
                }
                .detail-label {
                    font-size: 12px;
                    color: #7f8c8d;
                    text-transform: uppercase;
                    font-weight: 600;
                    letter-spacing: 0.5px;
                    margin-bottom: 4px;
                }
                .detail-value {
                    font-size: 14px;
                    color: #2c3e50;
                    font-weight: 500;
                }
                .cta-section {
                    text-align: center;
                    margin: 35px 0;
                }
                .download-btn {
                    display: inline-block;
                    background: linear-gradient(135deg, #2280bf 0%, #3498db 100%);
                    color: white;
                    padding: 16px 32px;
                    text-decoration: none;
                    border-radius: 50px;
                    font-weight: 700;
                    font-size: 16px;
                    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
                    transition: all 0.3s ease;
                }
                .download-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 12px 35px rgba(102, 126, 234, 0.4);
                }
                .footer {
                    background: #2c3e50;
                    padding: 30px;
                    text-align: center;
                }
                .footer h3 {
                    color: #ffffff;
                    font-size: 20px;
                    margin-bottom: 10px;
                }
                .footer p {
                    color: #bdc3c7;
                    font-size: 14px;
                    margin-bottom: 5px;
                }
                .footer .disclaimer {
                    margin-top: 20px;
                    padding-top: 20px;
                    border-top: 1px solid #34495e;
                    font-size: 12px;
                    color: #95a5a6;
                }
                @media (max-width: 600px) {
                    .details-grid { grid-template-columns: 1fr; }
                    .content { padding: 25px 20px; }
                    .header { padding: 30px 20px; }
                }
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="header">
                    <h1>✅ Delivery Completed</h1>
                    <p>Your package has been successfully delivered</p>
                </div>
                
                <div class="content">
                    <div style="text-align: center;">
                        <div class="booking-badge">Job #${booking.docId}</div>
                    </div>
                    
                    <div class="greeting">Hello ${booking.userName},</div>
                    
                    <div class="message">
                        We're delighted to confirm that your delivery has been completed successfully. 
                        Your Proof of Delivery document is ready and attached to this email for your records.
                    </div>
                    
                    <div class="details-card">
                        <h3 style="color: #2c3e50; margin-bottom: 15px; font-size: 18px;">📦 Delivery Summary</h3>
                        <div class="details-grid">
                            <div class="detail-item">
                                <div class="detail-label">Pickup Location</div>
                                <div class="detail-value">${booking.pickupSuburb}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Delivery Location</div>
                                <div class="detail-value">${booking.deliverySuburb}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Internal Reference 1</div>
                                <div class="detail-value">${booking.internalReference || "N/A"}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Internal Reference 2</div>
                                <div class="detail-value">${booking.internalReference2 || "N/A"}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="cta-section">
                        <a href="${downloadURL}" class="download-btn">
                            📄 Download POD Document
                        </a>
                    </div>
                    
                    <div class="message">
                        If you have any questions about your delivery or need additional assistance, 
                        please don't hesitate to contact our customer service team.
                    </div>
                </div>
                
                <div class="footer">
                    <h3>Direct Transport Solutions</h3>
                    <p>Direct Transport Solutions</p>
                    <p>📧 bookings@directtransport.com.au</p>
                    
                    <div class="disclaimer">
                        This is an automated message generated upon successful delivery completion. 
                        Please do not reply directly to this email. For support, contact our customer service team.
                    </div>
                </div>
            </div>
        </body>
        </html>
      `;

      // Send email via Resend
      const emailRes = await resend.emails.send({
        from: "Direct Transport <bookings@directtransport.com.au>",
        to: user.podsEmail,
        subject: `✅ Delivery Complete - POD for Job #${booking.docId}`,
        html: emailHtml,
        attachments: [
          {
            filename: `POD-${booking.docId}.pdf`,
            content: pdfBuffer.toString("base64"),
          },
        ],
      });

      console.log("Email sent:", emailRes);

      return res.status(200).json({
        message: "POD PDF created and email sent",
        downloadURL,
        emailHtml,
      });
    });

    // FIXED PROFESSIONAL PDF DESIGN WITH PROPER SPACING
    const pageWidth = pdfDoc.page.width;
    const pageHeight = pdfDoc.page.height;
    const margin = 50;
    const contentWidth = pageWidth - margin * 2;

    // Color scheme
    const colors = {
      primary: "#3498db",
      secondary: "#2a5298",
      accent: "#2280bf",
      text: "#2c3e50",
      lightText: "#5a6c7d",
      border: "#e1e8ed",
      background: "#f8f9fa",
      success: "#27ae60",
      white: "#ffffff",
    };

    // Professional header with gradient and logo
    const addProfessionalHeader = async () => {
      const COMPANY_LOGO_URL =
        "https://www.directtransport.com.au/dts/Logo.png";

      // Gradient header background
      const gradient = pdfDoc.linearGradient(0, 0, pageWidth, 120);
      gradient.stop(0, colors.white).stop(1, colors.white);

      pdfDoc
        .fillAndStroke(gradient, colors.primary)
        .rect(0, 0, pageWidth, 120)
        .fill();

      // Subtle pattern overlay
      pdfDoc.fillColor(colors.white).opacity(0.1);

      for (let i = 0; i < pageWidth; i += 20) {
        for (let j = 0; j < 120; j += 20) {
          pdfDoc.circle(i, j, 1).fill();
        }
      }

      pdfDoc.opacity(1);

      try {
        const logoBuffer = await fetchImageBuffer(COMPANY_LOGO_URL);
        pdfDoc.image(logoBuffer, margin, 25, {
          width: 180,
          height: 70,
          align: "center",
        });
      } catch (err) {
        console.warn("Logo failed to load:", err.message);
        // Fallback company name
        pdfDoc
          .fillColor(colors.white)
          .fontSize(24)
          .font("Helvetica-Bold")
          .text("DIRECT TRANSPORT", margin, 40)
          .fontSize(14)
          .font("Helvetica")
          .text("SOLUTIONS", margin, 65);
      }

      return 140;
    };

    // Professional section with styled background
    const addStyledSection = (
      title,
      y,
      backgroundColor = colors.background
    ) => {
      // Section background
      pdfDoc
        .fillColor(backgroundColor)
        .rect(margin - 10, y - 5, contentWidth + 20, 35)
        .fill();

      // Left accent bar
      pdfDoc
        .fillColor(colors.accent)
        .rect(margin - 10, y - 5, 4, 35)
        .fill();

      // Section title
      pdfDoc
        .fillColor(colors.text)
        .fontSize(16)
        .font("Helvetica-Bold")
        .text(title, margin + 10, y + 8);

      return y + 45;
    };

    // FIXED: Enhanced detail list with proper spacing calculations
    const addDetailList = (items, startY, columns = 1) => {
      let currentY = startY;
      const columnWidth = Math.floor(
        (contentWidth - (columns - 1) * 30) / columns
      ); // Add gap between columns
      const labelHeight = 15; // Height for label
      const valueHeight = 20; // Height for value
      const itemSpacing = 10; // Space between items
      const totalItemHeight = labelHeight + valueHeight + itemSpacing;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const column = i % columns;
        const row = Math.floor(i / columns);

        const x = margin + column * (columnWidth + 30); // 30px gap between columns
        const y = currentY + row * totalItemHeight;

        // Check if we need a new page
        if (y + totalItemHeight > pageHeight - 100) {
          pdfDoc.addPage();
          currentY = 50;
          const newRow =
            Math.floor(i / columns) - Math.floor(items.length / columns);
          const newY = currentY + newRow * totalItemHeight;

          // Recalculate positions for new page
          const adjustedY =
            currentY +
            (i - Math.floor(i / columns) * columns) * totalItemHeight;

          // Label
          pdfDoc
            .fillColor(colors.lightText)
            .fontSize(10)
            .font("Helvetica-Bold")
            .text(item.label.toUpperCase(), x, adjustedY, {
              width: columnWidth - 10,
              lineBreak: false,
            });

          // Value with proper wrapping
          const value = item.value || "N/A";
          pdfDoc
            .fillColor(colors.text)
            .fontSize(11)
            .font("Helvetica")
            .text(value, x, adjustedY + labelHeight, {
              width: columnWidth - 10,
              height: valueHeight,
              ellipsis: true,
            });
        } else {
          // Label
          pdfDoc
            .fillColor(colors.lightText)
            .fontSize(10)
            .font("Helvetica-Bold")
            .text(item.label.toUpperCase(), x, y, {
              width: columnWidth - 10,
              lineBreak: false,
            });

          // Value with proper wrapping
          const value = item.value || "N/A";
          pdfDoc
            .fillColor(colors.text)
            .fontSize(11)
            .font("Helvetica")
            .text(value, x, y + labelHeight, {
              width: columnWidth - 10,
              height: valueHeight,
              ellipsis: true,
            });
        }

        // Add separator line for each row (not each item)
        if (column === columns - 1 && i < items.length - 1) {
          const separatorY = y + totalItemHeight - itemSpacing / 2;
          pdfDoc
            .strokeColor(colors.border)
            .lineWidth(0.5)
            .moveTo(margin, separatorY)
            .lineTo(margin + contentWidth, separatorY)
            .stroke();
        }
      }

      const totalRows = Math.ceil(items.length / columns);
      return currentY + totalRows * totalItemHeight + 20;
    };

    // Professional status badge
    const addStatusBadge = (text, x, y, width = 200) => {
      const badgeHeight = 40;

      // Badge background with gradient
      const badgeGradient = pdfDoc.linearGradient(
        x,
        y,
        x + width,
        y + badgeHeight
      );
      badgeGradient.stop(0, "#457b9d").stop(1, "#457b9d");

      pdfDoc
        .fillAndStroke(badgeGradient, colors.success)
        .roundedRect(x, y, width, badgeHeight, 20)
        .fill();

      // Badge text
      pdfDoc
        .fillColor(colors.white)
        .fontSize(14)
        .font("Helvetica-Bold")
        .text(text, x, y + 13, {
          width: width,
          align: "center",
        });

      return y + badgeHeight + 30; // Increased spacing after badge
    };

    // Start PDF generation
    let currentY = await addProfessionalHeader();

    // Status badge
    currentY = addStatusBadge(
      `JOB #${booking.docId}`,
      (pageWidth - 200) / 2,
      currentY
    );

    // Customer Information Section
    currentY = addStyledSection("CUSTOMER INFORMATION", currentY);

    const customerDetails = [
      { label: "Customer Name", value: booking.userName },
      { label: "Email Address", value: booking.userEmail },
      { label: "Booking Date", value: `${booking.date} at ${booking.time}` },
      { label: "Job Status", value: "COMPLETED ✓" },
    ];

    currentY = addDetailList(customerDetails, currentY, 2);

    // Add extra spacing between sections
    currentY += 20;

    // Service Details Section
    currentY = addStyledSection("SERVICE DETAILS", currentY);

    const formatDateTime = (dateString) => {
      if (!dateString) return "Not Available";
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid Date";

      return date.toLocaleString("en-AU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    };

    const serviceDetails = [
      { label: "Pickup Company", value: booking?.pickupCompanyName },
      { label: "Delivery Company", value: booking?.dropCompanyName },
      { label: "Pickup Address", value: booking?.address?.Origin?.label },
      {
        label: "Delivery Address",
        value: booking?.address?.Destination?.label,
      },
      { label: "Internal Reference 1", value: booking?.internalReference },
      { label: "Internal Reference 2", value: booking?.internalReference2 },
      {
        label: "Pickup Completed",
        value: formatDateTime(booking?.progressInformation?.pickedup),
      },
      {
        label: "Delivery Completed",
        value: formatDateTime(booking?.progressInformation?.delivered),
      },
    ];

    currentY = addDetailList(serviceDetails, currentY, 2);

    // Add extra spacing before signature section
    currentY += 30;

    // Customer Signature Section
    if (booking.signUrl) {
      if (currentY > pageHeight - 250) {
        pdfDoc.addPage();
        currentY = 50;
      }

      currentY = addStyledSection("CUSTOMER SIGNATURE", currentY);

      try {
        const signBuffer = await fetchImageBuffer(booking.signUrl);

        // Professional signature box
        pdfDoc
          .fillColor(colors.white)
          .strokeColor(colors.border)
          .lineWidth(2)
          .roundedRect(margin, currentY, contentWidth, 120, 8)
          .fillAndStroke();

        // Signature image
        pdfDoc.image(signBuffer, margin + 15, currentY + 15, {
          fit: [contentWidth - 30, 90],
          align: "center",
          valign: "center",
        });

        currentY += 140;

        // Signature details with proper spacing
        pdfDoc
          .fillColor(colors.text)
          .fontSize(12)
          .font("Helvetica-Bold")
          .text(`Digitally signed by: ${booking.userName}`, margin, currentY);

        currentY += 20; // Add spacing between lines

        pdfDoc
          .fontSize(10)
          .font("Helvetica")
          .fillColor(colors.lightText)
          .text(
            `Signature captured on: ${formatDateTime(booking?.progressInformation?.delivered)}`,
            margin,
            currentY
          );

        currentY += 40;
      } catch (err) {
        console.warn("Signature failed to load:", err.message);

        // Error message box
        pdfDoc
          .fillColor("#fff5f5")
          .strokeColor("#fed7d7")
          .lineWidth(1)
          .roundedRect(margin, currentY, contentWidth, 40, 4)
          .fillAndStroke();

        pdfDoc
          .fillColor("#e53e3e")
          .fontSize(11)
          .font("Helvetica")
          .text(
            "⚠ Signature could not be loaded from server",
            margin + 15,
            currentY + 15
          );

        currentY += 60;
      }
    }

    // Delivery Photos Section
    if (Array.isArray(booking.images) && booking.images.length > 0) {
      if (currentY > pageHeight - 350) {
        pdfDoc.addPage();
        currentY = 50;
      }

      currentY = addStyledSection("DELIVERY PHOTOGRAPHS", currentY);

      const imagesPerRow = 2;
      const imageSpacing = 20; // Increased spacing between images
      const imageWidth = (contentWidth - imageSpacing) / imagesPerRow;
      const imageHeight = imageWidth * 0.75;

      let imageCount = 0;
      let rowY = currentY;

      for (const [index, url] of booking.images.entries()) {
        try {
          const imgBuffer = await fetchImageBuffer(url);

          const col = imageCount % imagesPerRow;
          const imageX = margin + col * (imageWidth + imageSpacing);

          if (col === 0 && imageCount > 0) {
            rowY += imageHeight + 60; // Increased spacing between rows
          }

          if (rowY + imageHeight + 60 > pageHeight - 80) {
            pdfDoc.addPage();
            rowY = 50;
          }

          // Professional image frame
          pdfDoc
            .fillColor(colors.white)
            .strokeColor(colors.border)
            .lineWidth(2)
            .roundedRect(imageX, rowY, imageWidth, imageHeight + 40, 8)
            .fillAndStroke();

          // Image
          pdfDoc.image(imgBuffer, imageX + 8, rowY + 8, {
            fit: [imageWidth - 16, imageHeight - 16],
            align: "center",
            valign: "center",
          });

          // Professional caption with proper spacing
          pdfDoc
            .fillColor(colors.text)
            .fontSize(11)
            .font("Helvetica-Bold")
            .text(`Photo ${index + 1}`, imageX + 8, rowY + imageHeight + 12, {
              width: imageWidth - 16,
              align: "center",
            });

          pdfDoc
            .fontSize(9)
            .font("Helvetica")
            .fillColor(colors.lightText)
            .text("Delivery Evidence", imageX + 8, rowY + imageHeight + 26, {
              width: imageWidth - 16,
              align: "center",
            });

          imageCount++;
        } catch (err) {
          console.warn(`Image ${index + 1} failed to load:`, err.message);

          // Error placeholder with proper spacing
          const imageX =
            margin + (index % imagesPerRow) * (imageWidth + imageSpacing); // Declare imageX here

          pdfDoc
            .fillColor("#fff5f5")
            .strokeColor("#fed7d7")
            .lineWidth(1)
            .roundedRect(imageX, rowY, imageWidth, imageHeight + 40, 8)
            .fillAndStroke();

          pdfDoc
            .fillColor("#e53e3e")
            .fontSize(10)
            .font("Helvetica")
            .text(
              `⚠ Photo ${index + 1}\nUnavailable`,
              imageX + 15,
              rowY + imageHeight / 2,
              {
                width: imageWidth - 30,
                align: "center",
              }
            );

          imageCount++;
        }
      }
    }

    // Professional footer for all pages
    const addProfessionalFooter = (pageNumber, totalPages) => {
      const footerY = pageHeight - 60;

      // Footer background
      pdfDoc
        .fillColor(colors.background)
        .rect(0, footerY - 10, pageWidth, 70)
        .fill();

      // Footer line
      pdfDoc
        .strokeColor(colors.accent)
        .lineWidth(2)
        .moveTo(margin, footerY - 5)
        .lineTo(pageWidth - margin, footerY - 5)
        .stroke();

      // Company info with proper spacing
      pdfDoc
        .fillColor(colors.text)
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Direct Transport Solutions", margin, footerY + 5);

      pdfDoc
        .fontSize(8)
        .font("Helvetica")
        .fillColor(colors.lightText)
        .text(
          "Direct Transport Solutions",
          margin,
          footerY + 18
        )
        .text("📧 bookings@directtransport.com.au", margin, footerY + 30);

      // Page numbers
      pdfDoc
        .fillColor(colors.text)
        .fontSize(9)
        .font("Helvetica")
        .text(
          `Page ${pageNumber} of ${totalPages}`,
          pageWidth - margin - 80,
          footerY + 5,
          {
            width: 80,
            align: "right",
          }
        );

      // Confidential notice
      pdfDoc
        .fillColor(colors.lightText)
        .fontSize(8)
        .text("CONFIDENTIAL DOCUMENT", pageWidth - margin - 120, footerY + 18, {
          width: 120,
          align: "right",
        });

      // Generation timestamp
      const now = new Date();
      pdfDoc.text(
        `Generated: ${now.toLocaleString("en-AU")}`,
        pageWidth - margin - 150,
        footerY + 30,
        {
          width: 150,
          align: "right",
        }
      );
    };

    // Apply professional footer to all pages
    const pages = pdfDoc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      pdfDoc.switchToPage(i);
      addProfessionalFooter(i + 1, pages.count);
    }

    pdfDoc.end();
  } catch (error) {
    console.error("Error in sendPodPdf:", error);
    return res.status(500).json({ message: error.message });
  }
};

export default sendPodPdf;
