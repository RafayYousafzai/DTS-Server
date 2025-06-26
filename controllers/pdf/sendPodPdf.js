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

    // Generate PDF with improved design
    const pdfDoc = new PDFDocument({
      size: "A4",
      margin: 40,
      bufferPages: true,
    });
    const buffers = [];

    pdfDoc.on("data", buffers.push.bind(buffers));
    pdfDoc.on("end", async () => {
      const pdfBuffer = Buffer.concat(buffers);

      const fileName = `pods/${bookingId}.pdf`;
      const storageRef = ref(storage, fileName);

      // await authenticate();
      await uploadBytes(storageRef, pdfBuffer, {
        contentType: "application/pdf",
      });

      const downloadURL = await getDownloadURL(storageRef);

      const emailHtml = `
       <!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Confirmation</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #2c3e50;
            padding: 20px;
            text-align: center;
            border-radius: 4px 4px 0 0;
        }
        .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 24px;
        }
        .content {
            padding: 25px;
            background-color: #f9f9f9;
            border-radius: 0 0 4px 4px;
            border: 1px solid #e0e0e0;
            border-top: none;
        }
        .booking-id {
            background-color: #e8f4fc;
            padding: 10px 15px;
            border-radius: 4px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 20px;
            text-align: center;
        }
        .details {
            background-color: #ffffff;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
            border: 1px solid #e0e0e0;
        }
        .details li {
            margin-bottom: 8px;
            list-style-type: none;
            padding-left: 0;
        }
        .details strong {
            color: #2c3e50;
            min-width: 80px;
            display: inline-block;
        }
        .button {
            display: inline-block;
            background-color: #3498db;
            color: white;
            padding: 12px 20px;
            text-decoration: none;
            border-radius: 4px;
            font-weight: bold;
            margin: 15px 0;
            text-align: center;
        }
        .footer {
            margin-top: 25px;
            font-size: 14px;
            color: #777777;
            text-align: center;
        }
        .logo {
            text-align: center;
            margin-bottom: 20px;
        }
        .logo img {
            max-height: 50px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Your Delivery is Complete</h1>
    </div>
    
    <div class="content">
        <div class="booking-id">
            Booking #${booking.docId}
        </div>
        
        <p>Hello ${booking.userName},</p>
        
        <p>We're pleased to inform you that your delivery has been successfully completed. Below are the details of your booking:</p>
        
        <div class="details">
            <ul>
                <li><strong>Pickup:</strong> ${booking.pickupSuburb}</li>
                <li><strong>Drop:</strong> ${booking.deliverySuburb}</li>
            </ul>
        </div>
        
        <p>The Proof of Delivery (POD) document is attached for your records. You can also download it using the button below:</p>
        
        <div style="text-align: center;">
            <a href="${downloadURL}" class="button">Download POD Document</a>
        </div>
        
        <p>If you have any questions about your delivery, please don't hesitate to contact us.</p>
        
        <div class="footer">
            <p>Best regards,<br>
            <strong>Direct Transport Solutions</strong></p>
            
            <p style="margin-top: 15px;">
                <small>
                    This is an automated message. Please do not reply directly to this email.
                </small>
            </p>
        </div>
    </div>
</body>
</html>
      `;

      // Send email via Resend
      const emailRes = await resend.emails.send({
        from: "Direct Transport <bookings@directtransport.com.au>",
        to: user.podsEmail,
        subject: `POD for Booking #${booking.docId}`,
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

    // IMPROVED PDF DESIGN IMPLEMENTATION
    const pageWidth = pdfDoc.page.width;
    const pageHeight = pdfDoc.page.height;
    const margin = 40;
    const contentWidth = pageWidth - margin * 2;

    // Helper function to add section divider
    const addSectionDivider = (y) => {
      pdfDoc
        .strokeColor("#e0e0e0")
        .lineWidth(1)
        .moveTo(margin, y)
        .lineTo(pageWidth - margin, y)
        .stroke();
    };

    // Helper function to add professional header
    const addHeader = () => {
      // Header background
      pdfDoc.fillColor("#2c3e50").rect(0, 0, pageWidth, 100).fill();

      // Main title
      pdfDoc
        .fillColor("#ffffff")
        .fontSize(24)
        .font("Helvetica-Bold")
        .text("Direct Transport Solution", margin, 30, {
          align: "center",
          width: contentWidth,
        });

      return 120; // Return Y position after header
    };

    // Helper function to add section title
    const addSectionTitle = (title, y) => {
      pdfDoc
        .fillColor("#2c3e50")
        .fontSize(16)
        .font("Helvetica-Bold")
        .text(title, margin, y);

      // Add underline
      pdfDoc
        .strokeColor("#3498db")
        .lineWidth(2)
        .moveTo(margin, y + 20)
        .lineTo(margin + pdfDoc.widthOfString(title), y + 20)
        .stroke();

      return y + 35;
    };

    // Helper function to add key-value pairs in a clean format
    const addKeyValuePairs = (pairs, startY) => {
      let currentY = startY;

      pdfDoc
        .fillColor("#f8f9fa")
        .rect(margin, currentY - 5, contentWidth, pairs.length * 25 + 10)
        .fill()
        .strokeColor("#e9ecef")
        .rect(margin, currentY - 5, contentWidth, pairs.length * 25 + 10)
        .stroke();

      pairs.forEach((pair, index) => {
        const bgColor = index % 2 === 0 ? "#ffffff" : "#f8f9fa";

        pdfDoc
          .fillColor(bgColor)
          .rect(margin + 1, currentY - 2, contentWidth - 2, 22)
          .fill();

        pdfDoc
          .fillColor("#2c3e50")
          .fontSize(11)
          .font("Helvetica-Bold")
          .text(pair.label + ":", margin + 15, currentY, { width: 150 });

        pdfDoc
          .fillColor("#333333")
          .font("Helvetica")
          .text(pair.value, margin + 180, currentY, {
            width: contentWidth - 195,
          });

        currentY += 22;
      });

      return currentY + 15;
    };

    // Start PDF generation
    let currentY = addHeader();

    // Booking ID highlight box
    pdfDoc
      .fillColor("#e8f4fc")
      .rect(margin, currentY, contentWidth, 40)
      .fill()
      .strokeColor("#3498db")
      .rect(margin, currentY, contentWidth, 40)
      .stroke();

    pdfDoc
      .fillColor("#2c3e50")
      .fontSize(14)
      .font("Helvetica-Bold")
      .text(`Booking ID: ${booking.docId}`, margin, currentY + 12, {
        align: "center",
        width: contentWidth,
      });

    currentY += 60;

    // Booking Details Section
    currentY = addSectionTitle("Booking Details", currentY);

    const bookingDetails = [
      { label: "Customer Name", value: booking.userName },
      { label: "Customer Email", value: booking.userEmail },
      { label: "Booking Date", value: `${booking.date} at ${booking.time}` },
    ];

    currentY = addKeyValuePairs(bookingDetails, currentY);
    currentY += 20;

    // Customer Signature Section
    if (booking.signUrl) {
      // Add new page if needed
      if (currentY > pageHeight - 200) {
        pdfDoc.addPage();
        currentY = 50;
      }

      currentY += 30;
      currentY = addSectionTitle("Customer Signature", currentY);

      try {
        const signBuffer = await fetchImageBuffer(booking.signUrl);

        // Create signature box
        pdfDoc
          .strokeColor("#e0e0e0")
          .lineWidth(1)
          .rect(margin, currentY, contentWidth, 120)
          .stroke();

        // Add signature image with proper sizing
        pdfDoc.image(signBuffer, margin + 20, currentY + 10, {
          fit: [contentWidth - 40, 80],
          align: "center",
          valign: "center",
        });

        currentY += 130;

        // Signature details
        pdfDoc
          .fillColor("#666666")
          .fontSize(10)
          .font("Helvetica")
          .text("Digitally signed by:", margin, currentY)
          .font("Helvetica-Bold")
          .text(booking.userName, margin, currentY + 15);
      } catch (err) {
        console.warn("Signature failed to load:", err.message);
        pdfDoc
          .fillColor("#ff6b6b")
          .fontSize(12)
          .text("Signature could not be loaded", margin, currentY);
      }
    }

    // POD Images Section
    if (Array.isArray(booking.images) && booking.images.length > 0) {
      pdfDoc.addPage();
      currentY = 50;

      currentY = addSectionTitle("Proof of Delivery Images", currentY);

      const imagesPerRow = 2;
      const imageWidth = (contentWidth - 20) / imagesPerRow;
      const imageHeight = imageWidth * 0.75; // 4:3 aspect ratio

      let imageCount = 0;
      let rowY = currentY;

      for (const [index, url] of booking.images.entries()) {
        try {
          const imgBuffer = await fetchImageBuffer(url);

          const col = imageCount % imagesPerRow;
          const imageX = margin + col * (imageWidth + 10);

          // Start new row if needed
          if (col === 0 && imageCount > 0) {
            rowY += imageHeight + 40;
          }

          // Check if we need a new page
          if (rowY + imageHeight > pageHeight - 100) {
            pdfDoc.addPage();
            rowY = 50;
          }

          // Add image border
          pdfDoc
            .strokeColor("#e0e0e0")
            .lineWidth(1)
            .rect(imageX - 2, rowY - 2, imageWidth + 4, imageHeight + 24)
            .stroke();

          // Add image with proper sizing and positioning
          pdfDoc.image(imgBuffer, imageX, rowY, {
            fit: [imageWidth, imageHeight],
            align: "center",
            valign: "center",
          });

          // Add image caption
          pdfDoc
            .fillColor("#666666")
            .fontSize(9)
            .font("Helvetica")
            .text(`Image ${index + 1}`, imageX, rowY + imageHeight + 5, {
              width: imageWidth,
              align: "center",
            });

          imageCount++;
        } catch (err) {
          console.warn(`Image ${index + 1} failed to load:`, err.message);

          // Add placeholder for failed image
          const col = imageCount % imagesPerRow;
          const imageX = margin + col * (imageWidth + 10);

          if (col === 0 && imageCount > 0) {
            rowY += imageHeight + 40;
          }

          pdfDoc
            .fillColor("#f8f9fa")
            .rect(imageX, rowY, imageWidth, imageHeight)
            .fill()
            .strokeColor("#e0e0e0")
            .rect(imageX, rowY, imageWidth, imageHeight)
            .stroke()
            .fillColor("#666666")
            .fontSize(12)
            .text("Image not available", imageX, rowY + imageHeight / 2, {
              width: imageWidth,
              align: "center",
            });

          imageCount++;
        }
      }
    }

    // Footer function for all pages
    const addFooter = (pageNumber, totalPages) => {
      const footerY = pageHeight - 30;

      // Footer background
      pdfDoc
        .fillColor("#f8f9fa")
        .rect(0, footerY - 10, pageWidth, 40)
        .fill();

      pdfDoc
        .fillColor("#666666")
        .fontSize(8)
        .font("Helvetica")
        .text(`Page ${pageNumber} of ${totalPages}`, margin, footerY, {
          align: "center",
          width: contentWidth,
        })
        .text(
          "Direct Transport Solutions - Confidential Document",
          margin,
          footerY + 12,
          { align: "center", width: contentWidth }
        );
    };

    // Apply footer to all pages
    const pages = pdfDoc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      pdfDoc.switchToPage(i);
      addFooter(i + 1, pages.count);
    }

    pdfDoc.end();
  } catch (error) {
    console.error("Error in sendPodPdf:", error);
    return res.status(500).json({ message: error.message });
  }
};

export default sendPodPdf;
