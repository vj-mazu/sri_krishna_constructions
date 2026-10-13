import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, Printer, X, Edit3, RotateCcw, Building2, Check } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SKC_LOGO_BASE64 } from '../logoBase64';
import { SKC_SIGNATURE_BASE64 } from '../signatureBase64';
import { showToast } from '../toast';

interface CustomInvoiceSettings {
  companyName: string;
  companyAddress: string;
  companyTagline: string;
  companyGst: string;
  companyPhone: string;
  bankHolder: string;
  bankName: string;
  bankAccount: string;
  bankIfsc: string;
  signatoryTitle: string;
  signatoryDesignation: string;
  gstRounding?: 'up' | 'nearest';
  showEwayBill?: boolean;
  repeatColumnHeaders?: boolean;
  numberStyle?: 'plain' | 'formatted';
}

export const SaleInvoiceModal: React.FC<{ 
  sale: any | any[]; 
  onClose: () => void;
  invoiceType?: 'INWARD' | 'OUTWARD' | 'WORK_ORDER';
}> = ({ sale, onClose, invoiceType }) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!sale) return null;
  
  // Normalize to array of sales / inward records
  const salesList: any[] = Array.isArray(sale) ? sale : [sale];
  if (salesList.length === 0) return null;

  const primarySale = salesList[0];
  const isInward = invoiceType === 'INWARD' || primarySale.type === 'INWARD' || primarySale.type === 'PURCHASE';
  const invoiceNo = isInward
    ? (primarySale.partyInvoiceNumber || primarySale.invoiceNumber || `SKC/INW/${primarySale.id?.slice(0, 4) || '01'}`)
    : (primarySale.invoiceNumber || primarySale.partyInvoiceNumber || primarySale.invoiceRefNo || `SKC/2026-27/${primarySale.id?.slice(0, 4) || '01'}`);
  
  const invoiceDate = primarySale.invoiceDate 
    ? new Date(primarySale.invoiceDate).toLocaleDateString('en-GB') 
    : (primarySale.supplierInvoiceDate 
      ? new Date(primarySale.supplierInvoiceDate).toLocaleDateString('en-GB')
      : (primarySale.date ? new Date(primarySale.date).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')));
  
  // Dynamic Reference: Work Order vs PO vs Inward vs Direct Sale
  const isWorkOrder = invoiceType === 'WORK_ORDER' || primarySale.sourceType === 'WORK_ORDER' || (!!primarySale.workOrderNumber && primarySale.workOrderNumber !== '-' && primarySale.workOrderNumber.trim() !== '');
  const isPo = !isWorkOrder && (primarySale.sourceType === 'PO' || !!(primarySale.purchaseOrder?.poNumber || (primarySale.poNumber && primarySale.poNumber !== '-' && primarySale.poNumber.trim() !== '')));
  
  const refLabel = isInward 
    ? (isPo ? 'PO No' : 'Supplier Inv No') 
    : (isWorkOrder ? 'WO No' : (isPo ? 'PO No' : 'Ref No'));

  const refNumber = isInward 
    ? (primarySale.purchaseOrder?.poNumber || primarySale.poNumber || primarySale.partyInvoiceNumber || '-')
    : (isWorkOrder 
      ? (primarySale.workOrderNumber || primarySale.poNumber || '-') 
      : (primarySale.purchaseOrder?.poNumber || primarySale.poNumber || '-'));
  
  const dateLabel = isInward 
    ? (isPo ? 'PO Date' : 'Supplier Inv Date') 
    : (isWorkOrder ? 'WO Date' : (isPo ? 'PO Date' : 'Order Date'));

  const rawRefDate = isInward
    ? (primarySale.purchaseOrder?.date || primarySale.poDate || primarySale.supplierInvoiceDate || primarySale.invoiceDate || primarySale.date)
    : (isWorkOrder 
      ? (primarySale.workOrderDate || primarySale.poDate) 
      : (primarySale.purchaseOrder?.date || primarySale.poDate || primarySale.date));
  const refDate = rawRefDate ? new Date(rawRefDate).toLocaleDateString('en-GB') : invoiceDate;

  // Party info
  const partyName = primarySale.partyName || primarySale.clientDepartment || primarySale.supplierName || (isInward ? 'Supplier' : 'Customer');
  const partyAddress = primarySale.partyAddress || primarySale.supplierAddress || primarySale.clientAddress || '';
  const partyGst = primarySale.gstNumber || primarySale.partyGstNumber || primarySale.clientGst || '';
  const eWayBillNo = primarySale.eWayBillNumber || primarySale.eWayBillNo || primarySale.ewayBillNumber || primarySale.ewayBillNo || salesList.find(s => s.eWayBillNumber || s.eWayBillNo)?.eWayBillNumber || '';
  const vehicleNo = primarySale.vehicleNumber || primarySale.vehicleNo || salesList.find(s => s.vehicleNumber || s.vehicleNo)?.vehicleNumber || '';
  const shippedToText = primarySale.shippedTo || partyAddress || partyName || '-';
  const divLabel = primarySale.divisionName || primarySale.purchaseOrder?.division?.name || primarySale.remarks || '-';

  // Customizable Company & Bank Details state with localStorage caching
  const defaultSettings: CustomInvoiceSettings = {
    companyName: primarySale.companyName || 'SRI KRISHNA CONSTRUCTIONS',
    companyAddress: primarySale.companyAddress || 'H.no 2436 Raghavendra Colony Shaktinagar Raichur Karnataka-584170',
    companyTagline: 'All type of air compressor Service and Spares Avaliable.',
    companyGst: primarySale.companyGstNumber || '29DWKPP3582H1ZV',
    companyPhone: primarySale.companyPhone || '8496841904',
    bankHolder: 'Sri Krishna Constructions',
    bankName: 'Canara Bank Deosugur Branch',
    bankAccount: '18133070005349',
    bankIfsc: 'CNRB0011813',
    signatoryTitle: 'For Sri Krishna Constructions',
    signatoryDesignation: 'Proprietor',
    gstRounding: 'up',
    showEwayBill: false,
    repeatColumnHeaders: false,
    numberStyle: 'plain'
  };

  const [customSettings, setCustomSettings] = useState<CustomInvoiceSettings>(() => {
    const saved = localStorage.getItem('skc_invoice_custom_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          companyName: parsed.companyName !== undefined ? parsed.companyName : defaultSettings.companyName,
          companyAddress: parsed.companyAddress !== undefined ? parsed.companyAddress : defaultSettings.companyAddress,
          companyTagline: parsed.companyTagline !== undefined ? parsed.companyTagline : defaultSettings.companyTagline,
          companyGst: parsed.companyGst !== undefined ? parsed.companyGst : defaultSettings.companyGst,
          companyPhone: parsed.companyPhone !== undefined ? parsed.companyPhone : defaultSettings.companyPhone,
          bankHolder: parsed.bankHolder !== undefined ? parsed.bankHolder : defaultSettings.bankHolder,
          bankName: parsed.bankName !== undefined ? parsed.bankName : defaultSettings.bankName,
          bankAccount: parsed.bankAccount !== undefined ? parsed.bankAccount : defaultSettings.bankAccount,
          bankIfsc: parsed.bankIfsc !== undefined ? parsed.bankIfsc : defaultSettings.bankIfsc,
          signatoryTitle: parsed.signatoryTitle !== undefined ? parsed.signatoryTitle : defaultSettings.signatoryTitle,
          signatoryDesignation: parsed.signatoryDesignation !== undefined ? parsed.signatoryDesignation : defaultSettings.signatoryDesignation,
          gstRounding: parsed.gstRounding || 'up',
          showEwayBill: parsed.showEwayBill || false,
          repeatColumnHeaders: parsed.repeatColumnHeaders || false,
          numberStyle: parsed.numberStyle || 'plain'
        };
      } catch (_) {}
    }
    return defaultSettings;
  });

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [tempSettings, setTempSettings] = useState<CustomInvoiceSettings>(customSettings);

  const handleSaveSettings = () => {
    setCustomSettings(tempSettings);
    localStorage.setItem('skc_invoice_custom_settings', JSON.stringify(tempSettings));
    setShowSettingsModal(false);
    showToast('Invoice Header & Bank Details updated successfully', 'success');
  };

  const handleResetSettings = () => {
    setTempSettings(defaultSettings);
    setCustomSettings(defaultSettings);
    localStorage.removeItem('skc_invoice_custom_settings');
    setShowSettingsModal(false);
    showToast('Invoice Header reset to system default', 'info');
  };

  // Format currency helper preserving paise if fractional
  const fmt = (n: number) => {
    const rounded = Math.round((Number(n) + Number.EPSILON) * 100) / 100;
    return rounded.toLocaleString('en-IN', {
      minimumFractionDigits: rounded % 1 !== 0 ? 2 : 0,
      maximumFractionDigits: 2
    });
  };
  const round2 = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

  // Calculate totals across all items with precision
  let totalBasic = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalShipping = 0;

  const itemsRows = salesList.map((s, idx) => {
    const itm = s.purchaseOrderItem || s.item || s.stock || {};
    const q = Number(s.qty || s.quantity || 0);
    const r = Number(s.rate || s.unitPrice || 0);
    const b = round2(q * r);
    const ship = Number(s.shippingCharges || 0);
    
    const cgstPct = s.cgstPercent !== undefined && s.cgstPercent !== null ? Number(s.cgstPercent) : 0;
    const sgstPct = s.sgstPercent !== undefined && s.sgstPercent !== null ? Number(s.sgstPercent) : 0;
    const igstPct = s.igstPercent !== undefined && s.igstPercent !== null ? Number(s.igstPercent) : 0;

    const cg = round2(b * (cgstPct / 100));
    const sg = round2(b * (sgstPct / 100));
    const ig = round2(b * (igstPct / 100));

    totalBasic = round2(totalBasic + b);
    totalCgst = round2(totalCgst + cg);
    totalSgst = round2(totalSgst + sg);
    totalIgst = round2(totalIgst + ig);
    totalShipping = round2(totalShipping + ship);

    const rawDiscription = s.receivedItemName || s.itemName || itm.itemName || s.description || 'ITEM';
    let fullSpecs = itm.specifications || s.specifications || s.description || s.remarks || '';
    const actualPartNumber = s.receivedPartNumber || itm.partNumber || s.partNumber || '';
    if (!fullSpecs) {
      if (actualPartNumber) {
        fullSpecs = `${rawDiscription} MAKE- ${itm.make || 'KIRLOSKAR'}, P NO: ${actualPartNumber}`;
      } else {
        fullSpecs = rawDiscription;
      }
    }

    return {
      slNo: idx + 1,
      kpclCode: itm.kpclCode || s.kpclCode || '-',
      itemName: rawDiscription,
      specifications: fullSpecs,
      partNumber: actualPartNumber,
      unit: itm.unit || s.unit || "No's",
      qty: q,
      rate: r,
      amount: b,
      shippingCharges: ship,
      cgstPercent: cgstPct,
      sgstPercent: sgstPct,
      igstPercent: igstPct
    };
  });

  const totalInvoiceAmount = round2(totalBasic + totalCgst + totalSgst + totalIgst + totalShipping);

  // Number to Indian Rupees words converter
  const numberToWords = (num: number): string => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const inWords = (n: number): string => {
      let str = '';
      if (n > 9999999) {
        str += inWords(Math.floor(n / 10000000)) + 'Crore ';
        n %= 10000000;
      }
      if (n > 99999) {
        str += inWords(Math.floor(n / 100000)) + 'Lakh ';
        n %= 100000;
      }
      if (n > 999) {
        str += inWords(Math.floor(n / 1000)) + 'Thousand ';
        n %= 1000;
      }
      if (n > 99) {
        str += inWords(Math.floor(n / 100)) + 'Hundred ';
        n %= 100;
      }
      if (n > 0) {
        if (n < 20) {
          str += a[n];
        } else {
          str += b[Math.floor(n / 10)] + (n % 10 > 0 ? ' ' + a[n % 10] : ' ');
        }
      }
      return str;
    };

    const whole = Math.floor(num);
    const fraction = Math.round((num - whole) * 100);
    let result = inWords(whole) || 'Zero ';
    result = 'INR ' + result.trim() + ' Rupees';
    if (fraction > 0) {
      result += ' and ' + inWords(fraction).trim() + ' Paise';
    }
    return result + ' Only';
  };

  const amountInWordsText = numberToWords(totalInvoiceAmount);

  const effectiveCgstPercent = primarySale.cgstPercent !== undefined ? Number(primarySale.cgstPercent) : (itemsRows[0]?.cgstPercent || 0);
  const effectiveSgstPercent = primarySale.sgstPercent !== undefined ? Number(primarySale.sgstPercent) : (itemsRows[0]?.sgstPercent || 0);
  const effectiveIgstPercent = primarySale.igstPercent !== undefined ? Number(primarySale.igstPercent) : (itemsRows[0]?.igstPercent || 0);

  const generatePdf = (): jsPDF => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = 210;
    const margin = 10;
    const contentWidth = pageWidth - (margin * 2); // 190mm

    let y = 8;

    const drawHeaderBox = (targetY = 8) => {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.4);
      doc.rect(margin, targetY, contentWidth, 24);

      if (SKC_LOGO_BASE64) {
        try {
          doc.addImage(SKC_LOGO_BASE64, 'PNG', margin + 2.5, targetY + 2, 19, 19);
        } catch (e) {
          console.warn('Logo render fallback:', e);
        }
      }

      // Title text: Company Name (Bold Red Serif)
      doc.setTextColor(218, 18, 18);
      doc.setFont('times', 'bold');
      doc.setFontSize(17);
      doc.text(customSettings.companyName !== undefined ? customSettings.companyName : (primarySale.companyName || 'SRI KRISHNA CONSTRUCTIONS'), pageWidth / 2, targetY + 6.5, { align: 'center' });

      // Subtitle & Address
      doc.setTextColor(0, 0, 0);
      doc.setFont('times', 'normal');
      doc.setFontSize(8.5);
      doc.text(customSettings.companyAddress !== undefined ? customSettings.companyAddress : (primarySale.companyAddress || 'H.no 2436 Raghavendra Colony Shaktinagar Raichur Karnataka-584170'), pageWidth / 2, targetY + 11.2, { align: 'center' });
      
      doc.setFont('times', 'normal');
      doc.setFontSize(8.5);
      doc.text(customSettings.companyTagline !== undefined ? customSettings.companyTagline : 'All type of air compressor Service and Spares Avaliable.', pageWidth / 2, targetY + 15.8, { align: 'center' });

      // Horizontal line dividing company header and GST/Mobile row (EXACT MATCH TO PHYSICAL INVOICE)
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.35);
      doc.line(margin, targetY + 18.5, margin + contentWidth, targetY + 18.5);

      // GST and Mobile Bar
      doc.setFont('times', 'bold');
      doc.setFontSize(8.2);
      doc.text(`GST NO: ${customSettings.companyGst !== undefined ? customSettings.companyGst : (primarySale.companyGstNumber || '29DWKPP3582H1ZV')}`, margin + 2.5, targetY + 22.3);
      doc.text(`Mobile No: ${customSettings.companyPhone !== undefined ? customSettings.companyPhone : (primarySale.companyPhone || '8496841904')}`, pageWidth - margin - 2.5, targetY + 22.3, { align: 'right' });
    };

    // 1. TOP HEADER BOX ON PAGE 1
    drawHeaderBox(y);
    y += 24;

    // 2. BOXED TAX INVOICE TITLE (PAGE 1 ONLY)
    doc.rect(margin, y, contentWidth, 6.5);
    doc.setFontSize(13);
    doc.setFont('times', 'bold');
    doc.text(isInward ? 'INWARD MATERIAL RECEIPT' : 'TAX INVOICE', pageWidth / 2, y + 4.8, { align: 'center' });
    y += 6.5;

    // 3. TWO-COLUMN INVOICE & DISPATCH DETAILS GRID (EXACT 4-ROW PHYSICAL LAYOUT)
    const boxHeight = 52;
    const colHalf = contentWidth / 2; // 95mm

    doc.rect(margin, y, contentWidth, boxHeight);
    doc.line(margin + colHalf, y, margin + colHalf, y + boxHeight); // vertical center divider

    // Exact continuous horizontal row dividers across both columns
    doc.line(margin, y + 6.5, margin + contentWidth, y + 6.5); // Row 1 divider (Inv No & PO No)
    doc.line(margin, y + 13, margin + contentWidth, y + 13);   // Row 2 divider (Inv Date & PO Date)
    doc.line(margin, y + 42, margin + contentWidth, y + 42);   // Row 3 divider (Supply To & Shipped To)

    // Row 1: Left: Invoice/Receipt No, Right: PO No / WO No / Ref No
    doc.setFont('times', 'bold');
    doc.setFontSize(8);
    doc.text(`${isInward ? 'RECEIPT NO' : 'INVOICE NO'}: ${invoiceNo}`, margin + 2, y + 4.6);
    doc.text(`${refLabel}: ${refNumber}`, margin + colHalf + 2, y + 4.6);

    // Row 2: Left: Invoice/Receipt Date, Right: Order/WO Date
    doc.text(`${isInward ? 'RECEIPT DATE' : 'INVOICE DATE'}: ${invoiceDate}`, margin + 2, y + 11.1);
    doc.text(`${dateLabel}: ${refDate}`, margin + colHalf + 2, y + 11.1);

    // Row 3 Left: Supply To, Paying Authority Address & GSTIN
    const supplyToText = primarySale.placeOfWork || partyName || '-';
    doc.text(`SUPPLY To : ${supplyToText}`, margin + 2, y + 17);
    doc.setFont('times', 'normal');
    doc.setFontSize(7.5);
    
    if (partyAddress) {
      const addressLines = doc.splitTextToSize(partyAddress, colHalf - 4);
      doc.text(addressLines.slice(0, 5), margin + 2, y + 21);
    } else if (partyName && partyName !== '-' && partyName !== 'Customer' && partyName !== 'Supplier') {
      doc.text(`Party: ${partyName}`, margin + 2, y + 21);
    }
    
    doc.setFont('times', 'bold');
    doc.setFontSize(8);
    doc.text(`GST NO: ${partyGst || '-'}`, margin + 2, y + 39.5);

    // Row 3 Right: State of Supply, Shipped To Address & GSTIN
    doc.text(`State of Supply: ${primarySale.stateOfSupply || 'KARNATAKA'}`, margin + colHalf + 2, y + 17);
    doc.setFont('times', 'normal');
    doc.setFontSize(7.5);

    const shippedToText = primarySale.shippedTo || partyAddress || partyName || '-';
    const shipLines = doc.splitTextToSize(`Shipped To: ${shippedToText}`, colHalf - 4);
    doc.text(shipLines.slice(0, 5), margin + colHalf + 2, y + 21);
    
    doc.setFont('times', 'bold');
    doc.setFontSize(8);
    doc.text(`GST NO: ${partyGst || '-'}`, margin + colHalf + 2, y + 39.5);

    // Row 4 Left: Division
    const divLabel = primarySale.divisionName || primarySale.purchaseOrder?.division?.name || primarySale.remarks || '-';
    doc.text(`Division: ${divLabel}`, margin + 2, y + 47.5);

    // Row 4 Right: Vehicle No & E-Way Bill
    const hasVehicle = vehicleNo && vehicleNo !== '-';
    const hasEway = eWayBillNo && eWayBillNo !== '-';

    if (hasVehicle && hasEway) {
      doc.setFontSize(7.5);
      doc.text(`Vehicle No : ${vehicleNo}`, margin + colHalf + 2, y + 46);
      doc.text(`E-Way Bill : ${eWayBillNo}`, margin + colHalf + 2, y + 50);
    } else if (hasEway) {
      doc.setFontSize(8);
      doc.text(`E-Way Bill : ${eWayBillNo}`, margin + colHalf + 2, y + 47.5);
    } else {
      doc.setFontSize(8);
      doc.text(`Vehicle No : ${vehicleNo || '-'}`, margin + colHalf + 2, y + 47.5);
    }

    y += boxHeight;

    // 4. INVOICE ITEMS TABLE WITH COMPACT KPCL AND EXACT COLUMN WIDTHS
    const tableBody = itemsRows.map((r) => [
      r.slNo.toString(),
      r.kpclCode || '-',
      r.itemName,
      `${r.specifications}${r.partNumber && !r.specifications.includes(r.partNumber) ? `\nP NO: ${r.partNumber}` : ''}`,
      r.unit === 'NOS' ? "No's" : (r.unit || "No's"),
      r.qty.toString(),
      fmt(r.rate),
      fmt(r.amount)
    ]);

    autoTable(doc, {
      startY: y,
      margin: { top: 32, left: margin, right: margin, bottom: 16 },
      head: [
        [
          { content: 'SI\nNO', styles: { halign: 'center' } },
          { content: 'KPCL ITEM\nCODE', styles: { halign: 'center' } },
          { content: 'Discription', styles: { halign: 'center' } },
          { content: 'ITEM NAME &\nSPECIFICATION', styles: { halign: 'center' } },
          { content: 'UNIT', styles: { halign: 'center' } },
          { content: 'QTY', styles: { halign: 'center' } },
          { content: 'PRICE', styles: { halign: 'center' } },
          { content: 'AMOUNT', styles: { halign: 'center' } }
        ]
      ],
      body: tableBody,
      theme: 'grid',
      rowPageBreak: 'avoid', // PREVENTS ANY ROW FROM SPLITTING HALFWAY ACROSS PAGES
      styles: {
        font: 'times',
        fontSize: 8.0,
        lineColor: [0, 0, 0],
        lineWidth: 0.4,
        textColor: [0, 0, 0],
        cellPadding: { top: 1.6, bottom: 1.6, left: 1.5, right: 1.5 },
        valign: 'middle'
      },
      headStyles: {
        font: 'times',
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 8.2,
        valign: 'middle',
        lineWidth: 0.4,
        lineColor: [0, 0, 0]
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255]
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 9, fontStyle: 'bold' },
        1: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
        2: { halign: 'left', cellWidth: 38, fontStyle: 'bold' },
        3: { halign: 'left', cellWidth: 59, fontStyle: 'normal' },
        4: { halign: 'center', cellWidth: 11, fontStyle: 'bold' },
        5: { halign: 'center', cellWidth: 11, fontStyle: 'bold' },
        6: { halign: 'right', cellWidth: 18, fontStyle: 'bold' },
        7: { halign: 'right', cellWidth: 22, fontStyle: 'bold' }
      },
      didDrawPage: (data) => {
        // Draw top header banner on all subsequent pages (page 2, 3...)
        if (data.pageNumber > 1) {
          drawHeaderBox(8);
        }
      }
    });

    const finalTableY = (doc as any).lastAutoTable?.finalY || (y + 40);

    // Check if space is sufficient on current page for totals box & signatures (needs ~68mm)
    let fy = finalTableY;
    if (fy + 68 > 278) {
      doc.addPage();
      drawHeaderBox(8);
      fy = 32;
    }

    // 5. BOTTOM TOTALS BOX & BANK DETAILS (MATCHING KPCL 128mm / 40mm / 22mm COLUMNS)
    const leftBoxWidth = 128; // cols 0..3 (9+22+38+59 = 128mm)
    const middleWidth = 40;   // cols 4..6 (11+11+18 = 40mm)
    const rightColWidth = 22; // col 7 (22mm)
    const bottomBoxHeight = 35;

    // Outer Box border & Vertical Dividers
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.rect(margin, fy, contentWidth, bottomBoxHeight);
    doc.line(margin + leftBoxWidth, fy, margin + leftBoxWidth, fy + bottomBoxHeight); // Vertical Line 1 (col 4 border)
    doc.line(margin + leftBoxWidth + middleWidth, fy, margin + leftBoxWidth + middleWidth, fy + bottomBoxHeight); // Vertical Line 2 (col 7 border)

    // Left Box: Total Invoice amount in words + Bank Details
    doc.setFont('times', 'bold');
    doc.setFontSize(8.2);
    doc.text('Total Invoice amount in words: ', margin + 2, fy + 4.2);
    const inWordsClean = amountInWordsText.replace(/^INR\s*/i, '').replace(/Rupees/i, 'Rupees').trim();
    const wordsLines = doc.splitTextToSize(inWordsClean, leftBoxWidth - 4);
    doc.text(wordsLines.slice(0, 2), margin + 2, fy + 8.2);

    doc.line(margin, fy + 12.5, margin + leftBoxWidth, fy + 12.5);

    doc.setFont('times', 'bold');
    doc.text('Bank Details :', margin + 2, fy + 16.5);
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.text(`Account Holder Name : ${customSettings.bankHolder !== undefined ? customSettings.bankHolder : 'Sri Krishna Constructions'}`, margin + 2, fy + 20.5);
    doc.text(`Bank Name : ${customSettings.bankName !== undefined ? customSettings.bankName : 'Canara Bank Deosugur Branch'}`, margin + 2, fy + 24.5);
    doc.text(`Bank Account No: ${customSettings.bankAccount !== undefined ? customSettings.bankAccount : '18133070005349'}`, margin + 2, fy + 28.5);
    doc.text(`IFSC Code:${customSettings.bankIfsc !== undefined ? customSettings.bankIfsc : 'CNRB0011813'}`, margin + 2, fy + 32.5);

    // Right Box: Basic Cost, Taxes (SGST, CGST, IGST), Shipping, TOTAL TAX AMOUNT, TOTAL AMOUNT
    const labelX = margin + leftBoxWidth + 2;
    const numberX = margin + contentWidth - 2;

    const summaryRows: Array<{ label: string; value: string; isBold?: boolean }> = [];
    summaryRows.push({ label: 'Basic Cost', value: fmt(totalBasic) });

    if (totalSgst > 0 || totalCgst > 0) {
      summaryRows.push({ label: `SGST ${effectiveSgstPercent > 0 ? effectiveSgstPercent + '%' : ''}`.trim(), value: fmt(totalSgst) });
      summaryRows.push({ label: `CGST ${effectiveCgstPercent > 0 ? effectiveCgstPercent + '%' : ''}`.trim(), value: fmt(totalCgst) });
    }
    if (totalIgst > 0) {
      summaryRows.push({ label: `IGST ${effectiveIgstPercent > 0 ? effectiveIgstPercent + '%' : ''}`.trim(), value: fmt(totalIgst) });
    }
    if (totalCgst === 0 && totalSgst === 0 && totalIgst === 0) {
      summaryRows.push({ label: 'GST (0%)', value: fmt(0) });
    }
    if (totalShipping > 0) {
      summaryRows.push({ label: 'Shipping Charges', value: fmt(totalShipping) });
    }
    const totalTax = round2(totalCgst + totalSgst + totalIgst);
    summaryRows.push({ label: 'TOTAL TAX AMOUNT', value: fmt(totalTax), isBold: true });
    summaryRows.push({ label: 'TOTAL AMOUNT', value: fmt(totalInvoiceAmount), isBold: true });

    const rowHeight = bottomBoxHeight / summaryRows.length;
    summaryRows.forEach((row, rIdx) => {
      const rowY = fy + (rIdx * rowHeight);
      doc.setFont('times', row.isBold ? 'bold' : 'normal');
      doc.setFontSize(row.isBold ? 8.5 : 8.0);
      doc.text(row.label, labelX, rowY + (rowHeight * 0.70));
      doc.text(row.value, numberX, rowY + (rowHeight * 0.70), { align: 'right' });
      if (rIdx < summaryRows.length - 1) {
        doc.line(margin + leftBoxWidth, rowY + rowHeight, margin + contentWidth, rowY + rowHeight);
      }
    });

    // 6. Signatures (Royal Blue Company Title & Underlined Signatory)
    let sigY = fy + bottomBoxHeight + 5;
    if (sigY + 22 > 280) {
      doc.addPage();
      drawHeaderBox(8);
      sigY = 36;
    }
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text('Your Faithfully', pageWidth - margin - 22, sigY, { align: 'center' });
    
    // Royal Blue for company signature & Proprietor designation
    doc.setFont('times', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(43, 87, 151); // #2b5797
    doc.text(customSettings.signatoryTitle || 'For Sri Krishna Constructions', pageWidth - margin - 22, sigY + 5.5, { align: 'center' });
    
    // Draw cropped signature image if available
    if (SKC_SIGNATURE_BASE64) {
      try {
        doc.addImage(SKC_SIGNATURE_BASE64, 'PNG', pageWidth - margin - 32, sigY + 6.5, 20, 11);
      } catch (_) {}
    }

    // Proprietor designation in matching serif
    doc.setTextColor(43, 87, 151); // #2b5797
    doc.setFont('times', 'normal');
    doc.setFontSize(10.5);
    doc.text(customSettings.signatoryDesignation || 'Proprietor', pageWidth - margin - 22, sigY + 19, { align: 'center' });

    // 7. Render exact, synchronized page count on every page (e.g., Page 1 of 3, Page 2 of 3, Page 3 of 3)
    const totalPages = typeof (doc as any).getNumberOfPages === 'function' 
      ? (doc as any).getNumberOfPages() 
      : ((doc.internal as any).pages ? (doc.internal as any).pages.length - 1 : 1);

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('times', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, 292, { align: 'center' });
    }

    return doc;
  };

  const downloadPdf = async () => {
    try {
      showToast('Generating pixel-perfect Tax Invoice PDF...', 'info');
      const backendItems = itemsRows.map(r => ({
        sl_no: r.slNo,
        kpcl_code: r.kpclCode,
        description: r.itemName,
        specification: r.specifications,
        unit: r.unit,
        qty: r.qty,
        price: r.rate,
        amount: r.amount
      }));

      const payload = {
        invoiceData: {
          invoice_no: invoiceNo,
          invoice_date: invoiceDate,
          po_no: refNumber,
          order_date: refDate,
          supply_to: primarySale.placeOfWork || partyName || 'SHAKTINAGAR',
          state_of_supply: primarySale.stateOfSupply || 'KARNATAKA',
          bill_to_block: partyAddress ? `TO Paying Authority:${partyName}\n${partyAddress}\nGST NO:${partyGst || '-'}` : (partyName ? `TO Paying Authority:${partyName}\nGST NO:${partyGst || '-'}` : ''),
          ship_to_block: shippedToText ? `Shipped To: ${shippedToText}\nGST NO:${partyGst || '-'}` : '',
          division: divLabel,
          vehicle_no: vehicleNo,
          eway_bill: eWayBillNo,
          company_gstin: customSettings.companyGst,
          company_mobile: customSettings.companyPhone,
          bank_holder: customSettings.bankHolder,
          bank_name: customSettings.bankName,
          bank_account_no: customSettings.bankAccount,
          bank_ifsc: customSettings.bankIfsc,
          items: backendItems
        },
        settings: {
          gst_rounding: customSettings.gstRounding || 'up',
          show_eway_bill: customSettings.showEwayBill || false,
          repeat_column_headers: customSettings.repeatColumnHeaders || false,
          number_style: customSettings.numberStyle || 'plain'
        }
      };

      const token = localStorage.getItem('iac_token') || localStorage.getItem('token');
      const apiBase = (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && !window.location.hostname.includes('onrender.com'))
        ? 'https://sri-krishna-constructions.onrender.com/api'
        : (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com') ? '/api' : 'http://localhost:5000/api');

      const response = await fetch(`${apiBase}/sales/generate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${isInward ? 'INWARD_RECEIPT' : 'TAX_INVOICE'}_${invoiceNo.replaceAll('/', '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showToast('Tax Invoice PDF downloaded successfully (Original Fidelity)', 'success');
        return;
      } else {
        const errJson = await response.json().catch(() => ({}));
        console.warn('Backend PDF generator returned non-ok:', response.status, errJson);
      }
    } catch (e) {
      console.warn('Backend PDF generator fallback:', e);
    }

    try {
      const doc = generatePdf();
      doc.save(`${isInward ? 'INWARD_RECEIPT' : 'TAX_INVOICE'}_${invoiceNo.replaceAll('/', '_')}.pdf`);
      showToast('Tax Invoice PDF downloaded successfully (client fallback)', 'success');
    } catch (error) {
      console.error('Failed to generate Tax Invoice PDF:', error);
      showToast('Error generating PDF. Please check console for details.', 'error');
    }
  };

  const printPdf = async () => {
    try {
      showToast('Preparing Tax Invoice for printing...', 'info');
      const backendItems = itemsRows.map(r => ({
        sl_no: r.slNo,
        kpcl_code: r.kpclCode,
        description: r.itemName,
        specification: r.specifications,
        unit: r.unit,
        qty: r.qty,
        price: r.rate,
        amount: r.amount
      }));

      const payload = {
        invoiceData: {
          invoice_no: invoiceNo,
          invoice_date: invoiceDate,
          po_no: refNumber,
          order_date: refDate,
          supply_to: primarySale.placeOfWork || partyName || 'SHAKTINAGAR',
          state_of_supply: primarySale.stateOfSupply || 'KARNATAKA',
          bill_to_block: partyAddress ? `TO Paying Authority:${partyName}\n${partyAddress}\nGST NO:${partyGst || '-'}` : (partyName ? `TO Paying Authority:${partyName}\nGST NO:${partyGst || '-'}` : ''),
          ship_to_block: shippedToText ? `Shipped To: ${shippedToText}\nGST NO:${partyGst || '-'}` : '',
          division: divLabel,
          vehicle_no: vehicleNo,
          eway_bill: eWayBillNo,
          company_gstin: customSettings.companyGst,
          company_mobile: customSettings.companyPhone,
          bank_holder: customSettings.bankHolder,
          bank_name: customSettings.bankName,
          bank_account_no: customSettings.bankAccount,
          bank_ifsc: customSettings.bankIfsc,
          items: backendItems
        },
        settings: {
          gst_rounding: customSettings.gstRounding || 'up',
          show_eway_bill: customSettings.showEwayBill || false,
          repeat_column_headers: customSettings.repeatColumnHeaders || false,
          number_style: customSettings.numberStyle || 'plain'
        }
      };

      const token = localStorage.getItem('iac_token') || localStorage.getItem('token');
      const apiBase = (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && !window.location.hostname.includes('onrender.com'))
        ? 'https://sri-krishna-constructions.onrender.com/api'
        : (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com') ? '/api' : 'http://localhost:5000/api');

      const response = await fetch(`${apiBase}/sales/generate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const pdfBlob = await response.blob();
        const blobUrl = URL.createObjectURL(pdfBlob);
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.src = blobUrl;
        document.body.appendChild(iframe);
        iframe.onload = () => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            try { document.body.removeChild(iframe); } catch (_) {}
            URL.revokeObjectURL(blobUrl);
          }, 60000);
        };
        return;
      }
    } catch (e) {
      console.warn('Backend PDF print fallback:', e);
    }

    try {
      const doc = generatePdf();
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = blobUrl;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          try {
            document.body.removeChild(iframe);
          } catch (_) {}
          URL.revokeObjectURL(blobUrl);
        }, 60000);
      };
    } catch (error) {
      console.error('Print PDF failed, falling back to window.print():', error);
      window.print();
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[999999] flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-fadeIn invoice-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <style>{`
        @media print {
          body {
            overflow: visible !important;
          }
          .invoice-modal-overlay {
            position: static !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            z-index: auto !important;
          }
          .invoice-modal-container {
            position: static !important;
            max-height: none !important;
            height: auto !important;
            overflow: visible !important;
            border: none !important;
            box-shadow: none !important;
            width: 100% !important;
            max-width: 100% !important;
            border-radius: 0 !important;
          }
          .invoice-sheet-container {
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }
          .invoice-sheet {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            font-family: 'Times New Roman', Times, serif !important;
          }
          .no-print {
            display: none !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
        }
      `}</style>
      
      {/* CLEAN ENTERPRISE MODAL CONTAINER */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl border border-slate-300 flex flex-col h-[90vh] max-h-[90vh] overflow-hidden animate-fadeIn relative z-[1000000] invoice-modal-container">
        
        {/* MODAL TOP HEADER BAR */}
        <div className="bg-[#1e3a8a] text-white px-4 py-3 sm:px-6 sm:py-3.5 flex flex-wrap justify-between items-center gap-2 shrink-0 border-b border-blue-950 no-print">
          <div className="flex items-center gap-2.5 min-w-0">
            <Printer className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base truncate">
                {isInward ? 'Inward Material Receipt / Invoice' : 'Tax Invoice'} • {invoiceNo}
              </h3>
              <p className="text-[10px] sm:text-xs text-blue-200 truncate">
                {itemsRows.length} item{itemsRows.length > 1 ? 's' : ''} • Date: {invoiceDate}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setTempSettings(customSettings);
                setShowSettingsModal(true);
              }}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 shadow transition-all cursor-pointer"
              title="Edit Top Header, Phone & Bank Details"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Header / Bank
            </button>
            <button
              onClick={printPdf}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow transition-all cursor-pointer"
              title="Print All Pages Directly"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <button
              onClick={downloadPdf}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow transition-all cursor-pointer"
              title="Download Portrait PDF"
            >
              <Download className="w-4 h-4" /> Download PDF
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer ml-1"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* AUTHENTIC TAX INVOICE SHEET (SCROLLABLE CONTAINER) */}
        <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y p-3 sm:p-6 bg-slate-100 flex justify-center invoice-sheet-container">
          <div 
            className="bg-white p-4 sm:p-8 rounded-xl shadow-md border border-slate-300 w-full max-w-4xl text-black text-xs self-start my-1 sm:my-3 font-serif invoice-sheet"
            style={{ fontFamily: "'Times New Roman', Times, serif" }}
          >
            
            {/* 1. TOP HEADER BOX WITH BORDER, LOGO & COMPANY INFO */}
            <div className="border border-black p-2.5">
              <div className="flex items-center justify-between gap-4">
                <img 
                  src={SKC_LOGO_BASE64 || '/skc_logo.png'} 
                  alt="SKC Logo" 
                  className="w-16 sm:w-20 h-16 sm:h-20 object-contain shrink-0" 
                />
                <div className="flex-1 text-center pr-8 sm:pr-14">
                  <h1 className="text-xl sm:text-2xl font-black text-[#da1212] tracking-wide uppercase leading-tight font-serif">
                    {customSettings.companyName !== undefined ? customSettings.companyName : (primarySale.companyName || 'SRI KRISHNA CONSTRUCTIONS')}
                  </h1>
                  <p className="text-[11.5px] font-normal text-black mt-0.5">
                    {customSettings.companyAddress !== undefined ? customSettings.companyAddress : (primarySale.companyAddress || 'H.no 2436 Raghavendra Colony Shaktinagar Raichur Karnataka-584170')}
                  </p>
                  <p className="text-[11.5px] font-normal text-black mt-0.5">
                    {customSettings.companyTagline !== undefined ? customSettings.companyTagline : 'All type of air compressor Service and Spares Avaliable.'}
                  </p>
                </div>
              </div>
              <div className="border-t border-black mt-2 pt-1 flex justify-between items-center text-[11px] font-bold text-black px-1">
                <span>GST NO: {customSettings.companyGst !== undefined ? customSettings.companyGst : (primarySale.companyGstNumber || '29DWKPP3582H1ZV')}</span>
                <span>Mobile No: {customSettings.companyPhone !== undefined ? customSettings.companyPhone : (primarySale.companyPhone || '8496841904')}</span>
              </div>
            </div>

            {/* 2. TAX INVOICE TITLE BOX */}
            <div className="border-x border-b border-black py-1.5 text-center font-bold text-lg sm:text-xl uppercase tracking-wider bg-white">
              {isInward ? 'INWARD MATERIAL RECEIPT' : 'TAX INVOICE'}
            </div>

            {/* 3. TWO-COLUMN INVOICE & DISPATCH DETAILS GRID (EXACT 63% / 37% PHYSICAL SPLIT) */}
            <div className="border-x border-b border-black flex text-[11px]">
              {/* Left Column (63%) */}
              <div className="w-[63%] border-r border-black divide-y divide-black flex flex-col">
                <div className="p-1.5 font-bold">
                  {isInward ? 'RECEIPT NO' : 'INVOICE NO'}: <span className="font-bold">{invoiceNo}</span>
                </div>
                <div className="p-1.5 font-bold">
                  {isInward ? 'RECEIPT DATE' : 'INVOICE DATE'}: <span className="font-bold">{invoiceDate}</span>
                </div>
                <div className="p-1.5 min-h-[92px] flex flex-col justify-between">
                  <div>
                    <div className="font-bold">SUPPLY To : {primarySale.placeOfWork || partyName || '-'}</div>
                    {partyAddress ? (
                      <div className="text-[10.5px] font-bold text-black whitespace-pre-wrap mt-0.5">{partyAddress}</div>
                    ) : (
                      <div className="text-[10.5px] font-bold text-black mt-0.5">{partyName || '-'}</div>
                    )}
                  </div>
                  <div className="font-bold mt-1">GST NO:{partyGst || '-'}</div>
                </div>
                <div className="p-1.5 font-bold">
                  Division: <span className="font-bold">{primarySale.divisionName || primarySale.purchaseOrder?.division?.name || primarySale.remarks || '-'}</span>
                </div>
              </div>

              {/* Right Column (37%) */}
              <div className="w-[37%] divide-y divide-black flex flex-col">
                <div className="p-1.5 font-bold">
                  {refLabel}: <span className="font-bold">{refNumber}</span>
                </div>
                <div className="p-1.5 font-bold">
                  {dateLabel}: <span className="font-bold">{refDate}</span>
                </div>
                <div className="p-1.5 min-h-[92px] flex flex-col justify-between">
                  <div>
                    <div className="font-bold">State of Supply: {primarySale.stateOfSupply || 'KARNATAKA'}</div>
                    <div className="font-bold mt-0.5">Shipped To: <span className="font-bold">{primarySale.shippedTo || partyAddress || partyName || '-'}</span></div>
                  </div>
                  <div className="font-bold mt-1">GST NO:{partyGst || '-'}</div>
                </div>
                <div className="p-1.5 font-bold space-y-0.5">
                  <div>Vehicle No : <span className="uppercase font-bold">{vehicleNo || '-'}</span></div>
                  {eWayBillNo && eWayBillNo !== '-' && customSettings.showEwayBill && (
                    <div className="text-black font-bold text-[10.5px]">
                      E-Way Bill : <span>{eWayBillNo}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 4. TAX INVOICE ITEMS TABLE */}
            <div className="border-x border-b border-black overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse table-fixed">
                <thead>
                  <tr className="border-b border-black font-bold bg-white text-[11px] font-serif">
                    <th className="p-1.5 border-r border-black w-[4%] text-center">SI<br/>NO</th>
                    <th className="p-1.5 border-r border-black w-[11%] text-center">KPCL<br/>ITEM<br/>CODE</th>
                    <th className="p-1.5 border-r border-black w-[19.5%] text-center px-1">Discription</th>
                    <th className="p-1.5 border-r border-black w-[31%] text-center px-1">ITEM NAME &amp;<br/>SPECIFICATION</th>
                    <th className="p-1.5 border-r border-black w-[5.5%] text-center">UNIT</th>
                    <th className="p-1.5 border-r border-black w-[5.5%] text-center">QTY</th>
                    <th className="p-1.5 border-r border-black w-[9.5%] text-center px-1">PRICE</th>
                    <th className="p-1.5 w-[14%] text-center px-1 whitespace-nowrap">AMOUNT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black">
                  {itemsRows.map((r) => (
                    <tr key={r.slNo} className="border-b border-black">
                      <td className="p-1.5 text-center font-bold border-r border-black font-serif align-middle">{r.slNo}</td>
                      <td className="p-1.5 text-left font-normal border-r border-black font-serif align-middle whitespace-nowrap pl-1">{r.kpclCode || '-'}</td>
                      <td className="p-1.5 font-bold border-r border-black px-1.5 uppercase font-sans text-[10.5px] align-middle">{r.itemName}</td>
                      <td className="p-1.5 border-r border-black px-1.5 text-[10px] uppercase whitespace-pre-wrap font-sans align-top leading-tight">
                        {r.specifications}
                        {r.partNumber && !r.specifications.includes(r.partNumber) && (
                          <div className="font-bold mt-0.5">P NO: {r.partNumber}</div>
                        )}
                      </td>
                      <td className="p-1.5 text-center font-bold border-r border-black font-serif align-middle">{r.unit === 'NOS' ? "No's" : (r.unit || "No's")}</td>
                      <td className="p-1.5 text-center font-bold border-r border-black font-serif align-middle">{customSettings.numberStyle === 'formatted' ? r.qty : String(r.qty)}</td>
                      <td className="p-1.5 text-center font-bold border-r border-black px-1 font-serif align-middle">{customSettings.numberStyle === 'formatted' ? fmt(r.rate) : String(r.rate)}</td>
                      <td className="p-1.5 text-center font-bold px-1 whitespace-nowrap font-serif align-middle">{customSettings.numberStyle === 'formatted' ? fmt(r.amount) : String(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 5. TAX TOTALS & AMOUNT IN WORDS & BANK DETAILS */}
            <div className="flex mt-0 border-x border-b border-black text-[11px]">
              {/* Left Box (65.2% = 4% + 11% + 19.5% + 31%) */}
              <div className="w-[65.2%] p-2 text-[11px] border-r border-black flex flex-col justify-between font-serif">
                <div className="min-h-[46px] flex flex-col justify-center">
                  <span className="font-bold block text-black text-[11.5px] leading-tight">
                    Total Invoice amount in words: {amountInWordsText.replace(/^INR\s*/i, '').replace(/Rupees/i, 'Rupees').trim()}
                  </span>
                </div>
                <div className="pt-2 border-t border-black mt-2">
                  <span className="font-bold block text-black text-[11.5px]">Bank Details :</span>
                  <div className="text-[11px] text-black space-y-0.5 mt-0.5 font-bold">
                    <div>Account Holder Name : {customSettings.bankHolder !== undefined ? customSettings.bankHolder : 'Sri Krishna Constructions'}</div>
                    <div>Bank Name : {customSettings.bankName !== undefined ? customSettings.bankName : 'Canara Bank Deosugur Branch'}</div>
                    <div>Bank Account No: {customSettings.bankAccount !== undefined ? customSettings.bankAccount : '18133070005349'}</div>
                    <div>IFSC Code:{customSettings.bankIfsc !== undefined ? customSettings.bankIfsc : 'CNRB0011813'}</div>
                  </div>
                </div>
              </div>

              {/* Right Box (34.8% = 5.5% + 5.5% + 9.5% + 14.3%) */}
              <div className="w-[34.8%] divide-y divide-black text-[11px] font-serif flex flex-col">
                <div className="flex h-[28px] items-center">
                  <div className="w-[59.8%] p-1.5 px-2 border-r border-black font-bold whitespace-nowrap">Basic Cost</div>
                  <div className="w-[40.2%] p-1.5 px-2 text-right font-normal">{customSettings.numberStyle === 'formatted' ? fmt(totalBasic) : String(totalBasic)}</div>
                </div>
                {(totalSgst > 0 || totalCgst > 0) && (
                  <>
                    <div className="flex h-[28px] items-center">
                      <div className="w-[59.8%] p-1.5 px-2 border-r border-black font-bold whitespace-nowrap">SGST {effectiveSgstPercent > 0 ? `${effectiveSgstPercent}%` : ''}</div>
                      <div className="w-[40.2%] p-1.5 px-2 text-right font-normal">{customSettings.numberStyle === 'formatted' ? fmt(totalSgst) : String(totalSgst)}</div>
                    </div>
                    <div className="flex h-[28px] items-center">
                      <div className="w-[59.8%] p-1.5 px-2 border-r border-black font-bold whitespace-nowrap">CGST {effectiveCgstPercent > 0 ? `${effectiveCgstPercent}%` : ''}</div>
                      <div className="w-[40.2%] p-1.5 px-2 text-right font-normal">{customSettings.numberStyle === 'formatted' ? fmt(totalCgst) : String(totalCgst)}</div>
                    </div>
                  </>
                )}
                {totalIgst > 0 && (
                  <div className="flex h-[28px] items-center">
                    <div className="w-[59.8%] p-1.5 px-2 border-r border-black font-bold whitespace-nowrap">IGST {effectiveIgstPercent > 0 ? `${effectiveIgstPercent}%` : ''}</div>
                    <div className="w-[40.2%] p-1.5 px-2 text-right font-normal">{customSettings.numberStyle === 'formatted' ? fmt(totalIgst) : String(totalIgst)}</div>
                  </div>
                )}
                {totalCgst === 0 && totalSgst === 0 && totalIgst === 0 && (
                  <div className="flex h-[28px] items-center">
                    <div className="w-[59.8%] p-1.5 px-2 border-r border-black font-bold whitespace-nowrap">GST (0%)</div>
                    <div className="w-[40.2%] p-1.5 px-2 text-right font-normal">0</div>
                  </div>
                )}
                {totalShipping > 0 && (
                  <div className="flex h-[28px] items-center">
                    <div className="w-[59.8%] p-1.5 px-2 border-r border-black font-bold whitespace-nowrap">Shipping Charges</div>
                    <div className="w-[40.2%] p-1.5 px-2 text-right font-normal">{customSettings.numberStyle === 'formatted' ? fmt(totalShipping) : String(totalShipping)}</div>
                  </div>
                )}
                <div className="flex h-[28px] items-center">
                  <div className="w-[59.8%] p-1.5 px-2 border-r border-black font-bold text-[10px] whitespace-nowrap">TOTAL TAX AMOUNT</div>
                  <div className="w-[40.2%] p-1.5 px-2 text-right font-normal">{customSettings.numberStyle === 'formatted' ? fmt(totalCgst + totalSgst + totalIgst) : String(totalCgst + totalSgst + totalIgst)}</div>
                </div>
                <div className="flex h-[28px] items-center">
                  <div className="w-[59.8%] p-1.5 px-2 border-r border-black font-bold text-[10px] whitespace-nowrap">TOTAL AMOUNT</div>
                  <div className="w-[40.2%] p-1.5 px-2 text-right font-normal">{customSettings.numberStyle === 'formatted' ? fmt(totalInvoiceAmount) : String(totalInvoiceAmount)}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end items-end mt-8 pt-4 text-xs">
              <div className="text-center min-w-[220px]">
                <div className="text-black font-normal text-[11.5px]">Your Faithfully</div>
                <div className="font-normal text-[#2b5797] mt-0.5 text-sm font-serif">
                  {customSettings.signatoryTitle || 'For Sri Krishna Constructions'}
                </div>
                <div className="h-10 my-1 flex items-center justify-center">
                  {SKC_SIGNATURE_BASE64 ? (
                    <img src={SKC_SIGNATURE_BASE64} alt="Proprietor Signature" className="h-9 object-contain" />
                  ) : (
                    <div className="w-48 border-b border-black mt-6 mb-1 mx-auto"></div>
                  )}
                </div>
                <div className="text-[#2b5797] text-[13px] font-normal font-serif">
                  {customSettings.signatoryDesignation || 'Proprietor'}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* BOTTOM MODAL FOOTER BAR */}
        <div className="px-4 py-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-2 shrink-0 no-print">
          <span className="text-xs text-slate-600 font-medium hidden sm:inline">
            Invoice No: <strong className="font-mono text-slate-900">{invoiceNo}</strong> • Total Amount: <strong className="font-mono text-emerald-800">₹{fmt(totalInvoiceAmount)}</strong>
          </span>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => {
                setTempSettings(customSettings);
                setShowSettingsModal(true);
              }}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow transition-all cursor-pointer"
            >
              <Edit3 className="w-4 h-4" /> Edit Header / Bank
            </button>
            <button
              onClick={printPdf}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <button
              onClick={downloadPdf}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow transition-all active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" /> Download PDF
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-all"
            >
              Close
            </button>
          </div>
        </div>

      </div>

      {/* POPUP MODAL: CUSTOMIZE HEADER & BANK DETAILS */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[10000000] flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-300 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-[#1e3a8a] text-white px-5 py-3.5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm sm:text-base">Customize Invoice Header & Bank Details</h3>
              </div>
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-3">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                  <span>🏢 Company Header Details (Top Box)</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Company Name</label>
                    <input
                      type="text"
                      value={tempSettings.companyName}
                      onChange={e => setTempSettings({ ...tempSettings, companyName: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded font-bold uppercase text-red-600 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Company Address</label>
                    <input
                      type="text"
                      value={tempSettings.companyAddress}
                      onChange={e => setTempSettings({ ...tempSettings, companyAddress: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Tagline / Subtitle</label>
                    <input
                      type="text"
                      value={tempSettings.companyTagline}
                      onChange={e => setTempSettings({ ...tempSettings, companyTagline: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Company GST Number</label>
                    <input
                      type="text"
                      value={tempSettings.companyGst}
                      onChange={e => setTempSettings({ ...tempSettings, companyGst: e.target.value.toUpperCase() })}
                      className="w-full p-2 border border-slate-300 rounded font-mono uppercase font-bold focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Mobile / Phone Number</label>
                    <input
                      type="text"
                      value={tempSettings.companyPhone}
                      onChange={e => setTempSettings({ ...tempSettings, companyPhone: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded font-mono font-bold focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-3">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                  <span>🏦 Bank & Payment Details (Bottom Box)</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Account Holder Name</label>
                    <input
                      type="text"
                      value={tempSettings.bankHolder}
                      onChange={e => setTempSettings({ ...tempSettings, bankHolder: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded font-bold focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Bank Name & Branch</label>
                    <input
                      type="text"
                      value={tempSettings.bankName}
                      onChange={e => setTempSettings({ ...tempSettings, bankName: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Bank Account Number</label>
                    <input
                      type="text"
                      value={tempSettings.bankAccount}
                      onChange={e => setTempSettings({ ...tempSettings, bankAccount: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded font-mono font-bold focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={tempSettings.bankIfsc}
                      onChange={e => setTempSettings({ ...tempSettings, bankIfsc: e.target.value.toUpperCase() })}
                      className="w-full p-2 border border-slate-300 rounded font-mono uppercase font-bold focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-3">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                  <span>✍️ Signatory Details (Bottom Right)</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Signatory Title</label>
                    <input
                      type="text"
                      value={tempSettings.signatoryTitle}
                      onChange={e => setTempSettings({ ...tempSettings, signatoryTitle: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded font-bold text-blue-700 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Designation</label>
                    <input
                      type="text"
                      value={tempSettings.signatoryDesignation}
                      onChange={e => setTempSettings({ ...tempSettings, signatoryDesignation: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-3">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                  <span>⚙️ Invoice Formatting & Layout Settings (Original Match)</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">GST Rounding Method</label>
                    <select
                      value={tempSettings.gstRounding || 'up'}
                      onChange={e => setTempSettings({ ...tempSettings, gstRounding: e.target.value as 'up' | 'nearest' })}
                      className="w-full p-2 border border-slate-300 rounded font-bold text-slate-800 bg-white"
                    >
                      <option value="up">Round UP to Next Rupee (Original Match: 9% = 272,221)</option>
                      <option value="nearest">Round to Nearest Rupee (Standard Math)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Number Formatting Style</label>
                    <select
                      value={tempSettings.numberStyle || 'plain'}
                      onChange={e => setTempSettings({ ...tempSettings, numberStyle: e.target.value as 'plain' | 'formatted' })}
                      className="w-full p-2 border border-slate-300 rounded font-bold text-slate-800 bg-white"
                    >
                      <option value="plain">Plain Digits (Original Match: 3024670, no commas)</option>
                      <option value="formatted">Indian Formatted (30,24,670)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="showEwayBill"
                      checked={tempSettings.showEwayBill || false}
                      onChange={e => setTempSettings({ ...tempSettings, showEwayBill: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                    />
                    <label htmlFor="showEwayBill" className="font-bold text-slate-700 cursor-pointer">
                      Show E-Way Bill row under Vehicle No (Default: OFF)
                    </label>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="repeatHeaders"
                      checked={tempSettings.repeatColumnHeaders || false}
                      onChange={e => setTempSettings({ ...tempSettings, repeatColumnHeaders: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                    />
                    <label htmlFor="repeatHeaders" className="font-bold text-slate-700 cursor-pointer">
                      Repeat Table Headers on Continuation Pages (Default: OFF)
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-between items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleResetSettings}
                className="px-3.5 py-2 bg-white hover:bg-rose-50 text-rose-700 font-bold text-xs rounded-xl border border-rose-300 flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Default
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="px-5 py-2 bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 transition-colors"
                >
                  <Check className="w-4 h-4" /> Save & Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
