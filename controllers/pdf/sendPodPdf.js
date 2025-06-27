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

    // Generate PDF with minimal clean design
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

      await uploadBytes(storageRef, pdfBuffer, {
        contentType: "application/pdf",
      });

      const downloadURL = await getDownloadURL(storageRef);

      // ORIGINAL EMAIL HTML (reverted back)
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
                        <li><strong>Internal Ref 1:</strong> ${booking.internalReference}</li>
                        <li><strong>Internal Ref 2:</strong> ${booking.internalReference2}</li>
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

    // MINIMAL CLEAN PDF DESIGN
    const pageWidth = pdfDoc.page.width;
    const pageHeight = pdfDoc.page.height;
    const margin = 40;
    const contentWidth = pageWidth - margin * 2;

    // Simple header with logo placeholder
    const addHeader = async () => {
      // Logo placeholder - you can replace this URL with your actual logo
      const COMPANY_LOGO_URL =
        "https://www.directtransport.com.au/dts/Logo.png"; // Replace with actual logo URL

      // Simple header background
      pdfDoc.fillColor("#f8f9fa").rect(0, 0, pageWidth, 80).fill();

      const logoBuffer = await fetchImageBuffer(COMPANY_LOGO_URL);

      // Header background
      pdfDoc.fillColor("#f8f9fa").rect(0, 0, pageWidth, 80).fill();

      // Add logo with proper dimensions
      pdfDoc.image(logoBuffer, margin, 15, {
        width: 150, // Adjust width as needed
        height: 50, // Maintain aspect ratio
        align: "left",
      });

      return 100;
    };

    // Simple section title
    const addSectionTitle = (title, y) => {
      pdfDoc
        .fillColor("#2c3e50")
        .fontSize(14)
        .font("Helvetica-Bold")
        .text(title, margin, y);

      // Simple underline
      pdfDoc
        .strokeColor("#3498db")
        .lineWidth(1)
        .moveTo(margin, y + 18)
        .lineTo(margin + pdfDoc.widthOfString(title), y + 18)
        .stroke();

      return y + 30;
    };

    // Simple list format for details
    const addSimpleList = (items, startY) => {
      let currentY = startY;

      items.forEach((item) => {
        pdfDoc
          .fillColor("#2c3e50")
          .fontSize(11)
          .font("Helvetica-Bold")
          .text(`${item.label}:`, margin, currentY, { width: 160 });

        pdfDoc
          .fillColor("#333333")
          .font("Helvetica")
          .text(item.value || "N/A", margin + 130, currentY, {
            width: contentWidth - 130,
          });

        currentY += 20;
      });

      return currentY + 10;
    };

    // Start PDF generation
    let currentY = await addHeader();

    // Booking ID
    pdfDoc
      .fillColor("#e8f4fc")
      .rect(margin, currentY, contentWidth, 30)
      .fill()
      .strokeColor("#3498db")
      .lineWidth(1)
      .rect(margin, currentY, contentWidth, 30)
      .stroke();

    pdfDoc
      .fillColor("#2c3e50")
      .fontSize(12)
      .font("Helvetica-Bold")
      .text(`Job No. ${booking.docId}`, margin, currentY + 10, {
        align: "center",
        width: contentWidth,
      });

    currentY += 50;

    // Customer Details
    currentY = addSectionTitle("Customer Information", currentY);

    const customerDetails = [
      { label: "Name", value: booking.userName },
      { label: "Email", value: booking.userEmail },
      { label: "Date", value: `${booking.date} at ${booking.time}` },
    ];

    currentY = addSimpleList(customerDetails, currentY);

    // Delivery Details
    currentY = addSectionTitle("Delivery Information", currentY);

    const formatDateTime = (dateString) => {
      if (!dateString) return "N/A";

      const date = new Date(dateString);

      // Check if date is valid
      if (isNaN(date.getTime())) return "Invalid Date";

      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();

      let hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";

      // Convert to 12-hour format
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'

      return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
    };

    const deliveryDetails = [
      // { label: "Ready Date", value: booking?.date + " " + booking?.time },
      { label: "Pickup Company", value: booking?.pickupCompanyName },
      { label: "Pickup Address", value: booking?.address?.Origin?.label },
      { label: "Delivery Company", value: booking?.dropCompanyName },
      {
        label: "Delivery Address",
        value: booking?.address?.Destination?.label,
      },
      { label: "Internal Ref 1", value: booking?.internalReference },
      { label: "Internal Ref 2", value: booking?.internalReference2 },
      {
        label: "Pickup Date",
        value: formatDateTime(booking?.progressInformation?.pickedup),
      },
      {
        label: "Delivery Date",
        value: formatDateTime(booking?.progressInformation?.delivered),
      },
    ];

    currentY = addSimpleList(deliveryDetails, currentY);

    // Customer Signature
    if (booking.signUrl) {
      if (currentY > pageHeight - 200) {
        pdfDoc.addPage();
        currentY = 50;
      }

      currentY = addSectionTitle("Customer Signature", currentY);

      try {
        const signBuffer = await fetchImageBuffer(booking.signUrl);

        // Simple signature box
        pdfDoc
          .strokeColor("#cccccc")
          .lineWidth(1)
          .rect(margin, currentY, contentWidth, 100)
          .stroke();

        pdfDoc.image(signBuffer, margin + 10, currentY + 10, {
          fit: [contentWidth - 20, 80],
          align: "center",
          valign: "center",
        });

        currentY += 110;

        pdfDoc
          .fillColor("#666666")
          .fontSize(10)
          .font("Helvetica")
          .text(`Signed by: ${booking.userName}`, margin, currentY);

        currentY += 20;
      } catch (err) {
        console.warn("Signature failed to load:", err.message);
        pdfDoc
          .fillColor("#ff6b6b")
          .fontSize(10)
          .text("Signature could not be loaded", margin, currentY);
        currentY += 20;
      }
    }

    // POD Images
    if (Array.isArray(booking.images) && booking.images.length > 0) {
      if (currentY > pageHeight - 300) {
        pdfDoc.addPage();
        currentY = 50;
      }

      currentY = addSectionTitle("Delivery Photos", currentY);

      const imagesPerRow = 2;
      const imageWidth = (contentWidth - 10) / imagesPerRow;
      const imageHeight = imageWidth * 0.75;

      let imageCount = 0;
      let rowY = currentY;

      for (const [index, url] of booking.images.entries()) {
        try {
          const imgBuffer = await fetchImageBuffer(url);

          const col = imageCount % imagesPerRow;
          const imageX = margin + col * (imageWidth + 10);

          if (col === 0 && imageCount > 0) {
            rowY += imageHeight + 30;
          }

          if (rowY + imageHeight > pageHeight - 80) {
            pdfDoc.addPage();
            rowY = 50;
          }

          // Simple image border
          pdfDoc
            .strokeColor("#cccccc")
            .lineWidth(1)
            .rect(imageX, rowY, imageWidth, imageHeight + 20)
            .stroke();

          pdfDoc.image(imgBuffer, imageX + 5, rowY + 5, {
            fit: [imageWidth - 10, imageHeight - 10],
            align: "center",
            valign: "center",
          });

          // Simple caption
          pdfDoc
            .fillColor("#666666")
            .fontSize(9)
            .font("Helvetica")
            .text(`Photo ${index + 1}`, imageX, rowY + imageHeight + 5, {
              width: imageWidth,
              align: "center",
            });

          imageCount++;
        } catch (err) {
          console.warn(`Image ${index + 1} failed to load:`, err.message);
          imageCount++;
        }
      }
    }

    // Simple footer
    const addFooter = (pageNumber, totalPages) => {
      const footerY = pageHeight - 30;

      pdfDoc
        .fillColor("#666666")
        .fontSize(8)
        .font("Helvetica")
        .text(`Page ${pageNumber} of ${totalPages}`, margin, footerY, {
          align: "center",
          width: contentWidth,
        })
        .text(
          "Direct Transport Solutions - Confidential",
          margin,
          footerY + 12,
          {
            align: "center",
            width: contentWidth,
          }
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
